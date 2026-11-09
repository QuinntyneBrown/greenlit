import { SheetMonth } from 'api';
import { WeekStripColumn, WeekStripRow, WeekTab } from 'components';

import { calendarView, datesOf, dayLabel, monthTitle, SYNCED_WORDS } from './calendar-view';

/**
 * Turns the API's month into what the calendar shows on a phone
 * (docs/detailed-designs/sheet/phone-week): the Monday-to-Sunday weeks of the
 * month, the week strip's dates, rows and Out line. Pure, so the phone layout
 * stays a thin shell.
 */

/** One Monday-to-Sunday week of a month; days outside the month are null. */
export interface MonthWeek {
  /** The week's days in the month: "1", "2–8", …, "30". */
  readonly label: string;
  /** Seven entries, Monday first: `yyyy-MM-dd`, or null outside the month. */
  readonly dates: readonly (string | null)[];
}

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10));
}

/** Monday is 0, Sunday 6. */
function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** The month cut into Monday-to-Sunday weeks, clipped to the month. */
export function weeksOf(month: string): MonthWeek[] {
  const weeks: (string | null)[][] = [];
  for (const date of datesOf(month)) {
    const index = weekdayIndex(date);
    if (index === 0 || weeks.length === 0) weeks.push(Array<string | null>(7).fill(null));
    weeks[weeks.length - 1][index] = date;
  }
  return weeks.map((dates) => {
    const days = dates.filter((d): d is string => d !== null).map(dayOf);
    const first = days[0];
    const last = days[days.length - 1];
    return { label: first === last ? `${first}` : `${first}–${last}`, dates };
  });
}

/** The index of the week that holds `date`, or 0 when no week of the month does. */
export function weekHolding(weeks: readonly MonthWeek[], date: string): number {
  return Math.max(
    0,
    weeks.findIndex((w) => w.dates.includes(date)),
  );
}

/** "Week of 2–8 Nov". */
export function weekCardLabel(week: MonthWeek): string {
  const date = week.dates.find((d): d is string => d !== null) ?? '';
  const month = dayLabel(date).split(' ')[2];
  return `Week of ${week.label} ${month}`;
}

export function weekTabs(weeks: readonly MonthWeek[], short: ReadonlySet<string>): WeekTab[] {
  return weeks.map((w) => ({
    label: w.label,
    short: w.dates.some((d) => d !== null && short.has(d)),
  }));
}

// ---- short days (L2-063 AC4) ----

/**
 * The month's short days: working days below the coverage minimum, or, with no minimum, working days on which
 * everyone who works is out. "Out" is requested or confirmed, as on the Out row (L2-014).
 */
export function shortDates(sheet: SheetMonth): Set<string> {
  const minimum = sheet.coverageMinimum;
  return new Set(
    sheet.coverage
      .filter((day) => (minimum !== null ? day.belowMinimum : day.in === 0 && day.out >= 1))
      .map((day) => day.date),
  );
}

/** Who is out in a run, in words ("Ben · tentative"). */
export interface ShortRunPerson {
  readonly name: string;
  readonly status: 'confirmed' | 'requested' | 'tentative';
}

/** A run of short days, joined across days nobody works. */
export interface ShortRun {
  readonly dates: readonly string[];
  /** "Mon 23 – Wed 25 Nov", or "Mon 23 Nov" for one day. */
  readonly label: string;
  readonly people: readonly ShortRunPerson[];
}

const OUT_STATUS: Record<string, ShortRunPerson['status']> = {
  Confirmed: 'confirmed',
  Requested: 'requested',
  Tentative: 'tentative',
};

/** "Mon 23 – Wed 25 Nov"; the month is said once. */
export function spanLabel(first: string, last: string): string {
  if (first === last) return dayLabel(first);
  const [weekdayFirst, dayFirst, monthFirst] = dayLabel(first).split(' ');
  const [weekdayLast, dayLast, monthLast] = dayLabel(last).split(' ');
  const head = monthFirst === monthLast ? `${weekdayFirst} ${dayFirst}` : dayLabel(first);
  return `${head} – ${weekdayLast} ${dayLast} ${monthLast}`;
}

export function shortRuns(sheet: SheetMonth, short: ReadonlySet<string>): ShortRun[] {
  const working = new Set(sheet.coverage.map((day) => day.date));
  const runs: string[][] = [];
  let open = false;
  for (const date of datesOf(sheet.month)) {
    if (!working.has(date)) continue; // a day nobody works neither starts nor breaks a run
    if (short.has(date)) {
      if (open) runs[runs.length - 1].push(date);
      else runs.push([date]);
      open = true;
    } else {
      open = false;
    }
  }
  return runs.map((dates) => ({
    dates,
    label: spanLabel(dates[0], dates[dates.length - 1]),
    people: sheet.members.flatMap((member) => {
      const out = member.cells.find((c) => dates.includes(c.date) && OUT_STATUS[c.kind]);
      return out ? [{ name: member.name.split(' ')[0], status: OUT_STATUS[out.kind] }] : [];
    }),
  }));
}

function times(n: number): string {
  return n === 1 ? 'once' : `${n} times`;
}

/** The card's heading; null for a team of one, which has no card (L2-063 AC5). */
export function shortDaysHeading(sheet: SheetMonth, runs: number): string | null {
  const size = sheet.members.length;
  if (size < 2) return null;
  const month = monthTitle(sheet.month).split(' ')[0];
  if (sheet.coverageMinimum !== null) {
    return runs === 0
      ? `Never below the minimum in ${month}`
      : `Below the minimum of ${sheet.coverageMinimum} ${times(runs)} in ${month}`;
  }
  if (size === 2) {
    return runs === 0
      ? `You are never both out in ${month}`
      : `Both out ${times(runs)} in ${month}`;
  }
  return runs === 0 ? `Never everyone out in ${month}` : `Everyone out ${times(runs)} in ${month}`;
}

export interface WeekStripView {
  readonly label: string;
  readonly columns: readonly (WeekStripColumn | null)[];
  readonly rows: readonly WeekStripRow[];
}

/** The week strip for one week: its dates, a row per member and the Out line (L2-063 AC2–AC3). */
export function weekStripView(
  sheet: SheetMonth,
  week: MonthWeek,
  short: ReadonlySet<string>,
): WeekStripView {
  const month = calendarView(sheet);
  const dates = datesOf(sheet.month);
  const at = (date: string | null) => (date === null ? -1 : dates.indexOf(date));
  const columns = week.dates.map((date): WeekStripColumn | null => {
    if (date === null) return null;
    const column = month.columns[at(date)];
    return { ...column, date, cover: month.cover[at(date)] ?? null, short: short.has(date) };
  });
  const rows = month.rows.map((row): WeekStripRow => {
    const member = sheet.members.find((m) => m.id === row.memberId);
    return {
      memberId: row.memberId,
      name: row.name,
      initials: member?.initials ?? '',
      you: row.you,
      left: member?.daysLeft === null ? '–' : `${row.left} left`,
      over: row.over,
      editable: row.editable,
      cells: week.dates.map((date) => (date === null ? null : row.cells[at(date)])),
    };
  });
  return { label: weekCardLabel(week), columns, rows };
}

// ---- the day panel (L2-063 AC6) ----

/** One member's line in the day panel. */
export interface DayPanelRow {
  readonly initials: string;
  readonly name: string;
  readonly status: 'confirmed' | 'requested' | 'tentative' | 'empty' | 'off';
  /** A day booked in another of the person's teams (L2-064 AC11): its swatch is striped. */
  readonly synced?: boolean;
  /** "Confirmed", "Requested", "Tentative", "Working" or "Not working". */
  readonly word: string;
}

export interface DayPanelView {
  /** "Out on 26 Nov". */
  readonly label: string;
  /** "Thu 26 Nov". */
  readonly heading: string;
  readonly short: boolean;
  /** "Weekend · not a working day" or "Christmas Day · not a working day"; null on a working day. */
  readonly note: string | null;
  readonly rows: readonly DayPanelRow[];
}

const DAY_STATE: Record<string, Pick<DayPanelRow, 'status' | 'word'>> = {
  Confirmed: { status: 'confirmed', word: 'Confirmed' },
  Requested: { status: 'requested', word: 'Requested' },
  Tentative: { status: 'tentative', word: 'Tentative' },
  Working: { status: 'empty', word: 'Working' },
  NotWorking: { status: 'off', word: 'Not working' },
};

export function dayPanelView(
  sheet: SheetMonth,
  date: string,
  short: ReadonlySet<string>,
): DayPanelView {
  const heading = dayLabel(date);
  const holiday = sheet.members
    .flatMap((m) => m.cells)
    .find((c) => c.date === date && c.kind === 'Holiday');
  const weekend = weekdayIndex(date) >= 5;
  const note = holiday
    ? `${holiday.holidayName ?? 'Holiday'} · not a working day`
    : weekend
      ? 'Weekend · not a working day'
      : null;
  const rows =
    note !== null
      ? []
      : sheet.members.map((member) => {
          const cell = member.cells.find((c) => c.date === date);
          return {
            initials: member.initials,
            name: member.name,
            ...(cell?.synced
              ? { status: 'tentative' as const, word: SYNCED_WORDS, synced: true }
              : DAY_STATE[cell?.kind ?? 'Working']),
          };
        });
  return {
    label: `Out on ${heading.split(' ').slice(1).join(' ')}`,
    heading,
    short: short.has(date),
    note,
    rows,
  };
}

// ---- a range and the mark sheet (L2-063 AC7–AC9) ----

/** A first day, and once picked a last day, on one member's row. */
export interface PhoneRange {
  readonly memberId: string;
  readonly from: string;
  readonly to: string | null;
}

/** Every date of the month from the range's earlier day to its later one. */
export function rangeDates(month: string, range: PhoneRange): string[] {
  const end = range.to ?? range.from;
  const [lo, hi] = range.from <= end ? [range.from, end] : [end, range.from];
  return datesOf(month).filter((d) => d >= lo && d <= hi);
}

export interface MarkSheetView {
  readonly who: string;
  readonly title: string;
  readonly picking: boolean;
  readonly workingDays: number;
  readonly over: number;
  readonly clash: string | null;
  readonly dates: readonly string[];
}

const OFF_KINDS = new Set(['NotWorking', 'Holiday']);

/** "Ana", "Ana and Ben", "Ana, Cleo, Elif and Finn". */
function names(list: readonly string[]): string {
  return list.length === 1
    ? list[0]
    : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/**
 * Who else is out (requested or confirmed) on the range's working days, members with the same count named
 * together, most days first: "Ana is also out 4 of these days. Cleo and Dev are also out 2 of these days."
 */
export function clashText(
  sheet: SheetMonth,
  memberId: string,
  workingDates: readonly string[],
): string | null {
  const counts = new Map<number, string[]>();
  for (const member of sheet.members) {
    if (member.id === memberId) continue;
    const n = member.cells.filter(
      (c) => workingDates.includes(c.date) && (c.kind === 'Requested' || c.kind === 'Confirmed'),
    ).length;
    if (n > 0) counts.set(n, [...(counts.get(n) ?? []), member.name.split(' ')[0]]);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([n, who]) => {
      const verb = who.length === 1 ? 'is' : 'are';
      const howMany = n === workingDates.length ? 'all' : `${n}`;
      return `${names(who)} ${verb} also out ${howMany} of these days.`;
    })
    .join(' ');
}

export function markSheetView(sheet: SheetMonth, range: PhoneRange): MarkSheetView | null {
  const member = sheet.members.find((m) => m.id === range.memberId);
  if (!member) return null;
  const dates = rangeDates(sheet.month, range);
  const chosen = member.cells.filter((c) => dates.includes(c.date));
  const working = chosen.filter((c) => !OFF_KINDS.has(c.kind)).map((c) => c.date);
  // Same rule as the server's DaysOver: days already requested are in `requested` already.
  const extra = chosen.filter((c) => !OFF_KINDS.has(c.kind) && c.kind !== 'Requested').length;
  const figures = member.allowance;
  const picking = range.to === null;
  return {
    who: member.name,
    title: picking ? `From ${dayLabel(range.from)}` : spanLabel(dates[0], dates[dates.length - 1]),
    picking,
    workingDays: working.length,
    over: figures ? Math.max(0, figures.requested + extra - figures.left) : 0,
    clash: picking ? null : clashText(sheet, member.id, working),
    dates,
  };
}

// ---- the holiday line under the legend (L2-063 AC13) ----

/** "25 Dec is Christmas Day. It never counts as time off."; null when the week holds no holiday. */
export function holidayNote(sheet: SheetMonth, week: MonthWeek): string | null {
  const holidays = new Map<string, string>();
  for (const cell of sheet.members.flatMap((m) => m.cells)) {
    if (cell.kind === 'Holiday' && week.dates.includes(cell.date)) {
      holidays.set(cell.date, cell.holidayName ?? 'a holiday');
    }
  }
  if (holidays.size === 0) return null;
  const said = [...holidays.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, name]) => `${dayLabel(date).split(' ').slice(1).join(' ')} is ${name}`);
  return `${names(said)}. ${holidays.size === 1 ? 'It never counts' : 'They never count'} as time off.`;
}

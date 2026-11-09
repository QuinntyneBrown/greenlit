import { SheetMonth } from 'api';
import { WeekStripColumn, WeekStripRow, WeekTab } from 'components';

import { calendarView, datesOf, dayLabel, monthTitle } from './calendar-view';

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

import { CellKind, SheetMonth } from 'api';
import { TeamGridCellStatus, TeamGridColumn, TeamGridCover, TeamGridRow } from 'components';

/**
 * Turns the API's month into what the sheet shows: column headings, cell
 * names that carry each state in words (L2-013, L2-048), the Left column and
 * the Out row (L2-014). Pure, so the page stays a thin shell.
 */

const WEEKDAY_INITIALS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S'];

/** A calendar date at UTC midnight, so formatting never drifts across time zones. */
function utcDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d ?? 1));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "Mon 2 Nov". */
export function dayLabel(iso: string): string {
  const date = utcDate(iso);
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  const month = date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${weekday} ${date.getUTCDate()} ${month}`;
}

/** "November 2026" for `2026-11`. */
export function monthTitle(month: string): string {
  return utcDate(month).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** `2026-10` for `2026-11` and a step of -1. */
export function addMonths(month: string, step: number): string {
  const date = utcDate(month);
  date.setUTCMonth(date.getUTCMonth() + step);
  return isoDate(date).slice(0, 7);
}

/** Every date of the month, `yyyy-MM-dd`. */
export function datesOf(month: string): string[] {
  const first = utcDate(month);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) =>
    isoDate(new Date(first.getTime() + i * 86_400_000)),
  );
}

function isWeekend(iso: string): boolean {
  const day = utcDate(iso).getUTCDay();
  return day === 0 || day === 6;
}

/** Column headings for a month; holidays come from the loaded data when there is any. */
export function columnsFor(
  month: string,
  today: string | null,
  holidays: ReadonlySet<string> = new Set(),
): TeamGridColumn[] {
  return datesOf(month).map((date) => ({
    label: dayLabel(date),
    initial: WEEKDAY_INITIALS[utcDate(date).getUTCDay()],
    day: utcDate(date).getUTCDate(),
    off: isWeekend(date) || holidays.has(date),
    today: date === today,
  }));
}

const STATUS: Record<CellKind, TeamGridCellStatus> = {
  Working: 'empty',
  NotWorking: 'off',
  Holiday: 'off',
  Tentative: 'tentative',
  Requested: 'requested',
  Confirmed: 'confirmed',
};

const STATE_WORDS: Record<Exclude<CellKind, 'Holiday'>, string> = {
  Working: 'Working',
  NotWorking: 'Not working',
  Tentative: 'Tentative',
  Requested: 'Requested',
  Confirmed: 'Confirmed',
};

export interface CalendarView {
  readonly label: string;
  readonly columns: TeamGridColumn[];
  readonly rows: TeamGridRow[];
  readonly cover: (TeamGridCover | null)[];
}

export function calendarView(sheet: SheetMonth): CalendarView {
  const holidays = new Set(
    sheet.members.flatMap((m) => m.cells.filter((c) => c.kind === 'Holiday').map((c) => c.date)),
  );
  const rows: TeamGridRow[] = sheet.members.map((member) => {
    const left = member.daysLeft;
    return {
      name: member.name,
      // L2-012 AC2: a member's own row is marked "You"; the manager's view marks no row.
      you: member.isYou && !sheet.isManager,
      cells: member.cells.map((cell) => ({
        status: STATUS[cell.kind],
        label: `${member.name}, ${dayLabel(cell.date)}: ${
          cell.kind === 'Holiday' ? (cell.holidayName ?? 'Holiday') : STATE_WORDS[cell.kind]
        }`,
      })),
      left: left === null ? '–' : `${left}`,
      leftLabel:
        left === null
          ? 'Days left not set up yet'
          : `${left} ${Math.abs(left) === 1 ? 'day' : 'days'} left`,
      over: left !== null && left < 0,
    };
  });
  const byDate = new Map(sheet.coverage.map((c) => [c.date, c]));
  const cover = datesOf(sheet.month).map((date): TeamGridCover | null => {
    const day = byDate.get(date);
    if (!day) return null;
    const flagged = day.belowMinimum && sheet.coverageMinimum !== null;
    return {
      text: day.out === 0 ? '·' : `${day.out}`,
      label: `${day.out} out, ${day.in} in${flagged ? `. Below the minimum of ${sheet.coverageMinimum}` : ''}`,
      level: flagged ? 'short' : day.out === 0 ? 'none' : 'some',
    };
  });
  return {
    label: `Time off, ${monthTitle(sheet.month)}`,
    columns: columnsFor(sheet.month, sheet.today, holidays),
    rows,
    cover,
  };
}

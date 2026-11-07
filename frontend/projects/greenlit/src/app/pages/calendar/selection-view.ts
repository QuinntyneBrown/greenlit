import { SheetMonth } from 'api';
import { TeamGridRow, TeamGridSelection } from 'components';

import { dayLabel } from './calendar-view';

/**
 * What the selection bar says about a selection (L2-016, L2-030 AC2): the
 * member and range, the working days and the days over allowance. Pure, so
 * the page stays a thin shell.
 */

export interface SelectionBarView {
  /** "Ana Ruiz · 23–25 Nov". */
  readonly title: string;
  readonly workingDays: number;
  /** Days over the member's allowance if these were requested (L2-030 AC2); 0 for none. */
  readonly over: number;
}

/** "23 Nov" for one day, "23–25 Nov" for a range in one month. */
export function rangeLabel(dates: readonly string[]): string {
  const [, dayFirst, monthFirst] = dayLabel(dates[0]).split(' ');
  const [, dayLast] = dayLabel(dates[dates.length - 1]).split(' ');
  return dates.length === 1 ? `${dayFirst} ${monthFirst}` : `${dayFirst}–${dayLast} ${monthFirst}`;
}

export function selectionBarView(
  sheet: SheetMonth,
  rows: readonly TeamGridRow[],
  selection: TeamGridSelection,
): SelectionBarView | null {
  const row = rows.find((r) => r.memberId === selection.memberId);
  const member = sheet.members.find((m) => m.id === selection.memberId);
  if (!row || !member) return null;
  const chosen = new Set(selection.dates);
  const workingDays = row.cells.filter((c) => chosen.has(c.date) && c.status !== 'off').length;
  // Same rule as the server's DaysOver: days already requested are in `requested` already.
  const extra = member.cells.filter(
    (c) =>
      chosen.has(c.date) &&
      c.kind !== 'NotWorking' &&
      c.kind !== 'Holiday' &&
      c.kind !== 'Requested',
  ).length;
  const figures = member.allowance;
  const over = figures ? Math.max(0, figures.requested + extra - figures.left) : 0;
  return { title: `${row.name} · ${rangeLabel(selection.dates)}`, workingDays, over };
}

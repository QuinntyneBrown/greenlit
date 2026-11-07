import { RequestDetail } from 'api';
import { TeamGridColumn, TeamGridCover, TeamGridRow } from 'components';

import { cellFor, columnFor, coverOf } from '../../pages/calendar/calendar-view';

/** What "Team those weeks" shows: the weeks around a request as the sheet draws them, without allowances. */
export interface RequestWeeks {
  readonly columns: TeamGridColumn[];
  readonly rows: TeamGridRow[];
  readonly cover: (TeamGridCover | null)[];
}

/**
 * Turns the API's weeks (docs/detailed-designs/requests/review-requests) into grid rows: the same cell
 * names and Out row as the calendar, read-only, and no Left column. Pure, like the calendar's view.
 */
export function requestWeeks(detail: RequestDetail): RequestWeeks {
  const dates = detail.members[0]?.cells.map((c) => c.date) ?? [];
  const holidays = new Set(
    detail.members.flatMap((m) => m.cells.filter((c) => c.kind === 'Holiday').map((c) => c.date)),
  );
  const byDate = new Map(detail.coverage.map((c) => [c.date, c]));
  return {
    columns: dates.map((date) => columnFor(date, null, holidays.has(date))),
    rows: detail.members.map((member) => ({
      memberId: member.id,
      name: member.name,
      editable: false,
      you: false,
      cells: member.cells.map((cell) => cellFor(member.name, cell)),
      left: '',
      leftLabel: '',
      over: false,
    })),
    cover: dates.map((date) => {
      const day = byDate.get(date);
      return day ? coverOf(day, detail.coverageMinimum) : null;
    }),
  };
}

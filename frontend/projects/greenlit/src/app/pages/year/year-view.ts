import { TeamYear, YearMember } from 'api';
import { YearGridColumn, YearGridRow } from 'components';

/**
 * Turns the API's year into what the grid shows: month headings that link to the calendar and cell
 * names that carry the confirmed days in words (L2-031 AC2). Pure, so the page stays a thin shell.
 */

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** `yyyy-MM` for a year and a month from 1 to 12. */
function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Jan to Dec, each linking to its month on the calendar. */
export function yearColumns(year: number): YearGridColumn[] {
  return MONTH_NAMES.map((name, index) => ({
    label: name.slice(0, 3),
    month: monthParam(year, index + 1),
  }));
}

function row(year: number, member: YearMember): YearGridRow {
  return {
    memberId: member.id,
    name: member.name,
    you: member.isYou,
    months: member.months.map((m) => ({
      month: monthParam(year, m.month),
      label: `${member.name}, ${MONTH_NAMES[m.month - 1]}: ${m.confirmed} confirmed days off`,
      days: m.days,
    })),
  };
}

export function yearRows(year: TeamYear): YearGridRow[] {
  return year.members.map((member) => row(year.year, member));
}

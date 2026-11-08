import { TeamYear, YearMember } from 'api';
import { AllowanceTableRow, YearGridColumn, YearGridRow } from 'components';

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

function percent(days: number, allowance: number): number {
  return allowance > 0 ? Math.min(100, Math.max(0, (days / allowance) * 100)) : 0;
}

/** One row per person: the figures of L2-029 and the usage bar's name (L2-032 AC2). */
export function allowanceRows(year: TeamYear, sortedByDaysLeft: boolean): AllowanceTableRow[] {
  const rows = year.members.map((member): AllowanceTableRow => {
    const a = member.allowance;
    // A child has no allowance (L2-060 AC3); children sort last.
    if (a === null)
      return {
        memberId: member.id,
        name: member.name,
        allowance: 0,
        used: 0,
        booked: 0,
        requested: 0,
        left: Number.NEGATIVE_INFINITY,
        takenPercent: 0,
        requestedPercent: 0,
        usageLabel: 'No allowance',
        noAllowance: true,
      };
    const taken = a.used + a.booked;
    return {
      memberId: member.id,
      name: member.name,
      allowance: a.allowance,
      used: a.used,
      booked: a.booked,
      requested: a.requested,
      left: a.left,
      takenPercent: percent(taken, a.allowance),
      requestedPercent: percent(a.requested, a.allowance),
      usageLabel: `${taken} of ${a.allowance} days taken or booked, ${a.requested} requested`,
    };
  });
  // Array.prototype.sort is stable, so people with the same days left keep the team's order.
  return sortedByDaysLeft ? rows.sort((a, b) => b.left - a.left) : rows;
}

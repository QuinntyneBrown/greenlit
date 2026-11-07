import { Person } from 'api';
import { MonthMiniDay, StatFact } from 'components';

/**
 * Turns the API's person into what the page shows (docs/detailed-designs/allowances/person-page). Pure,
 * so the page stays a thin shell.
 */

const MONTHS = [
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

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** "Mar 2022" for `2022-03-14`. */
function monthAndYear(iso: string): string {
  const [year, month] = iso.split('-').map(Number);
  return `${MONTHS_SHORT[month - 1]} ${year}`;
}

/** "Product Designer · Joined Mar 2022", with whichever of the parts the person has. */
export function subtitle(person: Person): string {
  const parts: string[] = [];
  if (person.jobTitle) parts.push(person.jobTitle);
  if (person.joinedOn) parts.push(`Joined ${monthAndYear(person.joinedOn)}`);
  return parts.join(' · ');
}

/** The figures of L2-033 AC1; the allowance says how much of it is adjustment. */
export function facts(person: Person): StatFact[] {
  const a = person.allowance;
  const adjustment = a.adjustments > 0 ? `+${a.adjustments}` : `${a.adjustments}`;
  return [
    {
      label: 'Allowance',
      value: `${a.allowance}`,
      note: a.adjustments === 0 ? undefined : `incl. ${adjustment} adj.`,
    },
    { label: 'Used', value: `${a.used}` },
    { label: 'Booked', value: `${a.booked}` },
    { label: 'Requested', value: `${a.requested}` },
    { label: 'Tentative', value: `${a.tentative}` },
  ];
}

/** One month of the year at a glance. */
export interface MiniMonth {
  readonly title: string;
  /** Blank cells before the 1st, Monday-first. */
  readonly offset: number;
  readonly days: readonly MonthMiniDay[];
}

/** Twelve months, each day named by its date and what it is: a holiday's name, "Not working", "Working" or its status. */
export function miniMonths(person: Person): MiniMonth[] {
  return person.months.map((m) => {
    const name = MONTHS[m.month - 1];
    const weekday = new Date(Date.UTC(person.year, m.month - 1, 1)).getUTCDay();
    return {
      title: name,
      offset: (weekday + 6) % 7,
      days: m.days.map((d, i) => ({
        status: d.status,
        label: `${i + 1} ${name}: ${dayName(d.status, d.holiday)}`,
      })),
    };
  });
}

function dayName(status: string, holiday: string | null): string {
  if (status === 'off') return holiday ?? 'Not working';
  if (status === 'empty') return 'Working';
  return status[0].toUpperCase() + status.slice(1);
}

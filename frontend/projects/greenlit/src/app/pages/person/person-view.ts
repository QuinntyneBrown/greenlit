import { Person } from 'api';
import { StatFact } from 'components';

/**
 * Turns the API's person into what the page shows (docs/detailed-designs/allowances/person-page). Pure,
 * so the page stays a thin shell.
 */

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

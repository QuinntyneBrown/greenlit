import { Person, PersonAdjustment, PersonRun, holidayDateLabel } from 'api';
import { MonthMiniDay, RunListItem, StatFact } from 'components';

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

const MON_TO_FRI = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** "Works Mon, Tue, Wed, Thu" for a part-timer; empty for the usual Monday to Friday. */
export function worksLabel(person: Person): string {
  const usual =
    person.workingDays.length === MON_TO_FRI.length &&
    person.workingDays.every((d, i) => d === MON_TO_FRI[i]);
  return usual ? '' : `Works ${person.workingDays.join(', ')}`;
}

/** "Product Designer · Joined Mar 2022 · Works Mon, Tue", with whichever of the parts apply. */
export function subtitle(person: Person): string {
  const parts: string[] = [];
  if (person.jobTitle) parts.push(person.jobTitle);
  if (person.joinedOn) parts.push(`Joined ${monthAndYear(person.joinedOn)}`);
  const works = worksLabel(person);
  if (works) parts.push(works);
  return parts.join(' · ');
}

/** "days left in 2026", and how far over the requests would take them (ADR-007). */
export function caption(person: Person): string {
  if (person.allowance === null) return 'No allowance';
  const left = `days left in ${person.year}`;
  if (person.daysOver <= 0) return left;
  const days = person.daysOver === 1 ? '1 day' : `${person.daysOver} days`;
  return `${left} · ${days} over once requests are approved`;
}

/** The figures of L2-033 AC1; the allowance says how much of it is adjustment. */
export function facts(person: Person): StatFact[] {
  const a = person.allowance;
  if (a === null) return [];
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

const day = (iso: string) => Number(iso.slice(8, 10));
const monthShort = (iso: string) => MONTHS_SHORT[Number(iso.slice(5, 7)) - 1];

/** "Fri 2 Jan" for one day, "16–20 Nov" within a month, "30 Nov–2 Dec" across two. */
function range(run: PersonRun): string {
  if (run.first === run.last) return holidayDateLabel(run.first);
  if (monthShort(run.first) === monthShort(run.last)) {
    return `${day(run.first)}–${day(run.last)} ${monthShort(run.last)}`;
  }
  return `${day(run.first)} ${monthShort(run.first)}–${day(run.last)} ${monthShort(run.last)}`;
}

/** One row per run: the colour, the range, the days and the status in words (L2-033 AC3). */
export function runItems(runs: readonly PersonRun[]): RunListItem[] {
  return runs.map((run) => ({
    swatch: run.status.toLowerCase() as 'tentative' | 'requested' | 'confirmed',
    range: range(run),
    days: run.days === 1 ? '1 day' : `${run.days} days`,
    status: run.status,
  }));
}

/** One row per adjustment: the signed days, why, and from when ("1 Jan 2026"). */
export function adjustmentItems(adjustments: readonly PersonAdjustment[]): RunListItem[] {
  return adjustments.map((a) => ({
    adjustment: a.days > 0 ? `+${a.days}` : `${a.days}`,
    negative: a.days < 0,
    range: a.reason,
    days: `${day(a.effectiveDate)} ${monthShort(a.effectiveDate)} ${a.effectiveDate.slice(0, 4)}`,
  }));
}

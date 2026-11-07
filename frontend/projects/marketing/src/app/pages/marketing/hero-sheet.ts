/**
 * The hero's sheet in miniature (L2-050 AC4): the calendar mock's cast over
 * Monday 16 to Sunday 29 November 2026. Weekends are off by rule; Dev works
 * Monday to Thursday, so Fridays are off too.
 */
export type HeroStatus = 'confirmed' | 'requested' | 'tentative' | 'off' | 'empty';

export interface HeroDay {
  readonly date: number;
  readonly weekday: string;
  readonly off: boolean;
}

export interface HeroCell {
  readonly status: HeroStatus;
  /** Accessible name: the person, the date and the status in words. */
  readonly label: string;
}

export interface HeroRow {
  readonly name: string;
  readonly cells: readonly HeroCell[];
}

export interface HeroSheet {
  readonly days: readonly HeroDay[];
  readonly rows: readonly HeroRow[];
}

const WEEKDAYS = 'MTWTFSS';
const WEEKENDS = [21, 22, 28, 29];
const STATUS_WORDS: Record<HeroStatus, string> = {
  confirmed: 'confirmed',
  requested: 'requested',
  tentative: 'tentative',
  off: 'weekend',
  empty: 'working day',
};

interface Person {
  readonly name: string;
  readonly status: HeroStatus;
  readonly from?: number;
  readonly to?: number;
  readonly off?: readonly number[];
}

const PEOPLE: readonly Person[] = [
  { name: 'Maya', status: 'empty' },
  { name: 'Ana', status: 'requested', from: 16, to: 20 },
  { name: 'Ben', status: 'tentative', from: 23, to: 27 },
  { name: 'Dev', status: 'requested', from: 18, to: 19, off: [20, 27] },
];

const DAYS: readonly HeroDay[] = Array.from({ length: 14 }, (_, i) => ({
  date: 16 + i,
  weekday: WEEKDAYS[i % 7],
  off: WEEKENDS.includes(16 + i),
}));

function cellFor(person: Person, day: HeroDay): HeroCell {
  const off = day.off || (person.off?.includes(day.date) ?? false);
  const booked =
    person.from !== undefined && day.date >= person.from && day.date <= (person.to ?? 0);
  const status: HeroStatus = off ? 'off' : booked ? person.status : 'empty';
  return { status, label: `${person.name}, ${day.date} November, ${STATUS_WORDS[status]}` };
}

export const HERO_SHEET: HeroSheet = {
  days: DAYS,
  rows: PEOPLE.map((person) => ({
    name: person.name,
    cells: DAYS.map((day) => cellFor(person, day)),
  })),
};

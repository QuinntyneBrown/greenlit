import { Session } from './session';

/** The create-team form as POST /api/teams takes it (teams/create-team). */
export interface NewTeam {
  readonly name: string;
  /** One of TIME_ZONE_OPTIONS' values. */
  readonly timeZone: string;
  /** One of HOLIDAY_CALENDAR_OPTIONS' values; `none` adds no holidays. */
  readonly holidayCountry: string;
  readonly members: readonly { readonly name: string; readonly email: string | null }[];
}

/** The created team and a session for its manager that names it. */
export interface CreatedTeam {
  readonly teamId: string;
  readonly name: string;
  /** How many invitations were emailed; none until members can be invited (journey 5). */
  readonly invited: number;
  readonly session: Session;
}

export interface TeamOption {
  readonly value: string;
  readonly label: string;
}

/** The time zones the page offers (L2-008 AC2), London first. */
export const TIME_ZONE_OPTIONS: readonly TeamOption[] = [
  { value: 'Europe/London', label: 'London (GMT+0 / BST)' },
  { value: 'Europe/Dublin', label: 'Dublin' },
  { value: 'Europe/Paris', label: 'Paris, Berlin (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'America/New_York', label: 'New York (ET)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
];

/** The public-holiday calendars the page offers (L2-008 AC2), the United Kingdom first. */
export const HOLIDAY_CALENDAR_OPTIONS: readonly TeamOption[] = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'IT', label: 'Italy' },
  { value: 'none', label: 'None, I’ll add my own' },
];

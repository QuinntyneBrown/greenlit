import { AllowanceFigures } from './allowance-figures';
import { SchoolClosure } from './school-closure';
import { WeekDay } from './week-day';

/** What a day cell is (mirrors `Greenlit.Application.Sheet.CellKind`). Red days are separate from time off. */
export type CellKind =
  'Working' | 'NotWorking' | 'Holiday' | 'Tentative' | 'Requested' | 'Confirmed';

export interface SheetCell {
  /** `yyyy-MM-dd`. */
  readonly date: string;
  readonly kind: CellKind;
  /** The holiday's name when `kind` is `Holiday`, e.g. "Christmas Day". */
  readonly holidayName: string | null;
  /** A Tentative day booked on the person's row in another of their teams (L2-064, ADR-016); read-only here. */
  readonly synced?: boolean;
}

export interface SheetMember {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  /** The signed-in person's row. */
  readonly isYou: boolean;
  /** Days left in the leave year: allowance minus used and booked days (allowances/allowance-figures). */
  readonly daysLeft: number | null;
  /** Every figure behind `daysLeft`; null where the API does not compute them (a request's weeks). */
  readonly allowance: AllowanceFigures | null;
  /** One cell per day of the month, in date order. */
  readonly cells: readonly SheetCell[];
  /** The weekdays this person works: their own, else the team's (teams/working-days). */
  readonly workingDays: readonly WeekDay[];
  /** A child while the school calendar is on (L2-060): no allowance and no days left. */
  readonly isChild: boolean;
}

/** The Out row for one team working day. Weekends and holidays have no entry. */
export interface SheetCoverage {
  readonly date: string;
  readonly out: number;
  readonly in: number;
  readonly belowMinimum: boolean;
}

/** One month of the team (GET /api/sheet, docs/detailed-designs/sheet/view-month). */
export interface SheetMonth {
  /** `yyyy-MM`. */
  readonly month: string;
  /** Today in the team's time zone, `yyyy-MM-dd`. */
  readonly today: string;
  readonly isManager: boolean;
  /** The manager's name, for "Confirmed days can only be changed by …". */
  readonly managerName: string;
  /** Fewest people who should be in; null until the team sets one (teams/coverage-minimum). */
  readonly coverageMinimum: number | null;
  /** In display order: a member's own row first. */
  readonly members: readonly SheetMember[];
  readonly coverage: readonly SheetCoverage[];
  /** The team's school calendar is on (L2-059): children and closures show. */
  readonly schoolCalendar: boolean;
  /** The closures that touch this month; empty while the school calendar is off (L2-061). */
  readonly closures: readonly SchoolClosure[];
}

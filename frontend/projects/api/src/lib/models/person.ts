import { AllowanceFigures } from './allowance-figures';
import { WeekDay } from './week-day';
import { YearDayStatus } from './year';

/** One day of the year at a glance; `holiday` names the team holiday that makes it `off`. */
export interface PersonDay {
  readonly status: YearDayStatus;
  readonly holiday: string | null;
}

export interface PersonMonth {
  /** 1 (January) to 12. */
  readonly month: number;
  /** One entry per calendar day, in date order. */
  readonly days: readonly PersonDay[];
}

/** Consecutive working days with the same status, as "13–24 Jul 10 days Confirmed". */
export interface PersonRun {
  /** `yyyy-MM-dd`. */
  readonly first: string;
  /** `yyyy-MM-dd`. */
  readonly last: string;
  readonly days: number;
  readonly status: 'Tentative' | 'Requested' | 'Confirmed';
}

export interface PersonAdjustment {
  readonly id: string;
  /** Positive adds days, negative removes them. */
  readonly days: number;
  readonly reason: string;
  /** `yyyy-MM-dd`. */
  readonly effectiveDate: string;
}

/** A person's page (GET /api/people/{id}, docs/detailed-designs/allowances/person-page). */
export interface Person {
  readonly id: string;
  readonly name: string;
  readonly jobTitle: string | null;
  /** `yyyy-MM-dd`. */
  readonly joinedOn: string | null;
  /** The weekdays they work. */
  readonly workingDays: readonly WeekDay[];
  /** The year the leave year starts in; the year at a glance is this calendar year. */
  readonly year: number;
  /** Whom a request goes to. */
  readonly managerName: string;
  /** The signed-in person's own page. */
  readonly isYou: boolean;
  /** The signed-in person is the manager. */
  readonly canManage: boolean;
  readonly allowance: AllowanceFigures;
  /** Requested days beyond the days left; 0 when they fit. */
  readonly daysOver: number;
  readonly months: readonly PersonMonth[];
  readonly upcoming: readonly PersonRun[];
  readonly taken: readonly PersonRun[];
  readonly adjustments: readonly PersonAdjustment[];
}

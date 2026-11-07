import { AllowanceFigures } from './allowance-figures';

/** How one day of a month is drawn on the year (mirrors the strings of `Greenlit.Application.Year.YearMonthDto`). */
export type YearDayStatus = 'off' | 'empty' | 'tentative' | 'requested' | 'confirmed';

/** One month of a member's row. */
export interface YearMonth {
  /** 1 (January) to 12. */
  readonly month: number;
  /** Confirmed working days in the month. */
  readonly confirmed: number;
  /** One status per calendar day, in date order. */
  readonly days: readonly YearDayStatus[];
}

export interface YearMember {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  /** The signed-in person's row. */
  readonly isYou: boolean;
  /** January to December. */
  readonly months: readonly YearMonth[];
  /** The allowance for the leave year that starts in this year. */
  readonly allowance: AllowanceFigures;
}

/** The team's year (GET /api/year, docs/detailed-designs/allowances/year-overview). */
export interface TeamYear {
  readonly year: number;
  readonly isManager: boolean;
  /** In display order: the signed-in person's own row first. */
  readonly members: readonly YearMember[];
}

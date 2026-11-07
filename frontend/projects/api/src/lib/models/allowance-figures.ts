/** One member's allowance for the leave year (mirrors `Greenlit.Application.Allowances.AllowanceFigures`). */
export interface AllowanceFigures {
  readonly yearlyDays: number;
  readonly adjustments: number;
  /** Yearly days plus adjustments. */
  readonly allowance: number;
  /** Confirmed working days before today. */
  readonly used: number;
  /** Confirmed working days from today on. */
  readonly booked: number;
  /** Working days of pending requests. */
  readonly requested: number;
  readonly tentative: number;
  /** Allowance minus used and booked; negative when the member is over. */
  readonly left: number;
}

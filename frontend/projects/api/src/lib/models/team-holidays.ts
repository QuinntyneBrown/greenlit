/** One of the team's holidays: a red day for everyone (teams/manage-holidays). */
export interface Holiday {
  readonly id: string;
  /** `yyyy-MM-dd`. */
  readonly date: string;
  readonly name: string;
}

/** The Work week & holidays section's holidays (GET /api/team/holidays). */
export interface TeamHolidays {
  /** The year listed: the current year in the team's time zone. */
  readonly year: number;
  /** "Public holidays: United Kingdom"; null when the team chose no calendar. */
  readonly source: string | null;
  /** In date order. */
  readonly holidays: readonly Holiday[];
}

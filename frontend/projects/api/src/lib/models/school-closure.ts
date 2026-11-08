/** A school closure (GET /api/team/closures, docs/detailed-designs/teams/school-calendar, L2-061). */
export interface SchoolClosure {
  readonly id: string;
  readonly label: string;
  /** `yyyy-MM-dd`. */
  readonly firstDay: string;
  /** `yyyy-MM-dd`, on or after `firstDay`. */
  readonly lastDay: string;
  /** The child it is for; null for all children. */
  readonly memberId: string | null;
  /** Added by a calendar import (L2-062). */
  readonly imported: boolean;
}

/** What the manager enters in the closure dialog. */
export interface SchoolClosureInput {
  readonly label: string;
  readonly firstDay: string;
  readonly lastDay: string;
  readonly memberId: string | null;
}

/** A team the signed-in person belongs to, as GET /api/teams/mine returns it (teams/switch-team, L2-054, L2-056). */
export interface ManagedTeam {
  readonly id: string;
  readonly name: string;
  /** The team the session names: every screen shows it. */
  readonly active: boolean;
  /** The team sign-in opens. */
  readonly isDefault: boolean;
  /** The person manages this team; "Your teams" lists only these (L2-054 AC7, ADR-015). */
  readonly manages: boolean;
}

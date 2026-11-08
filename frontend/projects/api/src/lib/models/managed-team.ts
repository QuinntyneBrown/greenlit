/** A team the signed-in manager manages, as GET /api/teams/mine returns it (teams/switch-team, L2-054). */
export interface ManagedTeam {
  readonly id: string;
  readonly name: string;
  /** The team the session names: every screen shows it. */
  readonly active: boolean;
  /** The team sign-in opens. */
  readonly isDefault: boolean;
}

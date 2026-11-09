/** A member's row in the Team section (GET /api/team/settings/team). */
export interface TeamSettingsMember {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly role: 'Member' | 'Manager';
  /** The manager sees the member's own yearly days (null: team default); a read-only member sees the effective days. */
  readonly yearlyDays: number | null;
  /** The stored Child mark (L2-060); it counts only while the school calendar is on. */
  readonly isChild: boolean;
  /** The team's manager's own row, which is never a child. */
  readonly isTeamManager: boolean;
}

/** The Team section of Settings (docs/detailed-designs/teams/team-settings). */
export interface TeamSettingsTeam {
  readonly name: string;
  /** IANA time zone, one of `TIME_ZONE_OPTIONS`. */
  readonly timeZone: string;
  /** True for the team's manager; everyone else sees the section read-only. */
  readonly canEdit: boolean;
  readonly managerName: string;
  /** In sheet order. */
  readonly members: readonly TeamSettingsMember[];
  /** The team's school calendar is on (L2-059): Settings shows children and closures. */
  readonly schoolCalendar: boolean;
}

/** What the manager entered in the Team section. */
export interface SaveTeamSettingsInput {
  readonly name: string;
  readonly timeZone: string;
  readonly members: readonly {
    readonly id: string;
    readonly role: 'Member' | 'Manager';
    readonly yearlyDays: number | null;
    readonly isChild: boolean;
  }[];
}

/** What a new person gets (GET /api/team/settings): the Allowances section of Settings. */
export interface AllowanceDefaults {
  /** Yearly days of a member who has none of their own. */
  readonly defaultYearlyDays: number;
  /** 1 (January) to 12 (December). */
  readonly leaveYearStartMonth: number;
  readonly maxCarryOver: number;
}

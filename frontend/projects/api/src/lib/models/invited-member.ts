/** What the invite dialog collects (teams/invite-member, L2-010 AC1). */
export interface NewMember {
  readonly name: string;
  readonly email: string;
  readonly role: MemberRole;
}

export type MemberRole = 'Member' | 'Manager';

/** The row an invitation put on the sheet (POST /api/team/members). */
export interface InvitedMember {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: MemberRole;
  /** The person was already invited and only got a new link. */
  readonly resent: boolean;
}

/** The roles the dialog offers, Member first (L2-010 AC1). */
export const MEMBER_ROLE_OPTIONS: readonly {
  readonly value: MemberRole;
  readonly label: string;
}[] = [
  { value: 'Member', label: 'Member' },
  { value: 'Manager', label: 'Manager' },
];

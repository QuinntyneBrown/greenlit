/** What an open invitation shows: GET /api/invitations/{token} (identity-and-access/accept-invitation). */
export interface Invitation {
  readonly teamName: string;
  /** Who invited the person. */
  readonly managerName: string;
  /** The name the manager gave the row; pre-fills "Your name". */
  readonly memberName: string;
  /** Where the invitation was sent; fixed. */
  readonly email: string;
  /** That address already has an account: the page signs in and joins instead of creating one (L2-058). */
  readonly accountExists: boolean;
}

/** The signed-in session as POST /api/auth/sign-in returns it (ADR-004). */
export interface Session {
  readonly accessToken: string;
  /** ISO 8601; the token stops working then. */
  readonly expiresUtc: string;
  readonly userId: string;
  readonly displayName: string;
  readonly role: 'Member' | 'Manager' | 'Admin';
  /** Null for an account that is not on a team yet. */
  readonly teamId: string | null;
}

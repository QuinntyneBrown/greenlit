/** Who is signed in, as GET /api/auth/me names them for the account menu. */
export interface Account {
  readonly displayName: string;
  readonly email: string;
  readonly role: 'Member' | 'Manager' | 'Admin';
}

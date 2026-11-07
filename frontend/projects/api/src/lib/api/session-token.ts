/**
 * True when `token` is a JWT whose `exp` is still in the future. Only the
 * expiry is read; the API alone decides whether the token is genuine.
 */
export function isLiveToken(token: string | null, now: Date = new Date()): boolean {
  if (!token) return false;
  const payload = token.split('.')[1];
  if (!payload) return false;
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' && exp * 1000 > now.getTime();
  } catch {
    return false;
  }
}

/**
 * The app path to return to after signing in: only a path inside this app
 * (one leading `/`, not `//` or `/\`), so the parameter can never send
 * someone to another site. Anything else is the calendar.
 */
export function safeReturnUrl(candidate: string | null | undefined): string {
  if (!candidate || !/^\/(?![/\\])/.test(candidate) || candidate.startsWith('/sign-in')) return '/';
  return candidate;
}

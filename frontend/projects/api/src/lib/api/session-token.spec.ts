import { isLiveToken, safeReturnUrl } from './session-token';

function token(exp: number): string {
  const payload = btoa(JSON.stringify({ exp })).replace(/=+$/, '');
  return `e30.${payload}.sig`;
}

describe('isLiveToken', () => {
  const now = new Date('2026-11-07T12:00:00Z');

  it('is true before exp and false after', () => {
    expect(isLiveToken(token(now.getTime() / 1000 + 60), now)).toBe(true);
    expect(isLiveToken(token(now.getTime() / 1000 - 60), now)).toBe(false);
  });

  it('is false for no token or a malformed one', () => {
    expect(isLiveToken(null, now)).toBe(false);
    expect(isLiveToken('not-a-jwt', now)).toBe(false);
    expect(isLiveToken('a.%%%.c', now)).toBe(false);
  });
});

describe('safeReturnUrl', () => {
  it('keeps a path inside the app', () => {
    expect(safeReturnUrl('/?month=2026-12')).toBe('/?month=2026-12');
    expect(safeReturnUrl('/requests')).toBe('/requests');
  });

  it('turns anything else into the calendar', () => {
    for (const bad of [
      null,
      '',
      'https://evil.example.com',
      '//evil.example.com',
      '/\\evil',
      '/sign-in',
    ]) {
      expect(safeReturnUrl(bad)).toBe('/');
    }
  });
});

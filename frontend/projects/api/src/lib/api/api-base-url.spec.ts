import { apiUrl } from './api-base-url';

describe('apiUrl', () => {
  it('joins an origin and a path with exactly one slash', () => {
    expect(apiUrl('http://localhost:5100', 'api/_ping')).toBe('http://localhost:5100/api/_ping');
    expect(apiUrl('http://localhost:5100/', '/api/_ping')).toBe('http://localhost:5100/api/_ping');
  });
});

import { buildGoogleAuthRedirectUrl } from './auth-redirect';

describe('buildGoogleAuthRedirectUrl', () => {
  it('keeps the app origin and adds the app root callback path', () => {
    expect(buildGoogleAuthRedirectUrl('http://127.0.0.1:4200')).toBe('http://127.0.0.1:4200/');
  });

  it('normalizes a trailing slash and preserves a custom path', () => {
    expect(buildGoogleAuthRedirectUrl('https://example.com/store')).toBe('https://example.com/store');
  });
});

export function buildGoogleAuthRedirectUrl(baseUrl: string): string {
  const raw = (baseUrl ?? '').trim();
  if (!raw) {
    return '/';
  }

  try {
    const url = new URL(raw);
    const isRoot = url.pathname === '/' || url.pathname === '';
    return isRoot ? `${url.origin}/` : `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return raw.endsWith('/') ? raw : `${raw}/`;
  }
}

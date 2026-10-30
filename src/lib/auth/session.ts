import { COOKIE_DOMAIN } from '@/config/env';

export const TOKEN_STORAGE_KEY = 'token';

// The API's httpOnly tt_session cookie lives on the API host, so middleware on
// any other web host never sees it. This marker lives on the web host itself and
// only tells middleware "signed in"; the API still checks the real session.
export const SIGNED_IN_COOKIE = 'tt_web_signed_in';
const SIGNED_IN_MAX_AGE_S = 90 * 24 * 60 * 60;

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function markSignedIn() {
  if (typeof window === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${SIGNED_IN_COOKIE}=1; path=/; max-age=${SIGNED_IN_MAX_AGE_S}; SameSite=Lax${secure}`;
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  markSignedIn();
}

export function clearClientSideAuth() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_STORAGE_KEY);

  document.cookie = `${SIGNED_IN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  if (COOKIE_DOMAIN) {
    document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; domain=${COOKIE_DOMAIN}`;
    document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${COOKIE_DOMAIN}`;
  }
}

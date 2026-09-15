import { COOKIE_DOMAIN } from '@/config/env';

export const TOKEN_STORAGE_KEY = 'token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearClientSideAuth() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(TOKEN_STORAGE_KEY);

  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
  document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

  if (COOKIE_DOMAIN) {
    document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; domain=${COOKIE_DOMAIN}`;
    document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${COOKIE_DOMAIN}`;
  }
}

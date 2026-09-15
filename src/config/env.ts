export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3002/api/v1';

export const BACKEND_URL = API_BASE_URL.replace('/api/v1', '');

export const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

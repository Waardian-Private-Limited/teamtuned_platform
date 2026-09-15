import { API_BASE_URL, BACKEND_URL } from '@/config/env';
import { clearClientSideAuth, getToken } from '@/lib/auth/session';
import { ApiError } from './errors';

export const getBackendUrl = () => BACKEND_URL;

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  withAuth?: boolean;
  tokenKey?: string;
  withCredentials?: boolean;
  responseType?: 'json' | 'blob' | 'text';
  signal?: AbortSignal;
}

function isFormData(body: unknown): body is FormData {
  return (
    typeof body === 'object' &&
    body !== null &&
    ((typeof FormData !== 'undefined' && body instanceof FormData) ||
      (body as { constructor?: { name?: string } }).constructor?.name === 'FormData' ||
      typeof (body as { append?: unknown }).append === 'function')
  );
}

export async function apiClient<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    params,
    withAuth = false,
    tokenKey = 'token',
    withCredentials = true,
    responseType = 'json',
    signal,
  } = options;

  let query = '';
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) query = `?${qs}`;
  }

  const formData = isFormData(body);

  const allHeaders: Record<string, string> = {
    ...headers,
    'ngrok-skip-browser-warning': 'true',
  };

  if (withAuth && typeof window !== 'undefined') {
    const token = tokenKey === 'token' ? getToken() : localStorage.getItem(tokenKey);
    if (token) {
      allHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (!formData) {
    allHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}${query}`, {
    method,
    credentials: withCredentials ? 'include' : 'omit',
    headers: allHeaders,
    body: formData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      apiClient('/auth/logout', { method: 'POST' }).catch(() => {});
      clearClientSideAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    let errorMsg = 'Request failed';
    let errData: unknown = null;
    try {
      errData = await res.json();
      errorMsg = (errData as { message?: string })?.message || JSON.stringify(errData);
    } catch {
      errorMsg = await res.text();
    }
    throw new ApiError(errorMsg || `Request failed with status ${res.status}`, res.status, errData);
  }

  try {
    if (responseType === 'blob') return (await res.blob()) as T;
    if (responseType === 'text') return (await res.text()) as T;
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

apiClient.get = <T = any>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  options?: RequestOptions
) => apiClient<T>(path, { ...options, method: 'GET', params });

apiClient.post = <T = any>(path: string, body?: unknown, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'POST', body });

apiClient.put = <T = any>(path: string, body?: unknown, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'PUT', body });

apiClient.delete = <T = any>(path: string, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'DELETE' });

apiClient.patch = <T = any>(path: string, body?: unknown, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'PATCH', body });

export { clearClientSideAuth };

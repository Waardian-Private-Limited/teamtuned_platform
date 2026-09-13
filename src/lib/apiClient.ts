const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3002/api/v1';

export const getBackendUrl = () => BASE_URL.replace('/api/v1', '');

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: Method;
  body?: any; // JSON or FormData
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  withAuth?: boolean; // Adds Authorization header from localStorage
  tokenKey?: string; // Optional: specify a custom token key (defaults to 'token')
  withCredentials?: boolean; // Whether to include cookies (defaults to true)
  responseType?: 'json' | 'blob' | 'text';
  signal?: AbortSignal;
}

// Helper function to clear client-side auth data
export function clearClientSideAuth() {
    if (typeof window === 'undefined') return;
    
    // Clear localStorage token
    localStorage.removeItem('token');
    
    // Clear the non-httpOnly 'token' cookie (the only one JS can actually clear)
    // Try all parameter variations to cover different ways it might have been set
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Also try with domain if configured
    if (process.env.NEXT_PUBLIC_COOKIE_DOMAIN) {
        document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN}`;
        document.cookie = `token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN}`;
    }
    
    // Note: The 'tt_session' cookie is httpOnly, so JS can't clear it!
    // It must be cleared by the backend via the /auth/logout endpoint.
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
    tokenKey = 'token', // Default to the standard session token
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
  // Robust FormData detection
  const isFormData = body && (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (body.constructor && body.constructor.name === 'FormData') ||
    (typeof body.append === 'function')
  );

  const allHeaders: Record<string, string> = {
    ...headers,
    'ngrok-skip-browser-warning': 'true',
  };

  if (withAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      allHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (!isFormData) {
    allHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}${query}`, {
    method,
    credentials: withCredentials ? 'include' : 'omit',
    headers: allHeaders,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    // Auto logout and redirect on 401
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        // First try to hit the logout endpoint to have the backend clear the httpOnly cookie
        apiClient('/auth/logout', { method: 'POST' }).catch(() => { /* ignore errors here */ });
      } catch { }
      
      // Clear what we can on the client side
      clearClientSideAuth();
      
      // Only redirect to login if we're not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    let errorMsg = 'Request failed';
    let errData = null;
    try {
      errData = await res.json();
      errorMsg = errData.message || JSON.stringify(errData);
    } catch {
      errorMsg = await res.text();
    }
    const error: any = new Error(errorMsg || `Request failed with status ${res.status}`);
    error.status = res.status;
    error.data = errData;
    throw error;
  }

  try {
    if (responseType === 'blob') {
      return await res.blob() as any;
    }
    if (responseType === 'text') {
      return await res.text() as any;
    }
    return await res.json();
  } catch {
    // Some endpoints may return empty body
    return {} as T;
  }
}

// Add helper methods to the function object
apiClient.get = <T = any>(path: string, params?: Record<string, any>, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'GET', params });

apiClient.post = <T = any>(path: string, body?: any, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'POST', body });

apiClient.put = <T = any>(path: string, body?: any, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'PUT', body });

apiClient.delete = <T = any>(path: string, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'DELETE' });

apiClient.patch = <T = any>(path: string, body?: any, options?: RequestOptions) =>
  apiClient<T>(path, { ...options, method: 'PATCH', body });

// Auth-specific endpoints, DTOs and models now live in src/features/auth/.
// This module stays a transport layer: request building, auth header, errors.

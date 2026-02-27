import { encryptPassword } from './crypto';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3002/api/v1';

export const getBackendUrl = () => BASE_URL.replace('/api/v1', '');

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: Method;
  body?: any; // JSON or FormData
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  withAuth?: boolean; // Adds Authorization header from localStorage
  responseType?: 'json' | 'blob' | 'text';
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
    responseType = 'json',
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
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const allHeaders: Record<string, string> = {
    ...headers,
    'ngrok-skip-browser-warning': 'true',
  };

  if (withAuth && typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      allHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  if (!isFormData) {
    allHeaders['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}${query}`, {
    method,
    credentials: 'include',
    headers: allHeaders,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // Auto logout and redirect on 401
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('token');
      } catch { }
      // Redirect to login immediately
      window.location.href = '/login';
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

// Types mirrored from waardian_web
export interface Account {
  id: string;
  username: string;
  email: string;
  phone: string;
  userType: string;
  societyId: string;
  societyName: string | null;
  flatNumber: string | null;
  wingName: string | null;
  status: string;
}

export interface CheckAccountsResponse {
  message: string;
  accounts?: Account[];
  account?: Account;
  detail?: string;
  error?: string;
}

export interface OtpVerificationResponse {
  success: boolean;
  message?: string;
  detail?: string;
  role?: string;
  user?: {
    id: number;
    email: string;
    societyId: string;
    name?: string;
  };
  accounts?: Account[];
  organization_features?: { id: number; code: string; name: string }[];
  error?: string;
  token?: string;
}

// Auth helpers (referenced by the login form)
export async function checkAccounts(email?: string, phone?: string): Promise<CheckAccountsResponse> {
  const res = await apiClient<CheckAccountsResponse>('/auth/check-web-accounts', {
    method: 'POST',
    body: { email, phone },
  });
  if (res && res.accounts && res.accounts.length === 1 && !res.account) {
    res.account = res.accounts[0];
  }
  return res;
}

export async function loginWithAccount(accountId: string, password: string): Promise<any> {
  const passwordEnc = await encryptPassword(password);
  return apiClient('/auth/weblogin', {
    method: 'POST',
    body: { accountId, password, passwordEnc },
  });
}

export async function sendWebOtp(accountId: string): Promise<any> {
  return apiClient('/auth/send-web-otp', {
    method: 'POST',
    body: { accountId },
  });
}

// Generic login to support password and OTP flows used in the UI
export async function login(payload: { type: 'password' | 'otp'; email?: string; password?: string; mobile?: string; }): Promise<any> {
  // Try standardized endpoints; adjust to your backend later
  if (payload.type === 'password' && payload.email && payload.password) {
    const passwordEnc = await encryptPassword(payload.password);
    return apiClient('/auth/login', {
      method: 'POST',
      body: { email: payload.email, password: payload.password, passwordEnc },
    });
  }
  // OTP request
  return apiClient('/auth/send-otp', {
    method: 'POST',
    body: { mobile: payload.mobile },
  });
}

export async function verifyOtp(mobile: string, otp: string, accountId?: string): Promise<OtpVerificationResponse> {
  return apiClient<OtpVerificationResponse>('/auth/verify-otp', {
    method: 'POST',
    body: { mobile, otp, accountId },
  });
}

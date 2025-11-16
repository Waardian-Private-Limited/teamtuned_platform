import { apiClient } from './apiClient';

export async function checkSession(): Promise<{ isAuthenticated: boolean; role?: string; user?: any }> {
  try {
    const data = await apiClient<{ authenticated: boolean; role?: string; user?: any }>('/auth/session', {
      method: 'GET',
    });
    return {
      isAuthenticated: !!data.authenticated,
      role: data.role,
      user: data.user,
    };
  } catch (e) {
    return { isAuthenticated: false };
  }
}
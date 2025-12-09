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

export async function fetchGlobalShiftAnalytics() {
  return await apiClient<{
    shiftStart: Record<string, number>;
    shiftEnd: Record<string, number>;
    stats: { avgStart: string; avgEnd: string; peakStart: string; peakEnd: string; }
  }>('/superadmin/analytics/shifts');
}

export async function fetchGlobalAttendanceAnalytics() {
  return await apiClient<{
    hourlyPunchIns: Record<string, number>;
    hourlyPunchOuts: Record<string, number>;
    stats: { avgIn: string; avgOut: string; peakIn: string; peakOut: string; }
  }>('/superadmin/analytics/attendance');
}

export async function fetchOrgStats() {
  return await apiClient<{ orgId: number; orgName: string; employeeCount: number }[]>('/superadmin/analytics/orgs');
}
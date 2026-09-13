import { apiClient } from './apiClient';

// Superadmin analytics endpoints. Session checks live in features/auth/api.

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
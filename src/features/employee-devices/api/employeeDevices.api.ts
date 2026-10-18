import { apiClient } from '@/lib/apiClient';
import type {
  DeviceActionResponseDto,
  EmployeeDeviceDetailDto,
  EmployeeDeviceListResponseDto,
} from '../types/employeeDevices.dto';

interface ListParams {
  search?: string;
  status?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
  subOrgId?: number | null;
}

export function listEmployeeDevices(params: ListParams = {}) {
  return apiClient.get<EmployeeDeviceListResponseDto>(
    '/employee-devices',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      platform: params.platform && params.platform !== 'all' ? params.platform : undefined,
      page: params.page,
      pageSize: params.pageSize,
      subOrgId: params.subOrgId ?? undefined,
    },
    { withAuth: true }
  );
}

export function getEmployeeDevice(userId: number) {
  return apiClient.get<EmployeeDeviceDetailDto>(`/employee-devices/${userId}`, undefined, { withAuth: true });
}

export function resetEmployeeDevice(userId: number) {
  return apiClient.post<DeviceActionResponseDto>(`/employee-devices/${userId}/reset`, {}, { withAuth: true });
}

export function allowPendingDevice(userId: number) {
  return apiClient.post<DeviceActionResponseDto>(`/employee-devices/${userId}/allow`, {}, { withAuth: true });
}

export function logoutDeviceSession(sessionId: number) {
  return apiClient.delete<DeviceActionResponseDto>(`/employee-devices/sessions/${sessionId}`, { withAuth: true });
}

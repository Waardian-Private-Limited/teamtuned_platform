import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto, OnboardingExportRequest } from '../types/downloads.dto';

const auth = { withAuth: true };

export function listJobs() {
  return apiClient.get<{ jobs: ExportJobDto[] }>('/exports', { limit: 30 }, auth);
}

export function cancelJob(id: number) {
  return apiClient.post<ExportJobDto>(`/exports/${id}/cancel`, undefined, auth);
}

export function removeJob(id: number) {
  return apiClient.delete<void>(`/exports/${id}`, auth);
}

export function downloadLink(id: number) {
  return apiClient.get<{ url: string | null; file_name: string }>(`/exports/${id}/download`, undefined, auth);
}

export function localFile(id: number) {
  return apiClient<Blob>(`/exports/${id}/file`, { ...auth, responseType: 'blob' });
}

export function requestOnboardingExport(body: OnboardingExportRequest) {
  return apiClient.post<ExportJobDto>('/exports/onboarding-profile', body, auth);
}

export function requestRosterExport(body: { rosterId: number; format: 'pdf' | 'xlsx'; includeLegend: boolean }) {
  return apiClient.post<ExportJobDto>('/exports/roster', body, auth);
}

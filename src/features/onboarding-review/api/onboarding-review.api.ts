import { apiClient } from '@/lib/apiClient';
import type { SubmissionDetailDto, SubmissionListResponseDto } from '../types/onboarding-review.dto';

const auth = { withAuth: true };

export function listSubmissions(params: { status?: string; search?: string; page: number; pageSize: number }) {
  return apiClient.get<SubmissionListResponseDto>(
    '/employee-onboarding',
    { status: params.status || undefined, search: params.search || undefined, page: params.page, pageSize: params.pageSize },
    auth
  );
}

export function getSubmission(employeeId: number) {
  return apiClient.get<SubmissionDetailDto>(`/employee-onboarding/${employeeId}`, undefined, auth);
}

export function approve(employeeId: number) {
  return apiClient.post<{ status: string }>(`/employee-onboarding/${employeeId}/approve`, undefined, auth);
}

export function requestChanges(employeeId: number, remarks: Record<string, string>) {
  return apiClient.post<{ status: string }>(`/employee-onboarding/${employeeId}/request-changes`, { remarks }, auth);
}

export function verifyDocument(employeeId: number, docId: number, status: 'verified' | 'rejected', remarks?: string) {
  return apiClient.patch<{ status: string }>(`/employee-onboarding/${employeeId}/documents/${docId}/verify`, { status, remarks }, auth);
}

export function getDocumentUrl(employeeId: number, docId: number) {
  return apiClient.get<{ url: string; expires_in: number }>(`/employee-onboarding/${employeeId}/documents/${docId}/url`, undefined, auth);
}

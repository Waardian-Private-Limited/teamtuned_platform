import { apiClient } from '@/lib/apiClient';
import type { IfscDto } from '@/features/employees/types/employees.dto';
import type {
  DraftSaveResponseDto,
  OnboardingStateResponseDto,
  VaultDocumentDto,
  VaultDocumentListResponseDto,
} from '../types/employee-onboarding.dto';

const auth = { withAuth: true };

export function getMyState() {
  return apiClient.get<OnboardingStateResponseDto>('/me/onboarding', undefined, auth);
}

export function patchDraft(values: Record<string, unknown>) {
  return apiClient.patch<DraftSaveResponseDto>('/me/onboarding/draft', { values }, auth);
}

export function lookupIfsc(code: string) {
  return apiClient.get<IfscDto>(`/me/onboarding/lookup/ifsc/${encodeURIComponent(code)}`, undefined, auth);
}

export async function lookupPincode(pincode: string) {
  const res = await apiClient.get<{ data?: { city: string; state: string } | null }>(
    `/me/onboarding/lookup/pincode/${pincode}`,
    undefined,
    auth
  );
  return res?.data ?? null;
}

export function submit() {
  return apiClient.post<{ status: string }>('/me/onboarding/submit', undefined, auth);
}

export function listDocuments() {
  return apiClient.get<VaultDocumentListResponseDto>('/me/onboarding/documents', undefined, auth);
}

export function uploadDocument(params: {
  docType: string;
  side: string;
  number?: string;
  file: File;
}) {
  const form = new FormData();
  form.append('docType', params.docType);
  form.append('side', params.side);
  if (params.number) form.append('number', params.number);
  form.append('file', params.file);
  return apiClient.post<VaultDocumentDto>('/me/onboarding/documents', form, auth);
}

export function deleteDocument(id: number) {
  return apiClient.delete<{ success: boolean }>(`/me/onboarding/documents/${id}`, auth);
}

export function upgradeSession() {
  return apiClient.post<{ next_step: string; token?: string }>('/auth/upgrade-session', undefined, auth);
}

import { apiClient } from '@/lib/apiClient';
import type { MyConsentResponseDto, PrivacyNoticeAdminResponseDto } from '../types/privacy.dto';

const auth = { withAuth: true };

export function getMyConsent() {
  return apiClient.get<MyConsentResponseDto>('/me/consent', undefined, auth);
}

export function acceptConsent(purposesAccepted: Record<string, boolean>) {
  return apiClient.post<{ accepted: boolean; notice_version: number; next_step: string; token: string }>(
    '/me/consent',
    { purposes_accepted: purposesAccepted, channel: 'web' },
    auth
  );
}

export function getNoticeAdmin() {
  return apiClient.get<PrivacyNoticeAdminResponseDto>('/privacy-notices', undefined, auth);
}

export function saveNoticeDraft(body: {
  title: string;
  body_md: string;
  purposes: { key: string; label: string; required: boolean }[];
  grievance_officer?: Record<string, string>;
}) {
  return apiClient.put('/privacy-notices', body, auth);
}

export function publishNoticeDraft() {
  return apiClient.post('/privacy-notices/publish', undefined, auth);
}

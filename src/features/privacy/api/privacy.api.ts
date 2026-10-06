import { apiClient } from '@/lib/apiClient';
import type {
  NoticeVersionsResponseDto, MyConsentResponseDto, PrivacyNoticeAdminResponseDto } from '../types/privacy.dto';

const auth = { withAuth: true };

export function getMyConsent() {
  return apiClient.get<MyConsentResponseDto>('/me/consent', undefined, auth);
}

export function acceptConsent(purposesAccepted: Record<string, boolean>, locale?: string) {
  return apiClient.post<{ accepted: boolean; notice_version: number; next_step: string; token: string }>(
    '/me/consent',
    { purposes_accepted: purposesAccepted, channel: 'web', locale },
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
  translations?: Record<string, unknown>;
  change_type?: 'material' | 'minor';
  change_summary?: Record<string, string>;
  grievance_officer?: Record<string, string>;
}) {
  return apiClient.put('/privacy-notices', body, auth);
}

export function publishNoticeDraft() {
  return apiClient.post('/privacy-notices/publish', undefined, auth);
}

export function getNoticeVersions() {
  return apiClient.get<NoticeVersionsResponseDto>('/privacy-notices/versions', undefined, auth);
}

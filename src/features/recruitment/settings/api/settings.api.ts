import { apiClient } from '@/lib/apiClient';

// /api/v1/recruitment/settings (RECRUITMENT_DESIGN.md §6.1, RECRUIT_SETTINGS).

export interface RecruitmentSettingsDto {
  careersSlug: string | null;
  hostedEnabled: boolean | number;
  companyIntro: string | null;
  rejectionEmailEnabled: boolean | number;
  hostedUrl?: string | null;
}

export interface ApiKeyDto {
  id: number;
  name: string;
  prefix: string;
  allowedOrigins: string[] | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

const auth = { withAuth: true } as const;

export function getSettings() {
  return apiClient.get<RecruitmentSettingsDto>('/recruitment/settings', undefined, auth);
}

export function saveSettings(body: { careers_slug: string | null; hosted_enabled: boolean; company_intro: string; rejection_email_enabled: boolean }) {
  return apiClient.put<RecruitmentSettingsDto>('/recruitment/settings', body, auth);
}

export function listApiKeys() {
  return apiClient.get<ApiKeyDto[] | { items: ApiKeyDto[] }>('/recruitment/settings/api-keys', undefined, auth);
}

export function createApiKey(name: string, allowedOrigins: string[]) {
  return apiClient.post<ApiKeyDto & { key: string }>('/recruitment/settings/api-keys', { name, allowed_origins: allowedOrigins }, auth);
}

export function revokeApiKey(id: number) {
  return apiClient.delete(`/recruitment/settings/api-keys/${id}`, auth);
}

// ---- Scorecards (doc §10.1): criteria library + what the interview panel sees ----

export type PanelMode = 'show' | 'hide' | 'ask';

export interface ScorecardCriterionRowDto {
  id: number;
  name: string;
  required: boolean;
  subOrganizationId: number | null;
}

export interface ScorecardSettingsDto {
  subOrganizationId: number | null;
  /** This level's own criteria. */
  criteria: ScorecardCriterionRowDto[];
  /** At a sub-organization: the organization-wide criteria that also apply (read-only here). */
  organizationCriteria: ScorecardCriterionRowDto[];
  visibility: { testsMode: PanelMode; roundsMode: PanelMode; inherited: boolean };
}

const scope = (subOrganizationId: number | null) => (subOrganizationId ? { sub_organization_id: subOrganizationId } : {});

export function getScorecardSettings(subOrganizationId: number | null) {
  return apiClient.get<ScorecardSettingsDto>('/recruitment/settings/scorecard', scope(subOrganizationId), auth);
}

export function saveScorecardVisibility(subOrganizationId: number | null, body: { tests_mode: PanelMode; rounds_mode: PanelMode } | { inherit: true }) {
  return apiClient.put<ScorecardSettingsDto>('/recruitment/settings/scorecard/visibility', { ...scope(subOrganizationId), ...body }, auth);
}

export function createScorecardCriterion(subOrganizationId: number | null, body: { name: string; required: boolean }) {
  return apiClient.post<ScorecardSettingsDto>('/recruitment/settings/scorecard/criteria', { ...scope(subOrganizationId), ...body }, auth);
}

export function updateScorecardCriterion(id: number, body: { name?: string; required?: boolean }) {
  return apiClient.put<ScorecardSettingsDto>(`/recruitment/settings/scorecard/criteria/${id}`, body, auth);
}

export function deleteScorecardCriterion(id: number) {
  return apiClient.delete<ScorecardSettingsDto>(`/recruitment/settings/scorecard/criteria/${id}`, auth);
}

// Referral program (RECRUIT_SETTINGS): the reward a referrer earns when the person they referred is hired.
export interface ReferralProgramDto {
  enabled: boolean;
  reward_type: 'cash' | 'non_cash';
  amount: number;
  description: string;
  payable_after_days: number;
  payout_mode: 'payroll' | 'manual';
  terms: string;
  terms_file: { name: string } | null;
}

export type ReferralProgramInput = Omit<ReferralProgramDto, 'terms_file'>;

export function getReferralProgram() {
  return apiClient.get<ReferralProgramDto>('/recruitment/settings/referral-program', undefined, auth);
}

export function saveReferralProgram(body: ReferralProgramInput) {
  return apiClient.put<ReferralProgramDto>('/recruitment/settings/referral-program', body, auth);
}

export function attachReferralTerms(file: File) {
  const fd = new FormData();
  fd.append('terms', file);
  return apiClient.post<ReferralProgramDto>('/recruitment/settings/referral-program/terms', fd, auth);
}

export function removeReferralTerms() {
  return apiClient.delete<ReferralProgramDto>('/recruitment/settings/referral-program/terms', auth);
}

export interface ConsentPurposeDto {
  key: string;
  label: string;
  required: boolean;
}

export interface NoticeLocaleDto {
  title: string;
  intro: string;
  sections: Array<{ key: string; heading: string; body: string }>;
  purposes: Record<string, string>;
}

export interface PrivacyNoticeDto {
  id: number;
  version: number;
  title: string;
  body_md: string;
  purposes: ConsentPurposeDto[];
  translations?: Record<string, NoticeLocaleDto> | null;
  grievance_officer?: { name?: string; email?: string; phone?: string; address?: string } | null;
  change_type?: 'material' | 'minor';
  change_summary?: Record<string, string> | null;
  new_purposes?: string[];
  previous_version?: number | null;
  previously_accepted?: string[];
}

export interface MyConsentResponseDto {
  notice: PrivacyNoticeDto;
  accepted: boolean;
}

export interface PrivacyNoticeAdminDto {
  id: number;
  version: number;
  status: 'draft' | 'published';
  title: string;
  bodyMd: string;
  purposes: ConsentPurposeDto[];
  translations?: Record<string, NoticeLocaleDto> | null;
  changeType?: 'material' | 'minor';
  changeSummary?: Record<string, string> | null;
  grievanceOfficer: { name?: string; email?: string; phone?: string; address?: string } | null;
  publishedAt: string | null;
}

export interface PrivacyNoticeAdminResponseDto {
  published: PrivacyNoticeAdminDto | null;
  draft: PrivacyNoticeAdminDto | null;
}

export interface NoticeVersionDto {
  id: number;
  version: number;
  status: 'draft' | 'published';
  change_type: 'material' | 'minor';
  change_summary: Record<string, string> | null;
  title: string;
  published_at: string | null;
  accepted_users: number;
}

export interface NoticeVersionsResponseDto {
  versions: NoticeVersionDto[];
  active_users: number;
}

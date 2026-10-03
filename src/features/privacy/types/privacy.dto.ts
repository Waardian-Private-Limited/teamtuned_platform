export interface ConsentPurposeDto {
  key: string;
  label: string;
  required: boolean;
}

export interface PrivacyNoticeDto {
  id: number;
  version: number;
  title: string;
  body_md: string;
  purposes: ConsentPurposeDto[];
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
  grievanceOfficer: { name?: string; email?: string; phone?: string; address?: string } | null;
  publishedAt: string | null;
}

export interface PrivacyNoticeAdminResponseDto {
  published: PrivacyNoticeAdminDto | null;
  draft: PrivacyNoticeAdminDto | null;
}

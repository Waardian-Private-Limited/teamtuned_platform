import type { OnboardingConfigDto, OnboardingStatus, VaultDocumentDto } from '@/features/employee-onboarding/types/employee-onboarding.dto';

export interface SubmissionListItemDto {
  employee_id: number;
  employee_code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  designation: string | null;
  department_name: string | null;
  status: OnboardingStatus;
  progress: number;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

export interface SubmissionListResponseDto {
  submissions: SubmissionListItemDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export type ReviewDocumentDto = VaultDocumentDto;

export interface SubmissionDetailDto {
  employee_id: number;
  employee_code: string;
  name?: string;
  status: OnboardingStatus;
  progress: number;
  remarks: Record<string, string>;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  config: OnboardingConfigDto;
  documents: ReviewDocumentDto[];
  last_review?: LastReviewDto | null;
}

export interface LastReviewDto {
  requested_at: string;
  remarks: Record<string, string>;
  previous: Record<string, unknown>;
  rejected_documents: { doc_type_key: string; side: string; reason: string | null }[];
}

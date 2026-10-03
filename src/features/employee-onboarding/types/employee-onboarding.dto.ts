export type OnboardingFieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'email' | 'phone' | 'checkbox' | 'file';

export interface OnboardingFieldDto {
  key: string;
  system: boolean;
  locked: boolean;
  type: OnboardingFieldType;
  label: string;
  helpText: string;
  options: string[];
  visible: boolean;
  required: boolean;
  sensitive: boolean;
  order: number;
  value?: unknown;
}

export interface OnboardingStepDto {
  key: string;
  system: boolean;
  label: string;
  visible: boolean;
  order: number;
  fields: OnboardingFieldDto[];
}

export interface OnboardingDocumentDto {
  key: string;
  system: boolean;
  label: string;
  helpText: string;
  visible: boolean;
  required: boolean;
  numberRequired: boolean;
  numberPattern: string;
  sides: number;
  accept: string[];
  maxMb: number;
  order: number;
}

export interface OnboardingConfigDto {
  steps: OnboardingStepDto[];
  documents: OnboardingDocumentDto[];
}

export type OnboardingStatus = 'draft' | 'submitted' | 'changes_requested' | 'approved';

export interface OnboardingStateResponseDto {
  status: OnboardingStatus;
  version: number;
  progress: number;
  remarks: Record<string, string>;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  config: OnboardingConfigDto;
}

export interface DraftSaveResponseDto {
  saved_at: string;
  progress: number;
  field_errors: Record<string, string>;
}

export interface VaultDocumentDto {
  id: number;
  doc_type_key: string;
  side: string;
  number_last4?: string | null;
  mime?: string | null;
  size_bytes?: number | null;
  status: string;
  remarks?: string | null;
  uploaded_at?: string | null;
}

export interface VaultDocumentListResponseDto {
  documents: VaultDocumentDto[];
}

export interface SubmitFieldError {
  step: string | null;
  field: string;
  message: string;
}

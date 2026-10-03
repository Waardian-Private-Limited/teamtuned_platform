export type OnboardingFieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'email' | 'phone' | 'checkbox' | 'file';

export type OnboardingNumberPattern =
  | 'none' | 'pan' | 'aadhaar' | 'ifsc' | 'uan' | 'esic' | 'passport' | 'pincode' | 'generic';

export type OnboardingAcceptType = 'pdf' | 'jpg' | 'png';

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
  numberPattern: OnboardingNumberPattern;
  sides: number;
  accept: OnboardingAcceptType[];
  maxMb: number;
  order: number;
}

export interface OnboardingConfigDto {
  steps: OnboardingStepDto[];
  documents: OnboardingDocumentDto[];
}

export interface OnboardingConfigResponseDto {
  version: number;
  config: OnboardingConfigDto;
}

export interface OnboardingCatalogResponseDto {
  default_config: OnboardingConfigDto;
  field_types: OnboardingFieldType[];
  number_patterns: OnboardingNumberPattern[];
  accept_types: OnboardingAcceptType[];
  gender_options: string[];
  marital_options: string[];
  blood_group_options: string[];
  relation_options: string[];
  qualification_options: string[];
}

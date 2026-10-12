export const SEARCH_DEBOUNCE_MS = 500;
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const SUB_ORG_PERMISSIONS = {
  VIEW: 'SITE_VIEW',
  ADD: 'SITE_ADD',
  EDIT: 'SITE_EDIT',
  DELETE: 'SITE_DELETE',
} as const;

export const SUB_ORG_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const;

export type SubOrgStatusFilter = (typeof SUB_ORG_STATUS_FILTER_OPTIONS)[number]['value'];

export const SUB_ORG_FIELD_NAMES = [
  'name',
  'legal_name',
  'code',
  'address',
  'gst_number',
  'pan',
  'tan',
  'pf_establishment_code',
  'esi_employer_code',
  'pt_registration_no',
  'lwf_registration_no',
  'registered_state',
  'logo_url',
] as const;

export type SubOrgFieldName = (typeof SUB_ORG_FIELD_NAMES)[number];

export const GST_LENGTH = 15;
export const PAN_LENGTH = 10;
export const TAN_LENGTH = 10;
export const LEGAL_NAME_MAX_LENGTH = 200;
export const REGISTERED_STATE_MAX_LENGTH = 60;

export const REGISTRATION_CODE_FIELDS = [
  { key: 'pfEstablishmentCode', field: 'pf_establishment_code', label: 'PF establishment code', maxLength: 30, placeholder: 'MH/BAN/0012345/000' },
  { key: 'esiEmployerCode', field: 'esi_employer_code', label: 'ESI employer code', maxLength: 30, placeholder: '31000123450001001' },
  { key: 'ptRegistrationNo', field: 'pt_registration_no', label: 'PT registration no.', maxLength: 40, placeholder: '27123456789P' },
  { key: 'lwfRegistrationNo', field: 'lwf_registration_no', label: 'LWF registration no.', maxLength: 40, placeholder: 'LWF/MH/12345' },
] as const;

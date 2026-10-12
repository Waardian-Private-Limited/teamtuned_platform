import { GST_LENGTH, LEGAL_NAME_MAX_LENGTH, REGISTERED_STATE_MAX_LENGTH } from '../constants/sub-organizations.constants';

const CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const TAN_PATTERN = /^[A-Z]{4}[0-9]{5}[A-Z]$/;
const REGISTRATION_CODE_PATTERN = /^[A-Za-z0-9 /-]+$/;

export function validateName(name: string): string | null {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length > 150) return 'Name is too long';
  return null;
}

export function validateCode(code: string): string | null {
  if (!code.trim()) return 'Code is required';
  if (code.trim().length > 50) return 'Code is too long';
  if (!CODE_PATTERN.test(code.trim())) {
    return 'Code must contain only letters, numbers, hyphens, and underscores';
  }
  return null;
}

export function validateGstNumber(gst: string): string | null {
  if (!gst.trim()) return null;
  if (gst.trim().length !== GST_LENGTH) return `GST number must be exactly ${GST_LENGTH} characters`;
  return null;
}

export function validateLegalName(legalName: string): string | null {
  if (legalName.trim().length > LEGAL_NAME_MAX_LENGTH) return 'Legal name is too long';
  return null;
}

export function validatePan(pan: string): string | null {
  const value = pan.trim().toUpperCase();
  if (!value) return null;
  if (!PAN_PATTERN.test(value)) return 'PAN must be in the format AAAAA9999A';
  return null;
}

export function validateTan(tan: string): string | null {
  const value = tan.trim().toUpperCase();
  if (!value) return null;
  if (!TAN_PATTERN.test(value)) return 'TAN must be in the format AAAA99999A';
  return null;
}

export function validateRegistrationCode(code: string, label: string, maxLength: number): string | null {
  const value = code.trim();
  if (!value) return null;
  if (value.length > maxLength) return `${label} must be at most ${maxLength} characters`;
  if (!REGISTRATION_CODE_PATTERN.test(value)) {
    return `${label} must contain only letters, numbers, spaces, hyphens, and slashes`;
  }
  return null;
}

export function validateRegisteredState(state: string): string | null {
  if (state.trim().length > REGISTERED_STATE_MAX_LENGTH) return 'Registered state is too long';
  return null;
}

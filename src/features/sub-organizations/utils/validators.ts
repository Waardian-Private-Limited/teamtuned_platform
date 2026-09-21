import { GST_LENGTH } from '../constants/sub-organizations.constants';

const CODE_PATTERN = /^[a-zA-Z0-9_-]+$/;

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

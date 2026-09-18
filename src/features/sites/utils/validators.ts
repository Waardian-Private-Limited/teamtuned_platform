import type { SiteFormInput } from '../types/sites.model';

export function validateSiteName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Site name is required';
  if (trimmed.length > 150) return 'Site name is too long';
  return null;
}

export function validateSiteCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return 'Site code is required';
  if (trimmed.length > 50) return 'Site code is too long';
  return null;
}

export function validateExpiryDate(input: SiteFormInput): string | null {
  if (!input.hasExpiry) return null;
  if (!input.expiryDate) return 'Expiry date is required when expiry is enabled';
  const expiry = new Date(`${input.expiryDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (expiry < today) return 'Expiry date must be in the future';
  return null;
}

export function validateBudgetAmount(input: SiteFormInput): string | null {
  if (!input.hasBudget) return null;
  const value = input.budgetAmount.trim();
  if (!value) return 'Total budget is required when budget tracking is enabled';
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return 'Budget amount must be a positive number';
  return null;
}

export function validateOptionalAmount(value: string, label: string): string | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return `${label} must be a valid amount`;
  return null;
}

export function validateGeofence(input: SiteFormInput): string | null {
  const hasLat = input.latitude.trim() !== '';
  const hasLng = input.longitude.trim() !== '';
  if (hasLat !== hasLng) return 'Provide both latitude and longitude, or leave both empty';
  if (hasLat) {
    if (!Number.isFinite(Number(input.latitude))) return 'Latitude must be a valid number';
    if (!Number.isFinite(Number(input.longitude))) return 'Longitude must be a valid number';
  }
  return null;
}

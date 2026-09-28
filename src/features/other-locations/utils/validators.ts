import type { OtherLocationFormInput } from '../types/otherLocations.model';

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Location name is required';
  if (trimmed.length > 255) return 'Location name is too long';
  return null;
}

// Coordinates are mandatory — a location without a fix cannot geofence a punch.
export function validateCoordinate(value: string, label: 'Latitude' | 'Longitude'): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required`;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return `${label} must be a valid number`;
  if (label === 'Latitude' && (num < -90 || num > 90)) return 'Latitude must be between -90 and 90';
  if (label === 'Longitude' && (num < -180 || num > 180)) return 'Longitude must be between -180 and 180';
  return null;
}

export function validateForm(input: OtherLocationFormInput): { field: 'location_name' | 'latitude' | 'longitude'; message: string } | null {
  const nameError = validateName(input.name);
  if (nameError) return { field: 'location_name', message: nameError };
  const latError = validateCoordinate(input.latitude, 'Latitude');
  if (latError) return { field: 'latitude', message: latError };
  const lngError = validateCoordinate(input.longitude, 'Longitude');
  if (lngError) return { field: 'longitude', message: lngError };
  return null;
}

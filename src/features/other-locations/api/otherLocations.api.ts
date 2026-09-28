import { apiClient } from '@/lib/apiClient';
import type { OtherLocationListResponseDto, OtherLocationResponseDto } from '../types/otherLocations.dto';
import type { OtherLocationFormInput } from '../types/otherLocations.model';

export interface OtherLocationUpsertInput {
  location_name: string;
  location_type: string;
  status: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
}

export function listOtherLocations() {
  return apiClient.get<OtherLocationListResponseDto>('/other-locations', {}, { withAuth: true });
}

export function createOtherLocation(input: OtherLocationUpsertInput) {
  return apiClient.post<OtherLocationResponseDto>('/other-locations', input, { withAuth: true });
}

export function updateOtherLocation(id: number, input: OtherLocationUpsertInput) {
  return apiClient.put<OtherLocationResponseDto>(`/other-locations/${id}`, input, { withAuth: true });
}

export function updateOtherLocationStatus(id: number, status: string) {
  return apiClient.patch<OtherLocationResponseDto>(`/other-locations/${id}/status`, { status }, { withAuth: true });
}

export function deleteOtherLocation(id: number) {
  return apiClient.delete<{ success: boolean }>(`/other-locations/${id}`, { withAuth: true });
}

export function toUpsertInput(form: OtherLocationFormInput): OtherLocationUpsertInput {
  const toNum = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  };
  const radius = Number(form.radius);
  return {
    location_name: form.name.trim(),
    location_type: form.type,
    status: form.status,
    address: form.address.trim() || null,
    latitude: toNum(form.latitude),
    longitude: toNum(form.longitude),
    radius: Number.isFinite(radius) && radius > 0 ? radius : 100,
  };
}

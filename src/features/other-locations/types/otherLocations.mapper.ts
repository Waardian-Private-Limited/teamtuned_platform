import type { OtherLocationDto, OtherLocationListResponseDto } from './otherLocations.dto';
import type { OtherLocation } from './otherLocations.model';

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function toOtherLocation(dto: OtherLocationDto): OtherLocation {
  return {
    id: dto.id,
    name: dto.location_name,
    type: dto.location_type || 'other',
    address: dto.address,
    latitude: toNumber(dto.latitude),
    longitude: toNumber(dto.longitude),
    radius: toNumber(dto.radius) ?? 100,
    status: dto.status === 'inactive' ? 'inactive' : 'active',
    assignedCount: Number(dto.assigned_count || 0),
    createdByName: dto.created_by_name ?? null,
    createdAt: dto.created_at ?? null,
    updatedAt: dto.updated_at ?? null,
  };
}

export function toOtherLocationList(dto: OtherLocationListResponseDto): OtherLocation[] {
  return (dto.locations || []).map(toOtherLocation);
}

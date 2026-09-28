export type OtherLocationType = 'home' | 'client' | 'field' | 'other';

export interface OtherLocationDto {
  id: number;
  location_name: string;
  location_type: OtherLocationType;
  address: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  radius: number | null;
  status: 'active' | 'inactive';
  created_by: number | null;
  created_by_name?: string | null;
  assigned_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OtherLocationListResponseDto {
  locations: OtherLocationDto[];
}

export interface OtherLocationResponseDto {
  location: OtherLocationDto;
}

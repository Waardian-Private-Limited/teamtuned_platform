import type { OtherLocationType } from './otherLocations.dto';

export type { OtherLocationType };
export type OtherLocationStatus = 'active' | 'inactive';

export interface OtherLocation {
  id: number;
  name: string;
  type: OtherLocationType;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  status: OtherLocationStatus;
  assignedCount: number;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface OtherLocationFormInput {
  name: string;
  type: OtherLocationType;
  status: OtherLocationStatus;
  address: string;
  latitude: string;
  longitude: string;
  radius: string;
}

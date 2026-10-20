// UI-facing types. jobCatalogs.mapper.ts is the only place these meet the
// wire DTOs (jobCatalogs.dto.ts).

export type CatalogKind = 'grades' | 'cost-centres';
export type CatalogStatus = 'active' | 'inactive';
export type CatalogField = 'name' | 'code' | 'display_order' | 'id';

export interface CatalogItem {
  id: number;
  subOrganizationId: number | null;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  status: CatalogStatus;
  employeeCount: number;
}

export interface CatalogFormInput {
  name: string;
  code: string;
  description: string;
  displayOrder: string;
  status: CatalogStatus;
  subOrganizationId: number | null;
}

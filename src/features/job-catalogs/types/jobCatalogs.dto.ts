// Wire shapes returned by /api/v1/grades and /api/v1/cost-centres — both
// catalogs share one backend module (teamtuned_backend/src/modules/job-catalogs).

export interface CatalogItemDto {
  id: number;
  sub_organization_id: number | null;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  employee_count: number;
}

export interface CatalogListResponseDto {
  items: CatalogItemDto[];
}

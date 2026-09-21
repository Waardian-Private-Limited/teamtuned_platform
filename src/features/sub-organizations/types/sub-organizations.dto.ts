export interface SubOrganizationDto {
  id: number;
  organization_id: number;
  name: string;
  code: string;
  address: string | null;
  gst_number: string | null;
  logo_url: string | null;
  is_primary: number;
  status: 'active' | 'inactive';
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SubOrganizationListResponseDto {
  sub_organizations: SubOrganizationDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

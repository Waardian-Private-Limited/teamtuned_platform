export type SubOrganizationStatus = 'active' | 'inactive';

export interface SubOrganization {
  id: number;
  name: string;
  code: string;
  address: string;
  gstNumber: string;
  logoUrl: string;
  isPrimary: boolean;
  status: SubOrganizationStatus;
}

export interface SubOrganizationListResult {
  subOrganizations: SubOrganization[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface SubOrganizationFormInput {
  name: string;
  code: string;
  address: string;
  gstNumber: string;
  logoUrl: string;
  status: SubOrganizationStatus;
}

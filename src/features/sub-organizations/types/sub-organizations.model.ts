export type SubOrganizationStatus = 'active' | 'inactive';

export interface SubOrganization {
  id: number;
  name: string;
  legalName: string;
  code: string;
  address: string;
  gstNumber: string;
  pan: string;
  tan: string;
  pfEstablishmentCode: string;
  esiEmployerCode: string;
  ptRegistrationNo: string;
  lwfRegistrationNo: string;
  registeredState: string;
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
  legalName: string;
  code: string;
  address: string;
  gstNumber: string;
  pan: string;
  tan: string;
  pfEstablishmentCode: string;
  esiEmployerCode: string;
  ptRegistrationNo: string;
  lwfRegistrationNo: string;
  registeredState: string;
  logoUrl: string;
  status: SubOrganizationStatus;
}

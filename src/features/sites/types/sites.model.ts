export type SiteStatus = 'active' | 'inactive';

export interface Site {
  id: number;
  name: string;
  code: string;
  address: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: SiteStatus;
  isHeadOffice: boolean;
  hasExpiry: boolean;
  expiryDate: string | null;
  hasBudget: boolean;
  budgetAmount: number | null;
  budgetUsed: number;
  finalBudgetAllocated: number | null;
  actualBudgetApproved: number | null;
  remainingFinalBudgetAllocated: number | null;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SiteListResult {
  sites: Site[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface SiteFormInput {
  name: string;
  code: string;
  status: SiteStatus;
  address: string;
  pincode: string;
  city: string;
  state: string;
  country: string;
  isHeadOffice: boolean;
  hasExpiry: boolean;
  expiryDate: string;
  hasBudget: boolean;
  budgetAmount: string;
  finalBudgetAllocated: string;
  actualBudgetApproved: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
}

export interface BudgetConsumption {
  id: number;
  employeeId: number;
  employeeName: string;
  designation: string | null;
  amount: number;
  createdAt: string;
}

export interface SiteBudgetStats {
  budget: number;
  used: number;
  remaining: number;
  finalAllocated: number;
  actualApproved: number;
  remainingFinal: number;
}

export interface SiteBudgetUsage {
  siteName: string;
  stats: SiteBudgetStats;
  active: BudgetConsumption[];
  activeTotal: number;
  activePage: number;
  activePages: number;
  activePageSize: number;
}

export interface SiteIncharge {
  id: number;
  employeeId: number;
  siteId: number;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  isIncharge: boolean;
}

export interface SiteInchargeCandidate {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  departmentName: string | null;
}


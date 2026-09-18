export interface SiteDto {
  id: number;
  name: string;
  code: string;
  address_line: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: 'active' | 'inactive';
  is_head_office: number;
  has_expiry: number;
  expiry_date: string | null;
  has_budget: number;
  budget_amount: string | number | null;
  budget_used: string | number | null;
  final_budget_allocated: string | number | null;
  actual_budget_approved: string | number | null;
  remaining_final_budget_allocated: string | number | null;
  latitude: string | number | null;
  longitude: string | number | null;
  radius_meters: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SiteListResponseDto {
  sites: SiteDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface SiteResponseDto {
  site: SiteDto;
}

export interface BudgetConsumptionDto {
  id: number;
  employee_id: number;
  amount: string | number;
  status: 'active' | 'released';
  created_at: string;
  released_at: string | null;
  first_name: string | null;
  last_name: string | null;
  designation: string | null;
  emp_code: number;
}

export interface BudgetLedgerRowDto {
  month_year: string;
  final_budget_allocated: string | number;
  actual_budget_approved: string | number;
  total_budget: string | number;
  used_budget: string | number;
  remaining_budget: string | number;
  remaining_final_budget_allocated: string | number;
  snapshot_at: string;
}

export interface BudgetUsagePaginationDto {
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface SiteBudgetUsageDto {
  site: Pick<
    SiteDto,
    | 'id'
    | 'name'
    | 'has_budget'
    | 'budget_amount'
    | 'budget_used'
    | 'final_budget_allocated'
    | 'actual_budget_approved'
    | 'remaining_final_budget_allocated'
  >;
  active: BudgetConsumptionDto[];
  history: BudgetConsumptionDto[];
  ledger: BudgetLedgerRowDto[];
  stats: {
    budget: number;
    used: number;
    remaining: number;
    final_allocated: number;
    actual_approved: number;
    remaining_final: number;
  };
  pagination: {
    active: BudgetUsagePaginationDto;
    history: BudgetUsagePaginationDto;
    ledger: BudgetUsagePaginationDto;
  };
}

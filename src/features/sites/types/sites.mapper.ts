import type { SiteBudgetUsageDto, SiteDto, SiteListResponseDto } from './sites.dto';
import type { BudgetConsumption, Site, SiteBudgetUsage, SiteIncharge, SiteInchargeCandidate, SiteListResult } from './sites.model';

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toDateOnly(value: string | null): string | null {
  if (!value) return null;
  return String(value).includes('T') ? String(value).split('T')[0] : String(value).slice(0, 10);
}

export function toSite(dto: SiteDto): Site {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    address: dto.address_line,
    pincode: dto.pincode,
    city: dto.city,
    state: dto.state,
    country: dto.country,
    status: dto.status === 'inactive' ? 'inactive' : 'active',
    isHeadOffice: Boolean(dto.is_head_office),
    hasExpiry: Boolean(dto.has_expiry),
    expiryDate: toDateOnly(dto.expiry_date),
    hasBudget: Boolean(dto.has_budget),
    budgetAmount: toNumber(dto.budget_amount),
    budgetUsed: toNumber(dto.budget_used) ?? 0,
    finalBudgetAllocated: toNumber(dto.final_budget_allocated),
    actualBudgetApproved: toNumber(dto.actual_budget_approved),
    remainingFinalBudgetAllocated: toNumber(dto.remaining_final_budget_allocated),
    latitude: toNumber(dto.latitude),
    longitude: toNumber(dto.longitude),
    radiusMeters: dto.radius_meters ?? null,
    createdAt: dto.created_at ?? null,
    updatedAt: dto.updated_at ?? null,
  };
}

export function toSiteList(dto: SiteListResponseDto): SiteListResult {
  return {
    sites: (dto.sites || []).map(toSite),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
  };
}

function toConsumption(dto: SiteBudgetUsageDto['active'][number]): BudgetConsumption {
  return {
    id: dto.id,
    employeeId: dto.employee_id,
    employeeName: [dto.first_name, dto.last_name].filter(Boolean).join(' ') || `#${dto.emp_code}`,
    designation: dto.designation,
    amount: toNumber(dto.amount) ?? 0,
    createdAt: dto.created_at,
  };
}

export function toSiteBudgetUsage(dto: SiteBudgetUsageDto): SiteBudgetUsage {
  return {
    siteName: dto.site?.name ?? '',
    stats: {
      budget: Number(dto.stats?.budget || 0),
      used: Number(dto.stats?.used || 0),
      remaining: Number(dto.stats?.remaining || 0),
      finalAllocated: Number(dto.stats?.final_allocated || 0),
      actualApproved: Number(dto.stats?.actual_approved || 0),
      remainingFinal: Number(dto.stats?.remaining_final || 0),
    },
    active: (dto.active || []).map(toConsumption),
    activeTotal: dto.pagination?.active?.total ?? 0,
    activePage: dto.pagination?.active?.page ?? 1,
    activePages: dto.pagination?.active?.pages ?? 0,
    activePageSize: dto.pagination?.active?.pageSize ?? 10,
  };
}

export function toSiteIncharge(dto: any): SiteIncharge {
  const employeeId = Number(dto.employee_id ?? dto.employeeId ?? dto.id);
  return {
    id: employeeId,
    employeeId,
    siteId: Number(dto.site_id ?? dto.siteId),
    name: [dto.first_name, dto.last_name].filter(Boolean).join(' ') || dto.name || '',
    email: dto.email ?? null,
    phoneNumber: dto.phone_number ?? dto.phone ?? null,
    isIncharge: Boolean(dto.is_incharge ?? dto.isIncharge),
  };
}

export function toSiteIncharges(dto: { incharges?: any[] }): SiteIncharge[] {
  return (dto?.incharges || []).map(toSiteIncharge);
}

export function toInchargeCandidates(candidates: any[]): SiteInchargeCandidate[] {
  return (candidates || []).map((c) => ({
    id: c.id,
    name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '',
    email: c.email ?? null,
    phone: c.phone ?? c.phone_number ?? null,
    designation: c.designation ?? null,
    departmentName: c.department_name ?? c.departmentName ?? null,
  }));
}


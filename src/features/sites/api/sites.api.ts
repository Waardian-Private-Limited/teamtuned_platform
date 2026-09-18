import { apiClient } from '@/lib/apiClient';
import type {
  SiteBudgetUsageDto,
  SiteListResponseDto,
  SiteResponseDto,
} from '../types/sites.dto';

interface ListParams {
  search?: string;
  status?: string;
  city?: string;
  hq?: boolean;
  page?: number;
  pageSize?: number;
}

export interface SiteUpsertInput {
  name: string;
  code: string;
  status: string;
  address: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_head_office: boolean;
  has_expiry: boolean;
  expiry_date: string | null;
  has_budget: boolean;
  budget_amount: number | null;
  final_budget_allocated: number | null;
  actual_budget_approved: number | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number | null;
}

export function listSites(params: ListParams = {}) {
  return apiClient.get<SiteListResponseDto>(
    '/sites',
    {
      search: params.search || undefined,
      status: params.status && params.status !== 'all' ? params.status : undefined,
      city: params.city || undefined,
      hq: params.hq ? '1' : undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    { withAuth: true }
  );
}

export function createSite(input: SiteUpsertInput) {
  return apiClient.post<SiteResponseDto>('/sites', input, { withAuth: true });
}

export function updateSite(id: number, input: SiteUpsertInput) {
  return apiClient.put<SiteResponseDto>(`/sites/${id}`, input, { withAuth: true });
}

export function updateSiteStatus(id: number, status: string) {
  return apiClient.patch<SiteResponseDto>(`/sites/${id}/status`, { status }, { withAuth: true });
}

export function deleteSite(id: number) {
  return apiClient.delete<{ success: boolean }>(`/sites/${id}`, { withAuth: true });
}

export function listSiteIncharges(siteId: number) {
  return apiClient.get<{ incharges: any[] }>(`/sites/${siteId}/incharges`, {}, { withAuth: true });
}

export function listInchargeCandidates(search: string = '') {
  return apiClient.get<{ candidates: any[] }>(
    '/sites/incharges/candidates',
    { search: search || undefined },
    { withAuth: true }
  );
}

export function assignSiteIncharge(siteId: number, employeeId: number) {
  return apiClient.post<{ success: boolean }>(
    `/sites/${siteId}/incharges`,
    { employee_id: employeeId },
    { withAuth: true }
  );
}

export function removeSiteIncharge(siteId: number, employeeId: number) {
  return apiClient.delete<{ success: boolean }>(
    `/sites/${siteId}/incharges/${employeeId}`,
    { withAuth: true }
  );
}

export function getSiteBudgetUsage(id: number, activePage: number, activePageSize: number) {
  return apiClient.get<SiteBudgetUsageDto>(
    `/sites/${id}/budget-usage`,
    {
      activePage,
      activePageSize,
      historyPage: 1,
      historyPageSize: 1,
      ledgerPage: 1,
      ledgerPageSize: 1,
    },
    { withAuth: true }
  );
}

export function siteToUpsertInput(form: {
  name: string;
  code: string;
  status: string;
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
}): SiteUpsertInput {
  const toNullableNumber = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  };
  const latitude = toNullableNumber(form.latitude);
  const longitude = toNullableNumber(form.longitude);
  return {
    name: form.name.trim(),
    code: form.code.trim(),
    status: form.status,
    address: form.address.trim() || null,
    pincode: form.pincode.trim() || null,
    city: form.city.trim() || null,
    state: form.state.trim() || null,
    country: form.country.trim() || null,
    is_head_office: form.isHeadOffice,
    has_expiry: form.hasExpiry,
    expiry_date: form.hasExpiry && form.expiryDate ? form.expiryDate : null,
    has_budget: form.hasBudget,
    budget_amount: form.hasBudget ? toNullableNumber(form.budgetAmount) : null,
    final_budget_allocated: form.hasBudget ? toNullableNumber(form.finalBudgetAllocated) : null,
    actual_budget_approved: form.hasBudget ? toNullableNumber(form.actualBudgetApproved) : null,
    latitude,
    longitude,
    radius_meters: latitude !== null && longitude !== null ? toNullableNumber(form.radiusMeters) ?? 200 : null,
  };
}

export async function lookupPincode(pincode: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    const entry = Array.isArray(data) ? data[0] : null;
    if (entry?.Status === 'Success' && entry?.PostOffice?.[0]) {
      return {
        city: entry.PostOffice[0].District || '',
        state: entry.PostOffice[0].State || '',
      };
    }
  } catch {
    return null;
  }
  return null;
}

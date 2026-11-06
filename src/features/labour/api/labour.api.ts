import { apiClient } from '@/lib/apiClient';
import type {
  LabourTimings, SiteTimingsResponse,
  ComplianceGaps,
  Officer,
  CompliancePack, CompliancePreset, FormCatalogue, FormTemplate, PackDetail, TemplateSummary,
  Adjustment, AttendanceDay, BillingUsage, Category, Contractor, ContractorRate, Dashboard, Device, DeviceDetail, DeviceEvent,
  ImportBody, ImportCandidate, RejectedPunchPage, ImportManyBody, ImportManyResult, Invoice, LabourSettings, Labourer, LabourerBody, LabourerDetail, LookupPerson, MergePreview, Paged, PlanVersion, Punch, RegAction,
  RegularizationLog, SettingsResponse,
  BulkApproveResult, Measurement, MeasurementBody, MeasurementDetail, MeasurementPage, Payable, PaySuggestion, PersonalRateBody,
  PersonalRatesResponse, WorkItem, WorkItemBody, WorkItemDetail, WorkItemOverride, WorkItemRate,
} from '../types/labour.types';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';

export interface AttendanceExportRequest {
  exportType: 'daily' | 'month' | 'date_range';
  format: 'excel' | 'pdf';
  date?: string;
  month?: string;
  from?: string;
  to?: string;
  siteId?: number | null;
  contractorId?: number | null;
  categoryId?: number | null;
  subcategoryId?: number | null;
  status?: 'present' | 'absent' | 'missed_out' | 'active' | 'completed' | null;
  search?: string | null;
}

const auth = { withAuth: true };
const B = '/labour';
type Params = Record<string, string | number | boolean | undefined | null>;
const get = <T>(path: string, params?: Params) => apiClient.get<T>(`${B}${path}`, params, auth);
const post = <T>(path: string, body?: unknown) => apiClient.post<T>(`${B}${path}`, body ?? {}, auth);
const put = <T>(path: string, body?: unknown) => apiClient.put<T>(`${B}${path}`, body ?? {}, auth);
const del = <T>(path: string) => apiClient.delete<T>(`${B}${path}`, auth);
export type ListQuery = Params & { page?: number; pageSize?: number };

// sites the signed-in user may pick: every site (`all`) for org admin / HR mode, else only their own
export interface LabourSite { id: number; name: string; code: string | null; isHeadOffice: boolean }
export const getOfficers = (search: string) => get<{ items: Officer[] }>('/officers', { search: search || undefined });
export const getLabourSites = () => get<{ all: boolean; primarySiteId?: number | null; sites: LabourSite[] }>('/sites');

// settings
export const getSettings = (subOrganizationId?: number | null) => get<SettingsResponse>('/settings', { subOrganizationId });
export const saveSettings = (settings: LabourSettings, subOrganizationId?: number | null) =>
  apiClient.put<unknown>(`${B}/settings`, settings, { ...auth, params: { subOrganizationId: subOrganizationId ?? undefined } });
export const deleteSettingsOverride = (subOrgId: number) => del(`/settings/overrides/${subOrgId}`);
// each site's labour clock (its own override, else the organization default)
export const getSiteTimings = () => get<SiteTimingsResponse>('/site-timings');
export const saveSiteTimings = (siteId: number, body: LabourTimings) => put<{ siteId: number; timings: LabourTimings }>(`/site-timings/${siteId}`, body);
export const resetSiteTimings = (siteId: number) => del(`/site-timings/${siteId}`);

// catalog
export const getCatalog = (includeInactive = false) => get<{ categories: Category[] }>('/catalog', { includeInactive: includeInactive || undefined });
export const createCategory = (b: { name: string; code?: string }) => post('/categories', b);
export const updateCategory = (id: number, b: { name?: string; code?: string; isActive?: boolean }) => put(`/categories/${id}`, b);
export const createSubcategory = (b: { categoryId: number; name: string; skillLevel?: string }) => post('/subcategories', b);
export const updateSubcategory = (id: number, b: { name?: string; skillLevel?: string; isActive?: boolean }) => put(`/subcategories/${id}`, b);

// contractors
export const listContractors = (q: ListQuery) => get<Paged<Contractor>>('/contractors', q);
export const getContractor = (id: number) => get<Contractor>(`/contractors/${id}`);
export const saveContractor = (id: number | null, body: unknown) => (id ? put<{ id: number }>(`/contractors/${id}`, body) : post<{ id: number }>('/contractors', body));
export const listRates = (id: number, history: boolean) => get<{ rates: ContractorRate[] }>(`/contractors/${id}/rates`, { history: history || undefined });
export const setRates = (id: number, body: { effectiveFrom?: string; rates: unknown[] }) => put<{ changed: number; rates: ContractorRate[] }>(`/contractors/${id}/rates`, body);
export const mergePreview = (id: number, body: { targetId: number; rateMode: string }) => post<MergePreview>(`/contractors/${id}/merge/preview`, body);
export const mergeContractor = (id: number, body: { targetId: number; rateMode: string }) => post(`/contractors/${id}/merge`, body);

function upload(path: string, fields: Record<string, string | undefined>, file: File) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => v && fd.append(k, v));
  fd.append('file', file);
  return apiClient.post(`${B}${path}`, fd, auth);
}
export const uploadContractorDoc = (id: number, f: { docType: string; title?: string; expiryOn?: string }, file: File) => upload(`/contractors/${id}/documents`, f, file);
export const contractorDocLink = (id: number, docId: number) => get<{ url: string }>(`/contractors/${id}/documents/${docId}/link`);
export const deleteContractorDoc = (id: number, docId: number) => del(`/contractors/${id}/documents/${docId}`);

// labourers
export const listLabourers = (q: ListQuery) => get<Paged<Labourer>>('/labourers', q);
export const getLabourer = (id: number) => get<LabourerDetail>(`/labourers/${id}`);
export const createLabourer = (b: LabourerBody) => post<{ id: number; code: string }>('/labourers', b);
export const updateLabourer = (id: number, b: Partial<LabourerBody>) => put<{ ok: true; complianceGaps?: ComplianceGaps | null }>(`/labourers/${id}`, b);
export const deleteLabourer = (id: number) => del(`/labourers/${id}`);
// import a registered labourer into a contractor at another site (same person, own contractor / rates / days)
export const lookupLabourers = (q: string) => get<{ items: LookupPerson[] }>('/labourers/lookup', { q });
export const importLabourer = (id: number, b: ImportBody) => post<{ id: number; code: string; siteId: number; contractorId: number; linkedFromId: number }>(`/labourers/${id}/import`, b);
/** Several labourers into one contractor at one site, at most IMPORT_MANY_MAX per call; one result per person. */
export const importLabourers = (b: ImportManyBody) => post<ImportManyResult>('/labourers/import-many', b);
export const IMPORT_MANY_MAX = 50;
/** Import picker, whole organization (not the user's site scope): sites to import from, and one site's importable labour. */
export const importSourceSites = () => get<{ sites: Array<{ id: number; name: string; code: string | null }> }>('/labourers/import-sites');
export const importCandidates = (q: { siteId: number; search?: string; page?: number; pageSize?: number }) => get<Paged<ImportCandidate>>('/labourers/import-candidates', q);
export function enrolFace(id: number, shots: Array<{ pose: string; file: File }>) {
  const fd = new FormData();
  shots.forEach((s) => fd.append('images', s.file));
  shots.forEach((s) => fd.append('poses', s.pose));
  return apiClient.put<{ status: 'enrolled' | 'pending' }>(`${B}/labourers/${id}/face`, fd, auth);
}
export const uploadLabourerDoc = (id: number, f: { docType: string; side: string; number?: string; expiryOn?: string }, file: File) => upload(`/labourers/${id}/documents`, f, file);
export const labourerDocLink = (id: number, docId: number) => get<{ url: string }>(`/labourers/${id}/documents/${docId}/link`);
export const deleteLabourerDoc = (id: number, docId: number) => del(`/labourers/${id}/documents/${docId}`);

// attendance
export const getDashboard = (q: Params) => get<Dashboard>('/dashboard', q);
export const listDays = (q: ListQuery) => get<Paged<AttendanceDay>>('/days', q);
export const listPunches = (labourerId: number, workDate: string) => get<{ punches: Punch[]; registeredPhotoUrl?: string | null }>('/punches', { labourerId, workDate });
/** Queues the attendance report (v1 export options) in the Download Centre. */
export const exportAttendance = (body: AttendanceExportRequest) => apiClient.post<ExportJobDto>('/exports/labour-attendance', body, auth);
export const listOpenDays = (q: ListQuery) => get<Paged<AttendanceDay>>('/regularizations/open', q);
export const listRegularizations = (q: ListQuery) => get<Paged<RegularizationLog>>('/regularizations', q);
export const regularize = (b: { action: RegAction | 'remove_punch' | 'set_hajri'; labourerId: number; workDate: string; inTime?: string; outTime?: string; punchId?: number; hajri?: number | null; reason: string }) => post('/regularizations', b);
/** Sets (or with null clears) the day's hajri units; flag `allowSetHajri`. */
export const setDayHajri = (b: { labourerId: number; workDate: string; hajri: number | null; reason: string }) =>
  post<{ ok: boolean; day: { workDate: string; workedMinutes: number; hajri: number; hajriOverridden: boolean; payBasis: string | null; hajriRate: number | null; hajriAmount: number | null } }>('/regularizations', { action: 'set_hajri', ...b });

// devices
export const listDevices = (q: Params) => get<{ devices: Device[] }>('/devices', q);
export const getDevice = (id: number, hours = 48) => get<DeviceDetail>(`/devices/${id}`, { hours });
export const listDeviceEvents = (q: ListQuery) => get<Paged<DeviceEvent>>('/devices/events', q);
export const renameDevice = (id: number, name: string) => put(`/devices/${id}`, { name });
export const revokeDevice = (id: number) => post(`/devices/${id}/revoke`);
/** Reactivates a revoked machine; it signs in again with a site login. */
export const restoreDevice = (id: number) => post(`/devices/${id}/restore`);
export const resyncDevice = (id: number) => post(`/devices/${id}/resync`);

// billing (organization, read only)
/** A whole month ('YYYY-MM') or any from/to dates. */
export interface BillingPeriod { month?: string; from?: string; to?: string }
export const getUsage = (period: BillingPeriod) => get<BillingUsage>('/billing/usage', { ...period });
export const listInvoices = (q: ListQuery) => get<Paged<Invoice> | { invoices: Invoice[] } | Invoice[]>('/billing/invoices', q);
export const getInvoice = (id: number) => get<Invoice | { invoice: Invoice }>(`/billing/invoices/${id}`);
export const listPlans = () => get<unknown>('/billing/plans');

// compliance
export const getCatalogueForForms = () => get<FormCatalogue>('/compliance/catalogue');
export const listTemplates = (includeInactive = false) => get<{ templates: TemplateSummary[] }>('/compliance/templates', { includeInactive: includeInactive || undefined });
export const getTemplate = (id: number) => get<FormTemplate>(`/compliance/templates/${id}`);
export const saveTemplate = (id: number | null, body: FormTemplate) => (id ? put<unknown>(`/compliance/templates/${id}`, body) : post<{ id: number }>('/compliance/templates', body));
export const deactivateTemplate = (id: number) => del(`/compliance/templates/${id}`);
export const listPresets = () => get<{ presets: CompliancePreset[] }>('/compliance/presets');
export const installPreset = (key: string, siteIds: number[]) => post<{ packId: number; templatesCreated: number; packCreated: boolean }>(`/compliance/presets/${key}/install`, { siteIds });
export const upgradePreset = (key: string) => post<{ packId: number; templatesCreated: number; templatesUpdated: number; fieldsAdded: number; packCreated: boolean }>(`/compliance/presets/${key}/upgrade`);
export const listPacks = (includeInactive = false) => get<{ packs: PackDetail[] }>('/compliance/packs', { includeInactive: includeInactive || undefined });
export const getPack = (id: number) => get<PackDetail>(`/compliance/packs/${id}`);
export const savePack = (id: number | null, body: Omit<PackDetail, 'id'>) => (id ? put<unknown>(`/compliance/packs/${id}`, body) : post<{ id: number }>('/compliance/packs', body));
export const deactivatePack = (id: number) => del(`/compliance/packs/${id}`);
export const packForSite = (siteId: number) => get<{ pack: CompliancePack | null }>('/compliance/pack-for-site', { siteId });

/** PDFs need the bearer token, so they are fetched as blobs. */
const blob = (path: string, init: { method?: 'GET' | 'POST'; body?: unknown; params?: Params }) =>
  apiClient<Blob>(`${B}${path}`, { ...auth, ...init, responseType: 'blob' });
export const templatePreviewPdf = (id: number) => blob(`/compliance/templates/${id}/preview`, {});
/** Labourer form PDFs are Download Centre jobs: queue here, then `track(job)` from the downloads context. */
export interface LabourFormsExportBody { labourerIds: number[]; templateIds?: number[]; attachments?: boolean; layout?: 'combined' | 'separate' }
export interface FormsPlanGroup { packId: number; packName: string; clientLabel: string | null; siteIds: number[]; forms: Array<{ id: number; name: string }>; labourerIds: number[] }
export interface WithoutPackLabourer { labourerId: number; code: string | null; name: string; siteId: number; siteName: string }
export interface FormsPlan { groups: FormsPlanGroup[]; withoutPack: WithoutPackLabourer[] }
export const getFormsPlan = (labourerIds: number[]) => get<FormsPlan>('/compliance/forms-plan', { labourerIds: labourerIds.join(',') });
export const requestFormsExport = (body: LabourFormsExportBody) => apiClient.post<ExportJobDto>('/exports/labour-forms', body, auth);

// labour pay: personal rates, suggestion
export const listPersonalRates = (labourerId: number) => get<PersonalRatesResponse>(`/labourers/${labourerId}/rates`);
export const setPersonalRate = (labourerId: number, body: PersonalRateBody) => put<PersonalRatesResponse & { changed: number }>(`/labourers/${labourerId}/rates`, body);
/** Back to the contractor rate from `effectiveFrom` (default today). */
export const endPersonalRate = (labourerId: number, effectiveFrom?: string) =>
  del<PersonalRatesResponse & { ok: boolean; removed: boolean; effectiveTo: string | null }>(`/labourers/${labourerId}/rates${effectiveFrom ? `?effectiveFrom=${encodeURIComponent(effectiveFrom)}` : ''}`);
export const paySuggest = (q: { contractorId?: number | null; siteId?: number | null; categoryId?: number | null; subcategoryId?: number | null; labourerId?: number | null; date?: string }) =>
  get<PaySuggestion>('/pay/suggest', {
    contractorId: q.contractorId ?? undefined, siteId: q.siteId ?? undefined, labourerId: q.labourerId ?? undefined, date: q.date,
    // With a labourer, an empty category means "none" (absent would mean "the labourer's own").
    categoryId: q.categoryId ?? (q.labourerId ? '' : undefined), subcategoryId: q.subcategoryId ?? (q.labourerId ? '' : undefined),
  });

// measurement book: work items
export const listWorkItems = (q: ListQuery) => get<Paged<WorkItem> & { units?: string[] }>('/work-items', q);
export const getWorkItem = (id: number) => get<WorkItemDetail>(`/work-items/${id}`);
export const createWorkItem = (b: WorkItemBody) => post<{ id: number }>('/work-items', b);
export const updateWorkItem = (id: number, b: WorkItemBody) => put<{ ok: boolean }>(`/work-items/${id}`, b);
export const listWorkItemRates = (id: number, history: boolean) => get<{ rates: WorkItemOverride[] }>(`/work-items/${id}/rates`, { history: history || undefined });
export const setWorkItemRates = (id: number, body: { effectiveFrom?: string; rates: Array<{ siteId?: number | null; contractorId?: number | null; labourerId?: number | null; rate: number; note?: string }> }) =>
  put<{ changed: number; rates: WorkItemOverride[] }>(`/work-items/${id}/rates`, body);
export const endWorkItemRate = (id: number, rateId: number) => del<{ ok: boolean; removed: boolean; effectiveTo?: string }>(`/work-items/${id}/rates/${rateId}`);
export const workItemRate = (id: number, q: { date?: string; siteId?: number | null; contractorId?: number | null; labourerId?: number | null }) =>
  get<WorkItemRate>(`/work-items/${id}/rate`, { date: q.date, siteId: q.siteId ?? undefined, contractorId: q.contractorId ?? undefined, labourerId: q.labourerId ?? undefined });

// measurement book: entries
export const listMeasurements = (q: ListQuery) => get<MeasurementPage>('/measurements', q);
export const getMeasurement = (id: number) => get<MeasurementDetail>(`/measurements/${id}`);
export const createMeasurement = (b: MeasurementBody) => post<Measurement>('/measurements', b);
export const updateMeasurement = (id: number, b: MeasurementBody) => put<Measurement>(`/measurements/${id}`, b);
export const deleteMeasurement = (id: number) => del<{ ok: boolean }>(`/measurements/${id}`);
export const submitMeasurement = (id: number) => post<Measurement>(`/measurements/${id}/submit`);
export const approveMeasurement = (id: number) => post<Measurement>(`/measurements/${id}/approve`);
export const rejectMeasurement = (id: number, reason: string) => post<Measurement>(`/measurements/${id}/reject`, { reason });
export const bulkApproveMeasurements = (ids: number[]) => post<BulkApproveResult>('/measurements/approve', { ids });
export const uploadMeasurementSheet = (id: number, file: File) => upload(`/measurements/${id}/attachment`, {}, file);
export const measurementSheetLink = (id: number) => get<{ url: string; expires_in?: number }>(`/measurements/${id}/attachment/link`);
export const deleteMeasurementSheet = (id: number) => del<{ ok: boolean }>(`/measurements/${id}/attachment`);

// payable (owed to contractors)
export interface PayableQuery { month?: string; from?: string; to?: string; siteId?: number | null; contractorId?: number | null }
export const getPayable = (q: PayableQuery) => get<Payable>('/payable', { month: q.month, from: q.from, to: q.to, siteId: q.siteId ?? undefined, contractorId: q.contractorId ?? undefined });
/** Queues the payable report (Excel / PDF) in the Download Centre; `track(job)` it. */
export const exportPayable = (body: PayableQuery & { format: 'excel' | 'pdf' }) => apiClient.post<ExportJobDto>('/exports/labour-payable', body, auth);

// superadmin
const S = (orgId: number | string) => `/superadmin/labour-billing/${orgId}`;
const sget = <T>(orgId: number | string, path: string, params?: Params) => apiClient.get<T>(`${S(orgId)}${path}`, params, auth);
const spost = <T>(orgId: number | string, path: string, body?: unknown) => apiClient.post<T>(`${S(orgId)}${path}`, body ?? {}, auth);
export const saUsage = (orgId: number | string, period: BillingPeriod) => sget<BillingUsage>(orgId, '/usage', { ...period });
export const saPlans = (orgId: number | string) => sget<unknown>(orgId, '/plans');
export const saSavePlan = (orgId: number | string, body: unknown) => spost(orgId, '/plans', body);
export const saInvoices = (orgId: number | string, status?: string, range: { from?: string; to?: string } = {}) => sget<unknown>(orgId, '/invoices', { status, ...range });
export const saInvoice = (orgId: number | string, id: number) => sget<Invoice | { invoice: Invoice }>(orgId, `/invoices/${id}`);
export const saDraftInvoice = (orgId: number | string, period: BillingPeriod) => spost(orgId, '/invoices/draft', period);
export const saInvoiceAction = (orgId: number | string, id: number, action: 'issue' | 'pay' | 'void', body?: unknown) => spost(orgId, `/invoices/${id}/${action}`, body);
export const saAdjustments = (orgId: number | string) => sget<unknown>(orgId, '/adjustments');
export const saAddAdjustment = (orgId: number | string, body: Adjustment) => spost(orgId, '/adjustments', body);

/** Plans and adjustments may come back as an array or wrapped; normalise. */
export function asList<T>(raw: unknown, ...keys: string[]): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const o = (raw || {}) as Record<string, unknown>;
  for (const k of [...keys, 'items']) if (Array.isArray(o[k])) return o[k] as T[];
  return [];
}
export const planList = (raw: unknown) => asList<PlanVersion>(raw, 'plans', 'versions');

/** Refused machine punches with the photo (org admins only). Dates are the organization's days, at most 31. */
export const listRejectedPunches = (q: { from?: string; to?: string; reason?: string; siteId?: number | null; search?: string; page?: number; pageSize?: number }) =>
  get<RejectedPunchPage>('/rejected-punches', q);

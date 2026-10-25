import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';

const B = '/dpr';
const auth = { withAuth: true };

export type ReportKind = 'progress' | 'billing';
export type ItemKind = 'breakdown' | 'material' | 'issue' | 'action';
export type PlanStatus = 'upcoming' | 'active' | 'closed';
export type MilestoneState = 'done' | 'due' | 'overdue' | 'upcoming' | 'undated';
export type Role = 'reporter' | 'billing_reporter' | 'reviewer' | 'equipment_owner' | 'material_owner';
export type CatalogKind = 'staff' | 'labour' | 'equipment' | 'checklist' | 'document';

export interface Site { id: number; name: string; code: string | null; city: string | null }
export interface Location { id: string; name: string; kind: 'tower' | 'area'; levels: string[]; start_on?: string | null; end_on?: string | null }
export interface Person { employee_id: number; name: string; designation?: string | null; code?: string | null }

export interface Setup {
  ready: boolean; locations: Location[]; total_concrete_m3: number; opening_concrete_m3: number; report_days: string; billing_enabled: boolean;
  updated_at?: string | null; people: Record<Role, Person[]>;
}
export interface Catalog { staff: string[]; labour: string[]; equipment: string[]; checklist: string[]; document: string[] }

export interface OverviewRow {
  site: Site; ready: boolean; billing_enabled: boolean; roles: Role[]; can: { plan: boolean; progress: boolean; billing: boolean };
  plan: { id: number; valid_from: string; valid_till: string; label: string; concrete_target_m3: number } | null; expected_today: boolean;
  progress: 'draft' | 'submitted' | null; billing: 'draft' | 'submitted' | null; concrete_today_m3: number | null;
  month_poured_m3: number; month_pct: number | null; filed: number; expected: number; overdue_milestones: number; open_items: number;
}
export interface Overview {
  date: string; today: string; month_label: string; access: { admin: boolean; plan: boolean; view: boolean };
  totals: { sites: number; planned: number; due_today: number; filed_today: number; open_items: number; overdue_milestones: number };
  items: OverviewRow[];
}

export interface PlanLine { kind: 'pour' | 'staff' | 'labour' | 'equipment'; location_id: string | null; name: string | null; on_date: string | null; qty: number }
export interface Milestone {
  id: number; site_id: number; location_id: string | null; location_name?: string | null; level: string | null; activity: string; purpose?: string | null; target_on: string | null; planned_on: string | null;
  done_on: string | null; done_report_id: number | null; revisions: number; state: MilestoneState;
  /** Carried into this month: still open from an earlier month, or first targeted in one and rescheduled here. */
  carried?: { kind: 'overdue' | 'rescheduled'; from: string; first_target?: string } | null;
}
export interface PlanSettings { concrete_mode: 'date' | 'month'; concrete_scope: 'tower' | 'overall'; staff_scope: 'tower' | 'overall'; labour_scope: 'tower' | 'overall'; equipment_scope: 'tower' | 'overall' }
export interface PlanRow { id: number; valid_from: string; valid_till: string; concrete_target_m3: number | null; client_bill_on: string | null; contractor_bill_on: string | null; note: string | null; settings: Partial<PlanSettings>; mom_meeting_id: number | null; updated_at: string | null; updated_by_name: string | null }
export interface PlanView {
  site: Site; valid_from: string; valid_till: string; days: number; label: string; status: PlanStatus; today: string;
  setup: Pick<Setup, 'ready' | 'locations' | 'report_days' | 'billing_enabled'>; plan: PlanRow | null; lines: PlanLine[]; copied_from: { id: number; label: string; settings: Partial<PlanSettings> } | null;
  catalog: Catalog; milestones: Milestone[]; expected_days: number; access: { edit: boolean };
  actuals: Record<string, { total: number; by_location: Record<string, number> }>;
  progress: { planned_to_date: number; poured_to_date: number; variance_to_date: number; last_report: { date: string; m3: number } | null; days_left: number | null } | null;
}
export interface PlanList {
  site: Site; today: string; ready: boolean; access: { plan: boolean };
  items: (PlanRow & { label: string; status: PlanStatus; days: number; target_m3: number; poured_m3: number; filed: number; forms_expected: number })[];
}

export interface Item {
  id: number; site_id: number; kind: ItemKind; title: string; location_id: string | null; location_name?: string | null; detail: Record<string, string | null>;
  owner_employee_id: number | null; owner_name: string | null; due_on: string | null; status: 'open' | 'closed'; opened_on: string; closed_on: string | null; close_note: string | null;
  opened_report_id: number | null; closed_report_id: number | null; mom_point_id: number | null; days_open?: number;
  mom?: { point_id: number; meeting_id: number; status: string } | null;
}

export interface CalendarDay { date: string; expected: boolean; status: 'draft' | 'submitted' | 'missing' | 'future' | 'none'; report_id: number | null; concrete_m3: number | null; filled_by_name: string | null; edit_count: number; can_write: boolean }
export interface ReportCalendar {
  site: Site; month: string; label: string; kind: ReportKind; today: string; planned: boolean; billing_enabled: boolean;
  summary: { expected: number; filed: number; drafts: number }; days: CalendarDay[]; access: { progress: boolean; billing: boolean; admin: boolean };
}

export interface PeopleRow { name: string; planned: number; present: number | null; split?: string | null; from_attendance?: boolean; extra?: boolean }
export interface EquipmentRow { name: string; planned: number; on_site: number | null; reason: string | null; extra?: boolean }
export interface CountRow { location_id: string | null; internal: number; client: number; nc: number }
export interface MilestoneAnswer { id: number; done: boolean; target_on?: string | null; reason?: string | null; early?: boolean }
export interface ProgressData {
  pours: { location_id: string | null; planned?: number; m3: number | null }[]; shortfall_reason: string | null; staff: PeopleRow[]; labour: PeopleRow[]; equipment: EquipmentRow[];
  safety: CountRow[]; quality: CountRow[]; note: string | null; milestones: MilestoneAnswer[]; concrete_m3?: number; _items?: ItemOps;
}
export interface CheckRow { name: string; done: boolean | null; remark: string | null; files: { name: string; url: string }[] }
export interface BillingData {
  client_bill_done_on: string | null; contractor_bill_done_on: string | null;
  steel: Partial<Record<'received' | 'billed' | 'wip' | 'jmr' | 'stock' | 'scrap' | 'wastage_pct', number | null>>;
  concrete: { location_id: string | null; theoretical: number | null; consumed: number | null; difference?: number | null; wastage_pct?: number | null }[];
  checklist: CheckRow[]; documents: CheckRow[];
  vendors: { name: string; reg_form: boolean | null; work_order: boolean | null; closing_bill: boolean | null; remark: string | null }[]; note: string | null;
}
export interface NewItem {
  client_key: string; kind: ItemKind; location_id?: string | null; owner_employee_id?: number | null; owner_name?: string | null; due_on?: string | null;
  equipment?: string; unit?: string; note?: string; name?: string; quantity?: string; text?: string; category?: 'safety' | 'quality' | 'site'; department?: string;
  reviewer_employee_id?: number | null; reviewer_name?: string | null;
}
export interface ItemAssign { id: number; owner_employee_id?: number | null; owner_name?: string | null; reviewer_employee_id?: number | null; reviewer_name?: string | null; department?: string | null }
export interface ItemOps { add?: NewItem[]; close?: { id: number; note?: string }[]; reopen?: number[]; remark?: { id: number; text: string }[]; assign?: ItemAssign[] }

interface ReportBase {
  site: Site; kind: ReportKind; date: string; today: string; month: string; month_label: string; expected: boolean; locations: Location[];
  plan: { id: number; client_bill_on: string | null; contractor_bill_on: string | null } | null;
  report: { id: number; status: 'draft' | 'submitted'; filled_by_name: string | null; submitted_at: string | null; edit_count: number; updated_at: string | null } | null;
  editable_until: string | null;
  access: { write: boolean; reason: 'not_set_up' | 'no_plan' | 'future' | 'no_role' | 'closed' | null; admin: boolean; items: boolean };
}
export interface ProgressForm extends ReportBase {
  kind: 'progress'; data: ProgressData; attendance: { name: string; present: number }[]; planned: { pours_m3: number; month_target_m3: number; month_before_m3: number };
  milestones: { due: Milestone[]; upcoming: Milestone[] }; items: Record<ItemKind, Item[]>; lists: { staff: string[]; labour: string[]; equipment: string[]; departments: string[] };
}
export interface BillingForm extends ReportBase { kind: 'billing'; data: BillingData; previous_steel: BillingData['steel'] | null; previous_on: string | null }
export type ReportForm = ProgressForm | BillingForm;

export interface SeriesPoint { date: string; planned: number; poured: number | null; cum_planned: number; cum_poured: number | null }
export interface Dashboard {
  site: Site; month_label: string; date: string; today: string; status: PlanStatus;
  setup: Pick<Setup, 'ready' | 'locations' | 'report_days' | 'billing_enabled'>;
  plan: { id: number; valid_from: string; valid_till: string; concrete_target_m3: number | null; mom_meeting_id: number | null; client_bill_on: string | null; contractor_bill_on: string | null } | null;
  report: { id: number; status: string; filled_by_name: string | null; submitted_at: string | null; note: string | null; shortfall_reason: string | null } | null;
  reports: { expected: number; filed: number; missing: string[] };
  concrete: {
    month_target: number; planned_to_date: number; poured_to_date: number; variance_to_date: number; planned_on_date: number; poured_on_date: number; month_pct: number | null;
    project_total: number; project_poured: number; project_pct: number | null; series: SeriesPoint[]; by_location: { location_id: string | null; name: string; planned: number; poured: number }[];
  };
  staff: { rows: (PeopleRow & { avg_present: number | null; variance: number | null })[]; planned: number; present: number | null };
  labour: { rows: (PeopleRow & { avg_present: number | null; variance: number | null })[]; planned: number; present: number | null };
  equipment: { rows: EquipmentRow[]; short: number };
  observations: Record<'safety' | 'quality', Record<'month' | 'day', { internal: number; client: number; nc: number }>>;
  milestones: { counts: { total: number; done: number; due: number; overdue: number; upcoming: number; done_on_time: number }; rows: Milestone[] };
  items: { open: number; by_kind: Record<ItemKind, number>; rows: Item[] };
  towers: { id: string; name: string; start_on: string | null; end_on: string | null; total_days: number | null; remaining_days: number | null; overdue_days: number | null }[];
  targets: (Milestone & { status: 'achieved' | 'revised' | 'missed' | 'pending' })[];
  day: Record<ItemKind, { raised: Item[]; closed: Item[]; open: Item[]; rows: Item[] }>;
  billing: {
    client_bill_on: string | null; contractor_bill_on: string | null; client_bill_done_on: string | null; contractor_bill_done_on: string | null;
    steel: BillingData['steel'] | null; steel_as_of: string | null; concrete: BillingData['concrete']; compliance_pct: number | null; filed: number;
    day: { checklist: CheckRow[]; documents: CheckRow[]; vendors: BillingData['vendors'] } | null;
    series: { steel: { date: string; received: number | null; billed: number | null }[]; concrete: { date: string; theoretical: number; consumed: number }[]; documents: { name: string; asked: number; yes: number }[] };
  } | null;
  access: { plan: boolean; admin: boolean; progress: boolean; billing: boolean; items: boolean; roles: Role[] };
}

export interface SetupInput extends Omit<Setup, 'ready' | 'people' | 'updated_at'> { people: Record<Role, number[]> }
export interface PlanInput { valid_from: string; valid_till: string; concrete_target_m3: number | null; client_bill_on: string | null; contractor_bill_on: string | null; note: string | null; settings: PlanSettings; lines: PlanLine[] }

export const overview = (q: { date?: string; mine?: boolean; q?: string } = {}) => apiClient.get<Overview>(`${B}/overview`, { date: q.date, q: q.q || undefined, mine: q.mine ? '1' : undefined }, auth);
export const catalog = () => apiClient.get<{ catalog: Catalog; access: { admin: boolean } }>(`${B}/catalog`, undefined, auth);
export const saveCatalog = (kind: CatalogKind, names: string[]) => apiClient.put<{ catalog: Catalog; access: { admin: boolean } }>(`${B}/catalog/${kind}`, { names }, auth);
export const people = (q: string) => apiClient.get<{ items: Person[] }>(`${B}/people`, { q }, auth);
export const levels = (counts: { basements?: number; plinths?: number; slabs?: number; terraces?: number }) => apiClient.post<{ levels: string[] }>(`${B}/levels`, counts, auth);

export const setup = (siteId: number) => apiClient.get<{ site: Site; setup: Setup; catalog: Catalog; access: { plan: boolean; admin: boolean } }>(`${B}/sites/${siteId}/setup`, undefined, auth);
export const saveSetup = (siteId: number, body: SetupInput) => apiClient.put<{ site: Site; setup: Setup }>(`${B}/sites/${siteId}/setup`, body, auth);
export const dashboard = (siteId: number, q: { date?: string } = {}) => apiClient.get<Dashboard>(`${B}/sites/${siteId}/dashboard`, q, auth);
export const plans = (siteId: number) => apiClient.get<PlanList>(`${B}/sites/${siteId}/plans`, undefined, auth);
export const plan = (planId: number) => apiClient.get<PlanView>(`${B}/plans/${planId}`, undefined, auth);
export const newPlan = (siteId: number, q: { from?: string; to?: string } = {}) => apiClient.get<PlanView>(`${B}/sites/${siteId}/plans/new`, q, auth);
export const createPlan = (siteId: number, body: PlanInput) => apiClient.post<PlanView>(`${B}/sites/${siteId}/plans`, body, auth);
export const savePlan = (planId: number, body: PlanInput) => apiClient.put<PlanView>(`${B}/plans/${planId}`, body, auth);
export const deletePlan = (planId: number) => apiClient.delete<{ ok: true }>(`${B}/plans/${planId}`, auth);
export const suggestions = (siteId: number) => apiClient.get<{ from: string; to: string; staff: { name: string; assigned: number; avg_present: number }[]; labour: { name: string; assigned: number; avg_present: number }[] }>(`${B}/sites/${siteId}/suggestions`, undefined, auth);
export const milestones = (siteId: number, state?: MilestoneState) => apiClient.get<{ site: Site; today: string; counts: Partial<Record<MilestoneState | 'total', number>>; items: Milestone[]; access: { edit: boolean } }>(`${B}/sites/${siteId}/milestones`, { state }, auth);
export const addMilestone = (siteId: number, body: { activity: string; purpose?: string | null; location_id: string | null; level: string | null; target_on: string | null }) => apiClient.post<{ added: number }>(`${B}/sites/${siteId}/milestones`, body, auth);
export const generateMilestones = (siteId: number, body: { activity: string; purpose?: string; location_ids: string[]; start_on: string | null; every_days: number | null }) => apiClient.post<{ added: number }>(`${B}/sites/${siteId}/milestones`, { generate: body }, auth);
export const editMilestone = (id: number, body: Partial<{ activity: string; purpose: string | null; location_id: string | null; level: string | null; target_on: string | null; reason: string; done_on: string | null }>) => apiClient.patch<{ milestone: Milestone }>(`${B}/milestones/${id}`, body, auth);
export const deleteMilestone = (id: number) => apiClient.delete<{ ok: true }>(`${B}/milestones/${id}`, auth);
export const milestonesByCycle = (siteId: number, body: { plan_id: number; start_on: string; every_days: number; location_id: string | null }) => apiClient.post<{ moved: number }>(`${B}/sites/${siteId}/milestones/cycle`, body, auth);
export const exportPlan = (body: { plan_id: number; format: 'pdf' | 'xlsx' }) => apiClient.post<ExportJobDto>('/exports/dpr-plan', body, auth);
export const milestoneHistory = (id: number) => apiClient.get<{ items: { kind: 'target' | 'done' | 'undone'; from_on: string | null; to_on: string | null; reason: string | null; changed_at: string; by_name: string | null }[] }>(`${B}/milestones/${id}/history`, undefined, auth);

export interface DailyRow {
  id: number | null; site_id: number; site: { id: number; name: string; code: string | null }; kind: ReportKind; report_on: string; status: 'missing' | 'draft' | 'submitted';
  concrete_m3: number | null; submitted_at: string | null; edit_count: number; filled_by_name: string | null; can_write: boolean;
}
export interface DailyList { tab: 'pending' | 'submitted'; from: string; to: string; today: string; page: number; pageSize: number; total: number; items: DailyRow[]; sites: { id: number; name: string; billing_enabled: boolean }[]; kinds: Record<ReportKind, boolean> }
export const dailyForms = (q: { tab: 'pending' | 'submitted'; site_id?: number; kind?: ReportKind; from?: string; to?: string; page?: number; pageSize?: number }) =>
  apiClient.get<DailyList>(`${B}/reports`, q, auth);
export const calendar = (siteId: number, month: string, kind: ReportKind) => apiClient.get<ReportCalendar>(`${B}/sites/${siteId}/reports`, { month, kind }, auth);
export const reportForm = (siteId: number, date: string, kind: ReportKind) => apiClient.get<ReportForm>(`${B}/sites/${siteId}/reports/${date}`, { kind }, auth);
export const saveReport = (siteId: number, date: string, body: { kind: ReportKind; submit: boolean; data: ProgressData | BillingData; items?: ItemOps }) => apiClient.put<ReportForm>(`${B}/sites/${siteId}/reports/${date}`, body, auth);
export const revisions = (reportId: number) => apiClient.get<{ items: { revision_no: number; changes: { path: string; from: unknown; to: unknown }[]; changed_at: string; by_name: string | null }[] }>(`${B}/reports/${reportId}/revisions`, undefined, auth);
export const deleteReport = (reportId: number) => apiClient.delete<{ ok: true }>(`${B}/reports/${reportId}`, auth);

export const items = (siteId: number, q: { status?: 'open' | 'closed'; kind?: ItemKind } = {}) => apiClient.get<{ site: Site; today: string; status: string; counts: Record<ItemKind, number>; items: Item[]; access: { manage: boolean } }>(`${B}/sites/${siteId}/items`, q, auth);
export const moveItem = (id: number, action: 'close' | 'reopen', note?: string) => apiClient.post<{ item: Item }>(`${B}/items/${id}/move`, { action, note }, auth);
export const attendance = (siteId: number, date: string) => apiClient.get<{ date: string; staff: { name: string; present: number }[]; labour: { name: string; present: number }[] }>(`${B}/sites/${siteId}/attendance`, { date }, auth);
export const assignItem = (id: number, body: { owner_employee_id?: number | null; reviewer_employee_id?: number | null; department?: string | null }) => apiClient.post<{ item: Item }>(`${B}/items/${id}/assign`, body, auth);
export const discussion = (id: number) => apiClient.get<{ items: { id: number; body: string; created_at: string; name: string }[] }>(`${B}/items/${id}/discussion`, undefined, auth);
export const remark = (id: number, text: string) => apiClient.post<{ items: { id: number; body: string; created_at: string; name: string }[] }>(`${B}/items/${id}/remarks`, { text }, auth);

export const exportReport = (body: { site_id: number; date: string; format: 'pdf' | 'xlsx'; reports: ReportKind[] }) => apiClient.post<ExportJobDto>('/exports/dpr', body, auth);
export const uploadFiles = (files: File[]) => {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return apiClient.post<{ files: { file_name: string; url: string }[] }>('/files/org-upload/dpr_attachments', form, auth);
};

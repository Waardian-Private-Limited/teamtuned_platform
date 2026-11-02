import { apiClient } from '@/lib/apiClient';

export const DEMO_LEAD_STATUSES = ['new', 'contacted', 'demo_booked', 'won', 'lost'] as const;
export type DemoLeadStatus = (typeof DEMO_LEAD_STATUSES)[number];

export const STATUS_LABEL: Record<DemoLeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  demo_booked: 'Demo booked',
  won: 'Won',
  lost: 'Lost',
};

export interface DemoLeadDto {
  id: number;
  company_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  company_size: string | null;
  message: string | null;
  status: DemoLeadStatus;
  notes: string | null;
  source: string | null;
  page_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  contacted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface DemoLeadListDto {
  items: DemoLeadDto[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<'all' | DemoLeadStatus, number>;
}

const auth = { withAuth: true };

export function listDemoLeads(p: { status: DemoLeadStatus | null; search: string; page: number; pageSize: number }) {
  return apiClient.get<DemoLeadListDto>('/superadmin/demo-leads', { status: p.status, search: p.search || undefined, page: p.page, pageSize: p.pageSize }, auth);
}

export function updateDemoLead(id: number, body: { status?: DemoLeadStatus; notes?: string }) {
  return apiClient.patch<DemoLeadDto>(`/superadmin/demo-leads/${id}`, body, auth);
}

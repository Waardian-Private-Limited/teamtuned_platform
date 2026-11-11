import type { NamedRef, Source, Stage } from '../../shared/types/recruitment.model';

export type LeadStatus = 'new' | 'called' | 'no_answer' | 'interested' | 'not_interested' | 'call_back' | 'moved';
/** A status tab: one lead status, any lead, past records (no status), follow-up due, or everyone. */
export type PoolTab = '' | 'leads' | 'records' | 'due' | LeadStatus;
export type PoolSort = 'recent' | 'follow_up' | 'name' | 'contacted';

export interface PoolItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  totalExperience: number | null;
  currentTitle: string | null;
  currentCompany: string | null;
  skills: string | null;
  source: Source;
  leadSource: string | null;
  leadStatus: LeadStatus | null;
  followUpOn: string | null;
  lastContactedAt: string | null;
  owner: NamedRef | null;
  hasResume: boolean;
  isEmployee: boolean;
  applicationCount: number;
  lastApplication: { positionTitle: string; stage: Stage; status: string } | null;
  updatedAt: string | null;
}

export type PoolCounts = { all: number; leads: number; records: number; followUpDue: number } & Partial<Record<LeadStatus, number>>;

export interface PoolList {
  items: PoolItem[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  counts: PoolCounts;
  leadSources: string[];
}

export interface PoolActivity {
  id: number;
  kind: 'added' | 'imported' | 'called' | 'note' | 'moved';
  leadStatus: LeadStatus | null;
  note: string | null;
  followUpOn: string | null;
  position: NamedRef | null;
  applicationId: number | null;
  by: string | null;
  at: string | null;
}

export interface PoolPerson {
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    name: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    totalExperience: number | null;
    currentCompany: string | null;
    currentTitle: string | null;
    noticePeriodDays: number | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    hasResume: boolean;
    source: Source;
    referredBy: NamedRef | null;
    employeeId: number | null;
    skills: string | null;
    leadSource: string | null;
    leadStatus: LeadStatus | null;
    followUpOn: string | null;
    lastContactedAt: string | null;
    owner: NamedRef | null;
    createdAt: string | null;
  };
  applications: Array<{ id: number; position: NamedRef | null; stage: Stage; status: string; appliedAt: string | null }>;
  activities: PoolActivity[];
}

export interface LeadInput {
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  lead_source?: string;
  current_title?: string;
  current_company?: string;
  total_experience?: string;
  city?: string;
  skills?: string;
  notice_period_days?: string;
  current_ctc?: string;
  expected_ctc?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  lead_status?: LeadStatus;
  follow_up_on?: string;
  note?: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; field: string | null; message: string }>;
  /** Rows imported without a value that could not be read (e.g. experience "4-5 years"). */
  warnings: Array<{ row: number; message: string }>;
}

// Wire shapes of the recruitment-offers module (RECRUITMENT_DESIGN.md §6.3).

export type OfferStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

export interface OfferListItemDto {
  id: number;
  application: { id: number; candidateName: string; positionTitle: string; candidateId?: number; positionId?: number };
  status: OfferStatus;
  designation?: string | null;
  annualCtc?: number | string | null;
  joiningDate?: string | null;
  expiresOn?: string | null;
  sentAt?: string | null;
  respondedAt?: string | null;
  createdAt?: string | null;
}

type Named = { id: number; name: string } | null | undefined;

/** Full offer as returned by create/update and (when present) application detail `offer`. Fields are read defensively. */
export interface OfferDetailDto extends Partial<Omit<OfferListItemDto, 'id' | 'status'>> {
  id: number;
  status: OfferStatus;
  applicationId?: number;
  subOrganizationId?: number | null;
  subOrganization?: Named;
  departmentId?: number | null;
  department?: Named;
  roleId?: number | null;
  role?: Named;
  employmentTypeId?: number | null;
  employmentType?: Named;
  siteId?: number | null;
  site?: Named;
  probationMonths?: number | null;
  noticePeriodDays?: number | null;
  notes?: string | null;
  responseNote?: string | null;
  signatureName?: string | null;
  /** Approved or later: the letter is final (numbered); before that a DRAFT copy. */
  letterFinal?: boolean;
  /** Sent outside the system (no online accept link). */
  sharedOffline?: boolean;
  /** The candidate's signed copy, uploaded by HR. */
  signedLetter?: { name: string; uploadedAt: string | null } | null;
  permissions?: { edit?: boolean; submit?: boolean; send?: boolean; share?: boolean; record?: boolean; letter?: boolean; withdraw?: boolean; hire?: boolean };
  approval?: {
    status?: string;
    requestId?: number;
    currentStep?: number | string | null;
    approvers?: Array<{ name: string; step?: number; decision?: string | null; note?: string | null; at?: string | null }>;
    note?: string | null;
  } | null;
  employeeId?: number | null;
}

export interface OfferBody {
  designation: string;
  department_id: number | null;
  role_id: number | null;
  employment_type_id: number | null;
  site_id: number | null;
  sub_organization_id: number | null;
  joining_date: string;
  annual_ctc: number;
  probation_months: number | null;
  notice_period_days: number | null;
  expires_on: string | null;
  notes: string;
}

/** GET /offers/:id/hire-form. The contract only says "prefill + what is missing"; read loosely. */
export interface HireFormFieldDto {
  field: string;
  label?: string;
  type?: 'text' | 'select' | 'date' | 'number' | 'employee' | 'email' | string;
  required?: boolean;
  options?: Array<{ id?: number | string; value?: number | string; name?: string; label?: string }>;
  value?: unknown;
  hint?: string | null;
  placeholder?: string | null;
}

export interface HireFormDto {
  prefill?: Record<string, unknown> | null;
  summary?: Array<{ label: string; value: unknown }> | null;
  missing?: Array<HireFormFieldDto | string> | null;
  fields?: HireFormFieldDto[] | null;
  employeeCode?: string | null;
  employeeCodeEditable?: boolean;
  alreadyHired?: boolean;
  employeeId?: number | null;
}

export interface HireResultDto {
  employeeId: number;
  employeeCode: string;
}

/** GET /offers/:id/letter/form — what the Download / Email dialog asks. */
export interface OfferLetterFormDto {
  template: { id: number; name: string };
  final: boolean;
  reference: string | null;
  inputs: Array<{ key: string; label: string; type: 'date' | 'text' | 'number' | 'money'; required: boolean; value: string }>;
  slots: Array<{ key: string; label: string; signatoryId: number | null; open: boolean; chosen: number | null }>;
  usesStamp: boolean;
  stampId: number | null;
  signatories: Array<{ id: number; name: string; designation: string | null }>;
  stamps: Array<{ id: number; name: string }>;
}

export interface OfferLetterChoice {
  inputs: Record<string, string>;
  signatories: Record<string, number>;
  stamp_id: number | null;
}

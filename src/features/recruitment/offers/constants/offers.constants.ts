import type { OfferStatus } from '../types/offers.dto';

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

export const OFFER_STATUS_FILTER: { value: OfferStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

export function offerTone(status: string): 'active' | 'inactive' | 'terminated' | 'neutral' {
  if (status === 'accepted') return 'active';
  if (status === 'declined') return 'inactive';
  if (status === 'withdrawn' || status === 'expired') return 'terminated';
  return 'neutral';
}

export const OFFER_FIELD_MAP: Record<string, string> = {
  designation: 'designation',
  department_id: 'departmentId',
  role_id: 'roleId',
  employment_type_id: 'employmentTypeId',
  site_id: 'siteId',
  sub_organization_id: 'subOrganizationId',
  joining_date: 'joiningDate',
  annual_ctc: 'annualCtc',
  probation_months: 'probationMonths',
  notice_period_days: 'noticePeriodDays',
  expires_on: 'expiresOn',
  notes: 'notes',
};

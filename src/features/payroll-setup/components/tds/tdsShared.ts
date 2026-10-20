import type { ChallanCompanyFilter, TdsSettings } from '../../types/payroll-setup.model';
import type { TdsReadinessDto } from '../../types/payroll-setup.dto';
import { currentFinancialYear } from '../../constants/payroll-setup.constants';

// Shared by the Income Tax (TDS) pages.

export type StepStatus = 'done' | 'attention' | 'pending';

export const EMPTY_SETTINGS: TdsSettings = {
  employerTan: '',
  employerPan: '',
  signatoryName: '',
  signatoryDesignation: '',
  place: '',
  proofCutoffMonth: null,
  declarationOpensOn: '',
  declarationClosesOn: '',
  proofOpensOn: '',
  proofClosesOn: '',
  subOrganizationId: 0,
};

export const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Apr–Jun)' },
  { value: 'Q2', label: 'Q2 (Jul–Sep)' },
  { value: 'Q3', label: 'Q3 (Oct–Dec)' },
  { value: 'Q4', label: 'Q4 (Jan–Mar)' },
] as const;

export type IdentityTarget = {
  id: number;
  name: string;
  isPrimary: boolean;
  complete: boolean;
  employerTan: string | null;
};

// The organization-level row (id 0) is the fallback every unassigned employee uses, so
// it is listed alongside the sub-organizations rather than hidden behind them.
export function IDENTITY_TARGETS(
  entities: Array<{ subOrganizationId: number; name: string; isPrimary: boolean; complete: boolean; employerTan: string | null }>,
  orgDefault?: { complete: boolean; employerTan: string | null }
): IdentityTarget[] {
  return [
    {
      id: 0,
      name: 'Organization default',
      isPrimary: false,
      complete: orgDefault?.complete ?? false,
      employerTan: orgDefault?.employerTan ?? null,
    },
    ...entities.map((entity) => ({
      id: entity.subOrganizationId,
      name: entity.name,
      isPrimary: entity.isPrimary,
      complete: entity.complete,
      employerTan: entity.employerTan,
    })),
  ];
}

export type CompanyOption = { value: number | null; label: string };

export function encodeCompany(value: ChallanCompanyFilter): string {
  if (value === 'all') return 'all';
  return value === null ? 'org' : String(value);
}

export function decodeCompany(raw: string): ChallanCompanyFilter {
  if (raw === 'all') return 'all';
  return raw === 'org' ? null : Number(raw);
}

export function fyOptions(): string[] {
  const current = currentFinancialYear();
  const start = Number(current.split('-')[0]);
  return [0, -1, -2].map((delta) => `${start + delta}-${String((start + delta + 1) % 100).padStart(2, '0')}`);
}

export interface TdsStepStatuses {
  identity: StepStatus;
  rates: StepStatus;
  rule: StepStatus;
  profiles: StepStatus;
  challans: StepStatus;
  form16: StepStatus;
}

/** Where each setup step stands, from the readiness check and the employer settings. */
export function tdsStepStatuses(readiness: TdsReadinessDto | null, settings: TdsSettings): TdsStepStatuses {
  const identityStatus: StepStatus = readiness?.employerIdentity.complete
    ? 'done'
    : settings.employerTan || settings.signatoryName ? 'attention' : 'pending';
  const ratesStatus: StepStatus = readiness?.taxRates.configured ? 'done' : 'attention';
  const ruleStatus: StepStatus = !readiness?.deductionRule.exists
    ? 'pending'
    : readiness.deductionRule.active && readiness.deductionRule.assignedEmployees > 0
      ? 'done'
      : 'attention';
  const profilesStatus: StepStatus = !readiness?.deductionRule.active
    ? 'pending'
    : readiness.taxProfiles.missing === 0 && readiness.taxProfiles.assigned > 0
      ? 'done'
      : 'attention';
  const challanStatus: StepStatus = (readiness?.challans.count ?? 0) > 0 ? 'done' : 'pending';
  const form16Status: StepStatus = readiness?.form16.ready ? 'done' : 'pending';
  return {
    identity: identityStatus,
    rates: ratesStatus,
    rule: ruleStatus,
    profiles: profilesStatus,
    challans: challanStatus,
    form16: form16Status,
  };
}

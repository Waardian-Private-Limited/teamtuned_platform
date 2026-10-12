export type RunStatusDto = 'draft' | 'finalized' | 'paid' | 'not_started';
export type ItemStatusDto = 'ok' | 'warning' | 'error' | 'held';
export type PayslipStateDto = 'draft' | 'not_generated' | 'visible' | 'held';

export interface PayslipCountsDto {
  generated: number;
  not_generated: number;
  held: number;
}

export interface PayRunDto {
  id: number | null;
  sub_organization_id: number | null;
  company_name: string | null;
  frequency: string;
  period_start: string;
  period_end: string;
  period_label: string;
  month: string;
  pay_date: string | null;
  release_mode: 'after_pay_day' | 'manual';
  release_on: string | null;
  status: RunStatusDto;
  stage: string;
  computed_at: string | null;
  totals: { employees: number; held?: number; net?: number } | null;
  released_at: string | null;
  paid_at: string | null;
  pending_action?: 'finalize' | 'reopen' | null;
  source?: 'engine' | 'legacy_import';
  status_counts?: Partial<Record<ItemStatusDto, number>>;
  payslip_counts?: PayslipCountsDto | null;
}

export interface PayRunListResponseDto {
  month: string;
  runs: PayRunDto[];
}

export interface RunItemDto {
  id: number;
  run_id: number;
  employee: { id: number; code: string | null; name: string };
  site: string | null;
  department: string | null;
  status: ItemStatusDto;
  hold_reason: string | null;
  net_pay: number;
  payslip_number: string | null;
  payslip_state?: PayslipStateDto | null;
  published_at?: string | null;
}

export interface RunItemPageDto {
  page: number;
  page_size: number;
  total: number;
  items: RunItemDto[];
}

export interface PayslipExportRequestDto {
  runId: number;
  employeeIds?: number[];
  layout: 'zip' | 'combined';
  includeHeld?: boolean;
}

export interface GenerateResponseDto {
  generated: number;
  run: PayRunDto;
}

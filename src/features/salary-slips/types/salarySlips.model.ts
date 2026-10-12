export type RunStatus = 'draft' | 'finalized' | 'paid';

export type SlipStatus = 'draft' | 'not_generated' | 'visible' | 'held';

export interface PayRun {
  id: number;
  companyName: string;
  periodLabel: string;
  payDate: string | null;
  status: RunStatus;
  releaseMode: 'after_pay_day' | 'manual';
  releaseOn: string | null;
  releasedAt: string | null;
  employees: number;
  isReleased: boolean;
  pendingAction: 'finalize' | 'reopen' | null;
}

export interface PayslipCounts {
  generated: number;
  notGenerated: number;
  held: number;
}

export interface RunPayslipSummary {
  counts: PayslipCounts | null;
  held: number | null;
}

export interface SalarySlipRow {
  employeeId: number;
  name: string;
  code: string | null;
  site: string | null;
  payslipNumber: string | null;
  netPay: number;
  status: SlipStatus;
  holdReason: string | null;
  publishedAt: string | null;
}

export interface SalarySlipPage {
  rows: SalarySlipRow[];
  total: number;
  page: number;
  pageSize: number;
}

export type PayslipLayout = 'zip' | 'combined';

export type PayoutSourceDto = 'salary' | 'advance' | 'reimbursement' | 'wallet_fund' | 'referral';
export type PayoutStatusDto = 'unpaid' | 'paid' | 'failed';
export type PayoutTabDto = 'to_pay' | 'failed' | 'paid' | 'all';

export interface PayoutRowDto {
  key: string;
  source: PayoutSourceDto;
  id: number;
  employee: { id: number; code: string | null; name: string };
  company: { id: number | null; name: string | null };
  label: string;
  month: string | null;
  amount: number;
  due_on: string | null;
  status: PayoutStatusDto;
  paid_on: string | null;
  reference: string | null;
  note: string | null;
  run_id: number | null;
  payment_mode: string;
  bank: { name: string | null; ifsc: string | null; account: string | null } | null;
}

export interface PayoutListDto {
  items: PayoutRowDto[];
  total: number;
  amount: number;
  page: number;
  pageSize: number;
}

export interface PayoutFigureDto {
  count: number;
  amount: number;
}

export interface PayoutOverviewDto {
  month: string;
  to_pay: { salary: PayoutFigureDto; advance: PayoutFigureDto; reimbursement?: PayoutFigureDto; wallet_fund?: PayoutFigureDto; referral?: PayoutFigureDto; total: PayoutFigureDto };
  failed: PayoutFigureDto;
  paid_this_month: PayoutFigureDto;
}

export interface MarkPaidRequestDto {
  keys: string[];
  paid_on?: string;
  reference?: string;
  proof?: { key: string; name: string; size: number; type: string };
}

export interface MarkResultDto {
  paid?: number;
  changed?: number;
  skipped: string[];
  failed: { key: string; message: string }[];
}

import type { PayoutSourceDto, PayoutStatusDto, PayoutTabDto } from './payouts.dto';

export type PayoutSource = PayoutSourceDto;
export type PayoutStatus = PayoutStatusDto;
export type PayoutTab = PayoutTabDto;
export type PayoutSortKey = 'due_on' | 'amount' | 'name' | 'paid_on';

export interface Payout {
  key: string;
  source: PayoutSource;
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  companyName: string;
  label: string;
  month: string | null;
  amount: number;
  dueOn: string | null;
  status: PayoutStatus;
  paidOn: string | null;
  reference: string | null;
  note: string | null;
  runId: number | null;
  paymentMode: string;
  bank: string | null;
}

export interface PayoutFigure {
  count: number;
  amount: number;
}

export interface PayoutOverview {
  month: string;
  toPay: { salary: PayoutFigure; advance: PayoutFigure; reimbursement: PayoutFigure; walletFund: PayoutFigure; referral: PayoutFigure; total: PayoutFigure };
  failed: PayoutFigure;
  paidThisMonth: PayoutFigure;
}

export interface PayoutFilters {
  tab: PayoutTab;
  source: PayoutSource | null;
  month: string;
  siteId: number | null;
  subOrgId: number | null;
  search: string;
  sort: { key: PayoutSortKey; dir: 'asc' | 'desc' };
}

import type { CompEmployeeDto, PayoutDto, PayoutStatus } from '@/features/compensation/types/compensation.dto';

export type { CompEmployeeDto, PayoutDto, PayoutStatus };

export interface DeductionListResponseDto {
  payouts: PayoutDto[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  open_amount: number;
  paid_amount: number;
  counts: Record<string, number>;
}

export interface CreateDeductionRequestDto {
  employee_ids: number[];
  payout_type: 'other_deduction';
  title: string;
  amount_mode: 'fixed';
  amount_value: number;
  payout_month: string;
  installments: number;
  notes: string | null;
  submit: true;
}

export interface CreateDeductionResponseDto {
  created: number;
  employees: number;
  skipped: { employee_id: number; reason: string }[];
  status: string;
}

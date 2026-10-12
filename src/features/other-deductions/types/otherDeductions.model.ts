export type DeductionStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';

export interface OtherDeduction {
  id: number;
  employeeName: string;
  employeeCode: string | null;
  reason: string;
  month: string;
  amount: number;
  instalmentNo: number;
  instalmentCount: number;
  status: DeductionStatus;
  notes: string | null;
  canCancel: boolean;
}

export interface DeductionFormInput {
  employeeIds: number[];
  reason: string;
  amount: number;
  startMonth: string;
  instalments: number;
  notes: string;
}

export type DeductionFieldName = 'employee_ids' | 'title' | 'amount_value' | 'payout_month' | 'installments' | 'notes';

export type DeductionFieldErrors = Partial<Record<DeductionFieldName, string>>;

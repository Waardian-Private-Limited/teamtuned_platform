export interface MyPayslipDto {
  id: number;
  run_id: number;
  month: string;
  period_start: string;
  period_end: string;
  period_label: string;
  pay_date: string | null;
  company_name: string | null;
  net_pay: number;
  earnings: number;
  deductions: number;
  payable_days: number;
  lop_days: number;
  cycle_days: number;
  payslip_number: string | null;
  released_at: string | null;
}

export interface MyPayslipListResponseDto {
  payslips: MyPayslipDto[];
}

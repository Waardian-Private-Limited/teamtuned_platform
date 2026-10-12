export interface MyPayslip {
  id: number;
  month: string;
  periodLabel: string;
  companyName: string | null;
  payDate: string | null;
  netPay: number;
  earnings: number;
  deductions: number;
  payableDays: number;
  lopDays: number;
  cycleDays: number;
  payslipNumber: string | null;
}

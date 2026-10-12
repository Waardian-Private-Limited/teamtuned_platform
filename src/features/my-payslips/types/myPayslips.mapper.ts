import type { MyPayslipDto } from './myPayslips.dto';
import type { MyPayslip } from './myPayslips.model';

export function toMyPayslip(dto: MyPayslipDto): MyPayslip {
  return {
    id: dto.id,
    month: dto.month,
    periodLabel: dto.period_label,
    companyName: dto.company_name,
    payDate: dto.pay_date,
    netPay: Number(dto.net_pay) || 0,
    earnings: Number(dto.earnings) || 0,
    deductions: Number(dto.deductions) || 0,
    payableDays: Number(dto.payable_days) || 0,
    lopDays: Number(dto.lop_days) || 0,
    cycleDays: Number(dto.cycle_days) || 0,
    payslipNumber: dto.payslip_number,
  };
}

export function toMyPayslips(list: MyPayslipDto[]): MyPayslip[] {
  return list
    .map(toMyPayslip)
    .sort((a, b) => (a.month === b.month ? (a.companyName || '').localeCompare(b.companyName || '') : b.month.localeCompare(a.month)));
}

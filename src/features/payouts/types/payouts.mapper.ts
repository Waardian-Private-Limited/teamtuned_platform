import type { PayoutOverviewDto, PayoutRowDto } from './payouts.dto';
import type { Payout, PayoutOverview } from './payouts.model';

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function toPayout(dto: PayoutRowDto): Payout {
  const bank = dto.bank && (dto.bank.name || dto.bank.account) ? [dto.bank.name, dto.bank.account].filter(Boolean).join(' · ') : null;
  return {
    key: dto.key,
    source: dto.source,
    id: dto.id,
    employeeId: dto.employee.id,
    employeeName: dto.employee.name || '—',
    employeeCode: dto.employee.code ?? null,
    companyName: dto.company.name || 'Main company',
    label: dto.label,
    month: dto.month,
    amount: num(dto.amount),
    dueOn: dto.due_on,
    status: dto.status,
    paidOn: dto.paid_on,
    reference: dto.reference,
    note: dto.note,
    runId: dto.run_id,
    paymentMode: dto.payment_mode || 'bank',
    bank,
  };
}

export function toOverview(dto: PayoutOverviewDto): PayoutOverview {
  return {
    month: dto.month,
    toPay: dto.to_pay,
    failed: dto.failed,
    paidThisMonth: dto.paid_this_month,
  };
}

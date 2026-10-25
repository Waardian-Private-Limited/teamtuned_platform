import type { PayoutOverviewDto, PayoutRowDto } from './payouts.dto';
import type { Payout, PayoutOverview } from './payouts.model';

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const figure = (f: { count?: unknown; amount?: unknown } | undefined) => ({ count: num(f?.count), amount: num(f?.amount) });

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
    toPay: {
      salary: figure(dto.to_pay?.salary),
      advance: figure(dto.to_pay?.advance),
      reimbursement: figure(dto.to_pay?.reimbursement),
      walletFund: figure(dto.to_pay?.wallet_fund),
      pettyCashFund: figure(dto.to_pay?.petty_cash_fund),
      referral: figure(dto.to_pay?.referral),
      total: figure(dto.to_pay?.total),
    },
    failed: dto.failed,
    paidThisMonth: dto.paid_this_month,
  };
}

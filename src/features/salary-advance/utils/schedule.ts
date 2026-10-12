import { addMonths } from '@/lib/datetime';
import type { Installment, InterestMode, SchedulePreview } from '../types/salaryAdvance.model';

export interface ScheduleInput {
  amount: number;
  installments: number;
  startMonth: string;
  interestMode: InterestMode;
  annualRate: number;
}

const rupee = (n: number) => Math.round(n);

function row(seq: number, month: string, principal: number, interest: number): Installment {
  return {
    key: `p${seq}`,
    id: null,
    seq,
    month,
    principal,
    interest,
    amount: principal + interest,
    recovered: 0,
    status: 'scheduled',
    payrollItemId: null,
    payrollRunId: null,
    reference: null,
    note: null,
  };
}

function equalSplit(total: number, n: number): number[] {
  const each = rupee(total / n);
  const parts = Array.from({ length: n }, () => each);
  parts[n - 1] = rupee(total - each * (n - 1));
  return parts;
}

export function buildSchedule(input: ScheduleInput): SchedulePreview {
  const amount = rupee(input.amount);
  const n = Math.max(1, Math.floor(input.installments));
  const rate = input.interestMode === 'none' ? 0 : Math.max(0, input.annualRate);
  const months = Array.from({ length: n }, (_, i) => addMonths(input.startMonth, i));
  let schedule: Installment[];

  if (input.interestMode === 'reducing' && rate > 0) {
    const r = rate / 1200;
    const factor = Math.pow(1 + r, n);
    const emi = rupee((amount * r * factor) / (factor - 1));
    let balance = amount;
    schedule = months.map((month, i) => {
      const interest = rupee(balance * r);
      const principal = i === n - 1 ? balance : Math.min(balance, emi - interest);
      balance -= principal;
      return row(i + 1, month, principal, interest);
    });
  } else {
    const principals = equalSplit(amount, n);
    const totalInterest = input.interestMode === 'flat' && rate > 0 ? rupee((amount * rate * n) / 1200) : 0;
    const interests = totalInterest > 0 ? equalSplit(totalInterest, n) : principals.map(() => 0);
    schedule = months.map((month, i) => row(i + 1, month, principals[i], interests[i]));
  }

  const interestAmount = schedule.reduce((s, x) => s + x.interest, 0);
  return {
    schedule,
    totalRepayable: amount + interestAmount,
    interestAmount,
    installmentAmount: schedule[0]?.amount ?? 0,
    startMonth: input.startMonth,
    errors: [],
    fieldErrors: {},
  };
}

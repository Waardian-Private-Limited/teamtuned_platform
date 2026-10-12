import type { CreateDeductionRequestDto, PayoutDto } from './otherDeductions.dto';
import type { DeductionFormInput, OtherDeduction } from './otherDeductions.model';

const INSTALMENT_SUFFIX = /\s*\(\d+\/\d+\)\s*$/;

export function toOtherDeduction(dto: PayoutDto): OtherDeduction {
  return {
    id: dto.id,
    employeeName: dto.employee?.name || '—',
    employeeCode: dto.employee?.employee_code ?? null,
    reason: (dto.title || dto.payout_type_label || 'Other deduction').replace(INSTALMENT_SUFFIX, ''),
    month: dto.payout_month,
    amount: Math.abs(Number(dto.amount) || 0),
    instalmentNo: Number(dto.installment_no) || 1,
    instalmentCount: Number(dto.installment_count) || 1,
    status: dto.status,
    notes: dto.notes,
    canCancel: ['draft', 'pending', 'approved'].includes(dto.status) && !dto.locked,
  };
}

export function toCreateDeductionBody(input: DeductionFormInput): CreateDeductionRequestDto {
  return {
    employee_ids: input.employeeIds,
    payout_type: 'other_deduction',
    title: input.reason.trim(),
    amount_mode: 'fixed',
    amount_value: input.amount,
    payout_month: input.startMonth,
    installments: input.instalments,
    notes: input.notes.trim() || null,
    submit: true,
  };
}

import type {
  AdvanceTypeFieldErrors,
  AdvanceTypeFormInput,
  Eligibility,
  HrAdvanceFieldErrors,
  HrAdvanceFormInput,
  MyAdvanceFieldErrors,
  MyAdvanceFormInput,
} from '../types/salaryAdvance.model';
import { money } from './format';

const CODE = /^[A-Z0-9_]{2,40}$/;

export function validateAdvanceType(input: AdvanceTypeFormInput): AdvanceTypeFieldErrors {
  const errors: AdvanceTypeFieldErrors = {};
  if (!input.name.trim()) errors.name = 'Enter a name';
  else if (input.name.trim().length > 100) errors.name = 'Keep the name under 100 characters';
  if (!CODE.test(input.code.trim().toUpperCase())) errors.code = 'Use 2 to 40 capital letters, digits or underscores';
  if (input.description.trim().length > 300) errors.description = 'Keep the description under 300 characters';
  return errors;
}

function amountErrors(amount: number, installments: number, eligibility: Eligibility | null) {
  const errors: { amount?: string; installments?: string } = {};
  if (!Number.isFinite(amount) || amount <= 0) errors.amount = 'Enter an amount greater than zero';
  else if (eligibility?.maxAmount !== null && eligibility?.maxAmount !== undefined && amount > eligibility.maxAmount) {
    errors.amount = eligibility.hideLimits ? 'This is more than you can take right now' : `The most you can take is ${money(eligibility.maxAmount)}`;
  } else if (eligibility?.minAmount && amount < eligibility.minAmount) {
    errors.amount = `The least you can take is ${money(eligibility.minAmount)}`;
  }
  if (!Number.isInteger(installments) || installments < 1) errors.installments = 'Enter at least 1 instalment';
  else if (eligibility && installments > eligibility.maxInstallments) errors.installments = `At most ${eligibility.maxInstallments} months`;
  return errors;
}

export function validateHrAdvance(input: HrAdvanceFormInput, eligibility: Eligibility | null): HrAdvanceFieldErrors {
  const errors: HrAdvanceFieldErrors = {};
  if (!input.employeeId) errors.employee_id = 'Pick an employee';
  if (!input.typeId) errors.advance_type_id = 'Pick an advance type';
  const money = amountErrors(input.amount, input.installments, eligibility);
  if (money.amount) errors.amount = money.amount;
  if (money.installments) errors.installments = money.installments;
  if (!input.reason.trim()) errors.reason = 'Enter the reason for this advance';
  return errors;
}

export function validateMyAdvance(input: MyAdvanceFormInput, eligibility: Eligibility | null): MyAdvanceFieldErrors {
  const errors: MyAdvanceFieldErrors = {};
  if (!input.typeId) errors.advance_type_id = 'Pick what you need';
  const money = amountErrors(input.amount, input.installments, eligibility);
  if (money.amount) errors.amount = money.amount;
  if (money.installments) errors.installments = money.installments;
  if ((eligibility?.reasonRequired ?? true) && !input.reason.trim()) errors.reason = 'Tell us what the advance is for';
  if (eligibility?.attachmentRequired && !input.attachments.length) errors.attachments = 'Attach a supporting document';
  return errors;
}

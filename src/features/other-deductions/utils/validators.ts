import { MONTH_KEY } from '@/features/salary-slips/utils/format';
import type { DeductionFieldErrors, DeductionFormInput } from '../types/otherDeductions.model';

export function validateDeduction(input: DeductionFormInput): DeductionFieldErrors {
  const errors: DeductionFieldErrors = {};
  if (!input.employeeIds.length) errors.employee_ids = 'Pick at least one employee';
  if (!input.reason.trim()) errors.title = 'Enter the reason for this deduction';
  if (!Number.isFinite(input.amount) || input.amount <= 0) errors.amount_value = 'Enter an amount greater than zero';
  if (!MONTH_KEY.test(input.startMonth)) errors.payout_month = 'Pick the month to start deducting';
  if (!Number.isInteger(input.instalments) || input.instalments < 1) {
    errors.installments = 'Enter a valid number of instalments (at least 1)';
  }
  return errors;
}

import { validatePan, validateTan } from '@/features/payroll-setup/utils/validators';
import { LANDLORD_PAN_ABOVE } from '../constants/myTax.constants';
import type { AmountKey, TaxFieldName, TaxForm } from '../types/myTax.model';

const AMOUNT_ERROR = 'Enter an amount of 0 or more';

const badAmount = (raw: string) => raw.trim() !== '' && (!Number.isFinite(Number(raw)) || Number(raw) < 0);

/**
 * The same checks the server makes, so the common mistakes are marked before saving.
 * Old-regime sections are checked only when the old regime is picked: hidden inputs
 * can't show a message.
 */
export function validateTaxForm(form: TaxForm): Partial<Record<TaxFieldName, string>> {
  const errors: Partial<Record<TaxFieldName, string>> = {};
  const old = form.regime === 'old';

  const pan = validatePan(form.pan.trim());
  if (pan) errors.pan = pan;

  for (const key of Object.keys(form.amounts) as AmountKey[]) {
    if ((old || key === 'otherIncome') && badAmount(form.amounts[key])) errors[key] = AMOUNT_ERROR;
  }

  if (old) {
    if (badAmount(form.rent)) errors.rent = AMOUNT_ERROR;
    const landlordPan = validatePan(form.landlordPan.trim());
    if (landlordPan) errors.landlord = landlordPan;
    else if (Number(form.rent) > LANDLORD_PAN_ABOVE && !form.landlordPan.trim()) {
      errors.landlord = "Rent is above ₹1,00,000 a year: add your landlord's PAN";
    }
    const lenderPan = validatePan(form.lenderPan.trim());
    if (lenderPan) errors.home_loan_lender = lenderPan;
  }

  const p = form.previous;
  if ([p.income, p.tds, p.professionalTax, p.providentFund].some(badAmount)) errors.previous_employer = AMOUNT_ERROR;
  else {
    const tan = validateTan(p.employerTan.trim());
    if (tan) errors.previous_employer = tan;
  }
  return errors;
}

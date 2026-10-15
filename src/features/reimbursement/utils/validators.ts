import { MAX_PAYMENT_REFERENCE } from '../constants/reimbursement.constants';
import type { Category, ClaimFormErrors, ClaimFormInput, LineInput } from '../types/reimbursement.model';
import { lineKey } from './errors';

/** Report fields: title and purpose. */
export function validateReport(input: Pick<ClaimFormInput, 'title' | 'purpose'>): ClaimFormErrors {
  const e: ClaimFormErrors = {};
  if (!input.title.trim()) e.title = 'Give this expense a title';
  else if (input.title.trim().length > 150) e.title = 'Keep it under 150 characters';
  if (input.purpose.length > 1000) e.purpose = 'Keep it under 1000 characters';
  return e;
}

/** The details step of one bill (category, date, amount, merchant, description, bill no.). */
export function validateLineDetails(l: LineInput, i: number, categories: Map<number, Category>, today: string, forSubmit: boolean): ClaimFormErrors {
  const e: ClaimFormErrors = {};
  const cat = l.categoryId ? categories.get(l.categoryId) : undefined;
  if (!cat) e[lineKey(i, 'category_id')] = 'Choose a category';
  if (!l.expenseDate) e[lineKey(i, 'expense_date')] = 'Pick the date';
  else if (l.expenseDate > today) e[lineKey(i, 'expense_date')] = 'The date cannot be in the future';
  if (cat?.kind === 'distance') {
    const km = Number(l.quantity);
    if (forSubmit && (!l.quantity || !(km > 0))) e[lineKey(i, 'quantity')] = 'Enter the distance';
  } else {
    const amount = Number(l.amount);
    if (forSubmit && (!l.amount || !(amount > 0))) e[lineKey(i, 'amount')] = 'Enter the amount';
  }
  if (l.merchant.length > 120) e[lineKey(i, 'merchant')] = 'Keep it under 120 characters';
  if (l.description.length > 300) e[lineKey(i, 'description')] = 'Keep it under 300 characters';
  if (l.invoiceNo.trim().length > 100) e[lineKey(i, 'invoice_no')] = 'Keep the bill no. under 100 characters';
  return e;
}

/** The payment step of one bill. Nothing is required; the reference has a length limit. */
export function validateLinePayment(l: LineInput, i: number): ClaimFormErrors {
  const e: ClaimFormErrors = {};
  if (l.paymentReference.trim().length > MAX_PAYMENT_REFERENCE) e[lineKey(i, 'payment_reference')] = `Keep it under ${MAX_PAYMENT_REFERENCE} characters`;
  return e;
}

/** Client checks mirroring the API's, so obvious mistakes show before a round trip. */
export function validateClaim(input: ClaimFormInput, categories: Map<number, Category>, today: string, forSubmit: boolean): ClaimFormErrors {
  const e: ClaimFormErrors = validateReport(input);
  if (!input.lines.length) e.lines = 'Add at least one bill';
  input.lines.forEach((l, i) => Object.assign(e, validateLineDetails(l, i, categories, today, forSubmit), validateLinePayment(l, i)));
  return e;
}

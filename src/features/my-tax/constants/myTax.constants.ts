import type { AmountKey, PreviousKey } from '../types/myTax.model';

/** Rent above this a year needs the landlord's PAN (Form 12BB). */
export const LANDLORD_PAN_ABOVE = 100000;

// Old-regime deductions, in the order the form shows them. House rent and the home-loan
// lender are separate blocks; `lender` puts the lender inputs under that amount.
export const DEDUCTION_FIELDS: Array<{ key: AmountKey; title: string; hint: string; lender?: boolean }> = [
  { key: 'section80C', title: 'Section 80C', hint: 'PPF, ELSS, LIC, tuition fees. Your PF is added automatically. Limit ₹1,50,000 including PF.' },
  { key: 'section80CCD1B', title: 'Your own NPS — 80CCD(1B)', hint: 'Over and above 80C. Limit ₹50,000.' },
  { key: 'section80D', title: 'Health insurance — 80D', hint: 'Premium for you, your family and parents.' },
  { key: 'housingLoanInterest', title: 'Home loan interest', hint: 'Interest on a loan for a house you live in. Limit ₹2,00,000.', lender: true },
  { key: 'other', title: 'Other deductions', hint: 'Education loan interest (80E), donations (80G) and similar.' },
];

export const PREVIOUS_FIELDS: Array<{ key: PreviousKey; label: string; amount: boolean; placeholder?: string }> = [
  { key: 'employerName', label: 'Employer name', amount: false, placeholder: 'e.g., Acme Pvt Ltd' },
  { key: 'employerTan', label: 'Employer TAN', amount: false, placeholder: 'MUMT12345E' },
  { key: 'income', label: 'Taxable salary', amount: true },
  { key: 'tds', label: 'TDS deducted', amount: true },
  { key: 'professionalTax', label: 'Professional tax', amount: true },
  { key: 'providentFund', label: 'PF', amount: true },
];

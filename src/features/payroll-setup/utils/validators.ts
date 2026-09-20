import type { DebitFormInput } from '../types/payroll-setup.model';

export function validateComponentName(name: string): string | null {
  if (!name.trim()) return 'Component name is required';
  if (name.trim().length > 100) return 'Component name is too long';
  return null;
}

const STATUTORY_NUMERIC_FIELDS: Record<string, string[]> = {
  epf: ['rate', 'wageCeiling'],
  esi: ['rate', 'eligibilityCeiling'],
  professional_tax: ['monthlyAmount', 'februaryAmount'],
  lwf: ['amount'],
};

export function validateDebitForm(input: DebitFormInput): { field: string; message: string } | null {
  if (!input.name.trim()) return { field: 'debit_name', message: 'Rule name is required' };
  if (input.name.trim().length > 150) return { field: 'debit_name', message: 'Rule name is too long' };

  if (['custom', 'insurance', 'mediclaim', 'canteen', 'transport', 'accommodation', 'other'].includes(input.category)) {
    if (input.debitType === 'fixed') {
      if (!input.fixedAmount || Number(input.fixedAmount) <= 0) {
        return { field: 'fixed_amount', message: 'Enter a valid fixed amount' };
      }
    } else {
      if (!input.percentageValue || Number(input.percentageValue) <= 0) {
        return { field: 'percentage_value', message: 'Enter a valid percentage' };
      }
      if (input.referenceAmount === 'breakdown_item' && !input.breakdownItemId) {
        return { field: 'breakdown_item_id', message: 'Select the salary component' };
      }
    }
  } else {
    const fields = STATUTORY_NUMERIC_FIELDS[input.category] || [];
    for (const field of fields) {
      const value = input.config[field];
      if (value !== undefined && value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
        return { field: 'config', message: `Enter a valid number for ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}` };
      }
    }
  }

  if (input.enableMaxCap && (!input.maxCapAmount || Number(input.maxCapAmount) < 0)) {
    return { field: 'max_cap_amount', message: 'Enter a valid cap amount' };
  }
  if (input.enableAdditionalCharges) {
    if (!input.additionalChargeValue || Number(input.additionalChargeValue) < 0) {
      return { field: 'additional_charge_value', message: 'Enter a valid charge value' };
    }
  }
  return null;
}

export function validatePan(pan: string): string | null {
  if (!pan) return null;
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())) return 'Enter a valid 10-character PAN (e.g., ABCDE1234F)';
  return null;
}

// TAN: 4 letters (jurisdiction + deductor initial), 5 digits, 1 check letter.
export function validateTan(tan: string): string | null {
  if (!tan) return null;
  if (!/^[A-Z]{4}[0-9]{5}[A-Z]$/.test(tan.toUpperCase())) return 'Enter a valid 10-character TAN (e.g., MUMT12345E)';
  return null;
}

/** Field-level errors for the employer identity printed on every Form 16. */
export function validateTdsSettings(input: {
  employerTan: string;
  employerPan: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  const tanError = validateTan(input.employerTan.trim());
  if (tanError) errors.employerTan = tanError;
  const panError = validatePan(input.employerPan.trim());
  if (panError) errors.employerPan = panError;
  return errors;
}

const QUARTER_START_MONTH: Record<string, number> = { Q1: 4, Q2: 7, Q3: 10, Q4: 1 };

export function validateChallan(input: { amount: string; financialYear: string; quarter: string; depositDate: string }): string | null {
  if (!input.amount || Number(input.amount) <= 0) return 'Enter a valid challan amount';
  if (!input.financialYear.trim()) return 'Financial year is required';
  if (!input.quarter) return 'Select the quarter';

  // Mirror the server rule so a misdated deposit is caught before the round trip.
  if (input.depositDate) {
    const startYear = Number(input.financialYear.split('-')[0]);
    const [year, month] = input.depositDate.split('-').map(Number);
    if (Number.isFinite(startYear) && Number.isFinite(year) && Number.isFinite(month)) {
      const fyIndex = month >= 4 ? year - startYear : year - startYear - 1;
      if (fyIndex !== 0) return `Deposit date must fall within FY ${input.financialYear}`;

      const quarterStart = QUARTER_START_MONTH[input.quarter];
      const quarterStartYear = quarterStart >= 4 ? startYear : startYear + 1;
      if (year * 12 + month < quarterStartYear * 12 + quarterStart) {
        return `Deposit date cannot precede ${input.quarter} of FY ${input.financialYear}`;
      }
    }
  }
  return null;
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

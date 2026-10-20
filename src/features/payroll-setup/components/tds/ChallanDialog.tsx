'use client';

import React from 'react';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import type { TdsChallan } from '../../types/payroll-setup.model';
import { validateChallan } from '../../utils/validators';
import { fyOptions, QUARTERS, type CompanyOption } from './tdsShared';
import { errorInputClass, fieldErrorClass, inputClass, labelClass, primaryButton } from './fields';

export function ChallanDialog({
  open,
  initial,
  defaultFy,
  defaultCompany,
  companyOptions,
  showCompany,
  allowOrganization,
  companyName,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: TdsChallan | null;
  defaultFy: string;
  defaultCompany: number | null;
  companyOptions: CompanyOption[];
  showCompany: boolean;
  allowOrganization: boolean;
  companyName: (id: number | null) => string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    id?: number;
    financial_year: string;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    bsr_code?: string;
    challan_serial_no?: string;
    deposit_date?: string;
    amount: number;
    sub_organization_id: number | null;
  }) => Promise<void> | void;
}) {
  const [financialYear, setFinancialYear] = React.useState(defaultFy);
  const [quarter, setQuarter] = React.useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [bsrCode, setBsrCode] = React.useState('');
  const [serial, setSerial] = React.useState('');
  const [depositDate, setDepositDate] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [error, setError] = React.useState('');
  const [company, setCompany] = React.useState<number | null>(defaultCompany);
  const [companyError, setCompanyError] = React.useState('');

  const options = React.useMemo(() => {
    if (!initial || companyOptions.some((o) => o.value === initial.subOrganizationId)) return companyOptions;
    return [{ value: initial.subOrganizationId, label: companyName(initial.subOrganizationId) }, ...companyOptions];
  }, [companyOptions, initial, companyName]);

  React.useEffect(() => {
    if (!open) return;
    setError('');
    setCompanyError('');
    setCompany(initial ? initial.subOrganizationId : defaultCompany);
    setFinancialYear(initial?.financialYear ?? defaultFy);
    setQuarter(initial?.quarter ?? 'Q1');
    setBsrCode(initial?.bsrCode ?? '');
    setSerial(initial?.challanSerialNo ?? '');
    setDepositDate(initial?.depositDate ? String(initial.depositDate).slice(0, 10) : '');
    setAmount(initial ? String(initial.amount) : '');
  }, [open, initial, defaultFy, defaultCompany]);

  const submit = () => {
    const companyMissing = showCompany && company === null && !allowOrganization && !(initial && initial.subOrganizationId === null);
    setCompanyError(companyMissing ? 'Choose the company that deposited this challan' : '');
    const message = validateChallan({ amount, financialYear, quarter, depositDate });
    if (message) { setError(message); return; }
    if (companyMissing) return;
    setError('');
    onSubmit({
      id: initial?.id,
      financial_year: financialYear,
      quarter,
      bsr_code: bsrCode.trim() || undefined,
      challan_serial_no: serial.trim() || undefined,
      deposit_date: depositDate || undefined,
      amount: Number(amount),
      sub_organization_id: showCompany ? company : null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Challan' : 'Add Challan'}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={isSaving} className={primaryButton}>
            {isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <span>{initial ? 'Save changes' : 'Add Challan'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        {error && <Alert message={error} tone="error" />}
        <p className="text-[11px] leading-relaxed text-fg-muted">
          Enter the challan exactly as it appears on the receipt from the bank or the e-payment portal. The BSR code and
          serial number are what let the department match your deposit to this employee&apos;s Form 16.
        </p>
        {showCompany && (
          <div>
            <label className={labelClass}>
              Company <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <select
              value={company === null && !options.some((o) => o.value === null) ? '' : company === null ? 'org' : String(company)}
              onChange={(e) => {
                setCompanyError('');
                setCompany(e.target.value === 'org' || e.target.value === '' ? null : Number(e.target.value));
              }}
              className={companyError ? errorInputClass : inputClass}
            >
              {!options.some((o) => o.value === null) && (
                <option value="" disabled>Select a company…</option>
              )}
              {options.map((option) => (
                <option key={option.value === null ? 'org' : option.value} value={option.value === null ? 'org' : String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
            {companyError
              ? <p className={fieldErrorClass}>{companyError}</p>
              : <p className="mt-1 text-[11px] text-fg-muted">The entity whose TAN this deposit was made under.</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Financial Year</label>
            <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} className={inputClass}>
              {fyOptions().map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quarter</label>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value as typeof quarter)} className={inputClass}>
              {QUARTERS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Amount (₹)</label>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 12500" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>BSR Code</label>
            <input value={bsrCode} onChange={(e) => setBsrCode(e.target.value)} placeholder="e.g., 0123456" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Challan serial no.</label>
            <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="e.g., 00091" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Deposit date</label>
          <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className={inputClass} />
        </div>
      </div>
    </Dialog>
  );
}

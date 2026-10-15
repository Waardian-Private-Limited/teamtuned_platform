'use client';

import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { BillTotals } from '../../types/reimbursement.model';
import { GSTIN_PROBLEM } from '../../utils/bill';

const two = (n: number) => Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Amounts on a bill, invoice style (two decimals): rupees unless the bill is in another currency. */
export function billMoney(n: number | null | undefined, currency: string | null) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const sign = n < 0 ? '−' : '';
  if (!currency || /^(inr|rs\.?|₹)$/i.test(currency)) return `${sign}₹${two(n)}`;
  return `${sign}${currency} ${two(n)}`;
}

/** A non-zero amount. */
export const has = (v: number | null | undefined) => v !== null && v !== undefined && Math.abs(v) >= 0.005;

export function GstinMarker({ valid, problem }: { valid: boolean | null; problem: string | null }) {
  if (valid === null) return null;
  return valid ? (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-fg-muted sm:text-[11px]">
      <Check className="h-3 w-3" aria-hidden />
      Valid
    </span>
  ) : (
    <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--tt-danger)] sm:text-[11px]">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Invalid{problem && GSTIN_PROBLEM[problem] ? ` · ${GSTIN_PROBLEM[problem]}` : ''}
    </span>
  );
}

type TotalRow = { label: string; value: string };

/**
 * Tax lines of an invoice totals block. Once the server has checked the bill: its CGST / SGST / IGST
 * split (only non-zero lines). Before that: one GST line from the rows, since the split is the server's.
 */
export function taxRows(t: BillTotals, currency: string | null, split: boolean): TotalRow[] {
  const rows: TotalRow[] = [];
  if (!split) {
    if (has(t.tax)) rows.push({ label: 'GST', value: billMoney(t.tax, currency) });
    return rows;
  }
  if (has(t.cgst)) rows.push({ label: 'CGST', value: billMoney(t.cgst, currency) });
  if (has(t.sgst)) rows.push({ label: 'SGST', value: billMoney(t.sgst, currency) });
  if (has(t.igst)) rows.push({ label: 'IGST', value: billMoney(t.igst, currency) });
  if (has(t.cess)) rows.push({ label: 'Cess', value: billMoney(t.cess, currency) });
  if (has(t.otherTax)) rows.push({ label: 'Other tax', value: billMoney(t.otherTax, currency) });
  return rows;
}

export function TotalLine({ label, value, strong, children }: { label: React.ReactNode; value?: React.ReactNode; strong?: boolean; children?: React.ReactNode }) {
  return (
    <div className={cx('flex min-h-7 items-center justify-between gap-3 px-3 py-1', strong ? 'border-t border-line bg-bg-subtle py-2 text-sm font-bold text-fg' : 'text-fg-muted')}>
      <dt className="min-w-0">{label}</dt>
      <dd className="flex shrink-0 items-center gap-1 tabular-nums text-fg">{children ?? value}</dd>
    </div>
  );
}

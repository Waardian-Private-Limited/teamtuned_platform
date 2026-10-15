'use client';

import React from 'react';
import { AlertTriangle, Check, Info, Loader2, Sparkles } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Bill, BillNote } from '../../types/reimbursement.model';
import { BILL_WARNING_NOTES, TAX_MODE_TEXT } from '../../utils/bill';
import { billMoney } from './BillParts';

/** Small marker on a line filled from a receipt. */
export function AiMarker({ label = 'Filled by AI — check before submitting', className }: { label?: string; className?: string }) {
  return (
    <span className={cx('inline-flex max-w-full items-center gap-1 rounded-md border border-dashed border-fg/40 px-1.5 py-0.5 text-[10px] font-semibold text-fg sm:text-[11px]', className)}>
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

// ── Check status ────────────────────────────────────────────────────────────

type CheckState = { tone: 'ok' | 'warn' | 'info'; text: string; short: string | null };

export function billCheck(bill: Bill): CheckState {
  if (bill.reconciled) return { tone: 'ok', text: 'Adds up', short: 'Adds up' };
  if (bill.difference !== null && Math.abs(bill.difference) >= 0.01) {
    const by = billMoney(Math.abs(bill.difference), bill.currency);
    return { tone: 'warn', text: `Off by ${by}`, short: `Off by ${by}` };
  }
  if (!bill.items.length) return { tone: 'info', text: 'Not checked: the bill has no item rows', short: null };
  return { tone: 'info', text: 'Not checked: the bill has no grand total', short: null };
}

function NoteRow({ note }: { note: BillNote }) {
  const warn = BILL_WARNING_NOTES.has(note.code);
  const Icon = warn ? AlertTriangle : Info;
  return (
    <li className={cx('flex items-start gap-1.5 text-[11px] sm:text-xs', warn ? 'text-fg' : 'text-fg-muted')}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{note.message}</span>
    </li>
  );
}

/** `checked`: the server has checked this bill (false while a corrected bill waits for the preview). */
export function BillCheckStatus({ bill, checked = true, pending = false }: { bill: Bill; checked?: boolean; pending?: boolean }) {
  if (pending || !checked) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-fg-muted" aria-live="polite">
        {pending ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden /> : <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />}
        {pending ? 'Checking…' : 'Not checked yet. The bill is checked once the expense has a category and date.'}
      </p>
    );
  }
  const c = billCheck(bill);
  const Icon = c.tone === 'ok' ? Check : c.tone === 'warn' ? AlertTriangle : Info;
  // The mismatch note repeats the status in other words; it is kept for its numbers.
  return (
    <div className="space-y-1" aria-live="polite">
      <p className={cx('flex items-center gap-1.5 text-xs', c.tone === 'warn' ? 'font-semibold text-fg' : c.tone === 'ok' ? 'font-semibold text-fg' : 'text-fg-muted')}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {c.text}
      </p>
      {bill.notes.length > 0 && (
        <ul className="flex flex-col gap-1">
          {bill.notes.map((n, i) => (
            <NoteRow key={`${n.code}-${i}`} note={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function TaxModeText({ bill }: { bill: Bill }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-fg-muted sm:text-xs">
      <Info className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-semibold text-fg">How tax is counted:</span> {TAX_MODE_TEXT[bill.taxMode]}.
      </span>
    </p>
  );
}

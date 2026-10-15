'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { Bill, BillBuyer, BillSeller } from '../../types/reimbursement.model';
import { GstinMarker } from './BillParts';

const SHELL =
  'flex h-8 w-full items-center gap-1 rounded-md border bg-surface px-2 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)]';
const shell = (invalid?: boolean) => cx(SHELL, invalid ? 'border-[var(--tt-danger)]' : 'border-line');
const INPUT = 'w-full min-w-0 border-none bg-transparent p-0 text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0';
const LABEL = 'mb-1 block truncate text-[11px] font-semibold text-fg-muted';
/** Table cells: the column header names the cell on wide screens, the label only on narrow ones. */
const labelClass = (inTable?: boolean, hideLabel?: boolean) => (hideLabel ? 'sr-only' : cx(LABEL, inTable && 'sm:sr-only'));

export function MiniText({ label, value, onChange, placeholder, type = 'text', maxLength, className, aside, upper, inTable, hideLabel, invalid }: {
  label: string;
  inTable?: boolean;
  hideLabel?: boolean;
  invalid?: boolean;
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'email' | 'tel';
  maxLength?: number;
  className?: string;
  aside?: React.ReactNode;
  upper?: boolean;
}) {
  const id = React.useId();
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className={labelClass(inTable, hideLabel)}>
        {label}
        {aside}
      </label>
      <div className={shell(invalid)}>
        <input
          id={id}
          type={type}
          value={value ?? ''}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange((upper ? e.target.value.toUpperCase() : e.target.value) || null)}
          className={INPUT}
        />
      </div>
    </div>
  );
}

function cleanNumber(raw: string, signed: boolean, decimals: number) {
  const neg = signed && raw.trim().startsWith('-');
  const digits = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  const [whole, frac] = digits.split('.');
  return (neg ? '-' : '') + (frac !== undefined ? `${whole}.${frac.slice(0, decimals)}` : whole);
}

function parseNumber(text: string): number | null {
  if (!text || text === '-' || text === '.' || text === '-.') return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/**
 * A number cell. While focused it keeps the text as typed ("12." stays "12."); otherwise it shows
 * the value, which other cells may have just recomputed.
 */
export function MiniNumber({ label, value, onChange, signed = false, decimals = 2, prefix, suffix, className, inTable, hideLabel, placeholder, invalid }: {
  label: string;
  inTable?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
  invalid?: boolean;
  value: number | null;
  onChange: (v: number | null) => void;
  signed?: boolean;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const id = React.useId();
  const [focused, setFocused] = React.useState(false);
  const [text, setText] = React.useState('');
  const shown = focused ? text : value === null ? '' : String(value);
  return (
    <div className={cx('min-w-0', className)}>
      <label htmlFor={id} className={labelClass(inTable, hideLabel)}>
        {label}
      </label>
      <div className={shell(invalid)}>
        {prefix && <span className="shrink-0 text-[11px] font-semibold text-fg-muted">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={shown}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          autoComplete="off"
          onFocus={() => {
            setText(value === null ? '' : String(value));
            setFocused(true);
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const t = cleanNumber(e.target.value, signed, decimals);
            setText(t);
            onChange(parseNumber(t));
          }}
          className={cx(INPUT, 'text-right tabular-nums')}
        />
        {suffix && <span className="shrink-0 text-[11px] font-semibold text-fg-muted">{suffix}</span>}
      </div>
    </div>
  );
}

export function SubHead({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h4 className="text-[11px] font-bold uppercase tracking-wide text-fg-muted">{children}</h4>
      {aside}
    </div>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full items-center justify-center gap-1 rounded-md border border-dashed border-line-strong text-[11px] font-semibold text-fg-muted transition-colors hover:border-fg hover:text-fg"
    >
      <Plus className="h-3.5 w-3.5" aria-hidden />
      {children}
    </button>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="shrink-0 rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/**
 * Seller, buyer and bill facts of a bill. Items, charges and totals are edited in the items table;
 * the server re-reads the bill on the live preview and on save.
 */
export function BillHeaderEditor({ bill, gstinValid, gstinProblem, onChange, invoiceError }: { bill: Bill; gstinValid: boolean | null; gstinProblem: string | null; onChange: (next: Bill) => void; invoiceError?: string }) {
  const commit = onChange;
  const setBill = (patch: Partial<Bill>) => commit({ ...bill, ...patch });
  const setSeller = (patch: Partial<BillSeller>) => commit({ ...bill, seller: { ...bill.seller, ...patch } });
  const setBuyer = (patch: Partial<BillBuyer>) => commit({ ...bill, buyer: { ...bill.buyer, ...patch } });
  const s = bill.seller;
  const b = bill.buyer;

  return (
    <div className="space-y-4">
      <section>
        <SubHead>Bill</SubHead>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MiniText label="Bill no." value={bill.invoiceNumber} onChange={(v) => setBill({ invoiceNumber: v })} maxLength={100} invalid={Boolean(invoiceError)} />
          <MiniText label="Bill date" type="date" value={bill.invoiceDate} onChange={(v) => setBill({ invoiceDate: v })} />
          <MiniText label="Place of supply" value={bill.placeOfSupply} onChange={(v) => setBill({ placeOfSupply: v })} placeholder="State" maxLength={60} className="col-span-2 sm:col-span-1" />
        </div>
        {invoiceError && <p role="alert" className="mt-1 text-xs font-medium text-[var(--tt-danger)]">{invoiceError}</p>}
      </section>

      <section>
        <SubHead>Seller</SubHead>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MiniText label="Name" value={s.name} onChange={(v) => setSeller({ name: v })} maxLength={200} className="sm:col-span-2" />
          <MiniText label="Address" value={s.address} onChange={(v) => setSeller({ address: v })} maxLength={500} className="sm:col-span-2" />
          <div className="grid grid-cols-2 gap-2">
            <MiniText label="State" value={s.state} onChange={(v) => setSeller({ state: v })} maxLength={60} />
            <MiniText label="Pincode" value={s.pincode} onChange={(v) => setSeller({ pincode: v })} maxLength={10} />
          </div>
          <MiniText
            label="GSTIN"
            value={s.gstin}
            upper
            onChange={(v) => setSeller({ gstin: v })}
            maxLength={20}
            aside={<GstinMarker valid={gstinValid} problem={gstinProblem} />}
          />
          <MiniText label="PAN" value={s.pan} upper onChange={(v) => setSeller({ pan: v })} maxLength={10} />
          <MiniText label="Phone" type="tel" value={s.phone} onChange={(v) => setSeller({ phone: v })} maxLength={30} />
          <MiniText label="Email" type="email" value={s.email} onChange={(v) => setSeller({ email: v })} maxLength={120} />
        </div>
      </section>

      <section>
        <SubHead>Billed to</SubHead>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <MiniText label="Name" value={b.name} onChange={(v) => setBuyer({ name: v })} maxLength={200} />
          <MiniText label="GSTIN" value={b.gstin} upper onChange={(v) => setBuyer({ gstin: v })} maxLength={20} />
          <MiniText label="Address" value={b.address} onChange={(v) => setBuyer({ address: v })} maxLength={500} />
          <MiniText label="State" value={b.state} onChange={(v) => setBuyer({ state: v })} maxLength={60} />
        </div>
      </section>
    </div>
  );
}

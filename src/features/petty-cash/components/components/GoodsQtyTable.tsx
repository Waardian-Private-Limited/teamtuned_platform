'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import type { InwardLine, InwardNumbering } from '../../types/petty-cash.model';
import { lineNumbersText, qtyText, type GoodsNumber, type GoodsNumbers } from '../../utils/goods';

interface GoodsQtyTableProps {
  lines: InwardLine[];
  /** Typed quantity per bill line; omit with `readOnly`. */
  values?: Record<number, string>;
  onChange?: (line: number, value: string) => void;
  /** Per-line problem (red border and text under the box). */
  errors?: Record<number, string>;
  readOnly?: boolean;
  disabled?: boolean;
  /** Problem with the quantities as a whole (400 `items`): red border and text. */
  error?: string;
  /** How items are numbered: `typed` shows a number box per row, `auto` only a note. */
  numbering?: InwardNumbering;
  /** Typed number (or the Auto choice) per bill line. */
  numbers?: GoodsNumbers;
  onNumberChange?: (line: number, value: GoodsNumber) => void;
}

const th = 'px-2.5 py-2 text-[11px] font-semibold text-fg-muted sm:text-xs';
const td = 'px-2.5 py-2 text-xs tabular-nums text-fg sm:text-sm';

/** The goods of a bill: ordered, received and pending per item, with a box for what arrives now. */
export function GoodsQtyTable({ lines, values, onChange, errors = {}, readOnly, disabled, error, numbering = 'auto', numbers = {}, onNumberChange }: GoodsQtyTableProps) {
  const typed = !readOnly && numbering === 'typed';
  return (
    <div>
    {!readOnly && numbering === 'auto' && <p className="mb-1.5 text-[11px] text-fg-muted sm:text-xs">Every item received gets its own inward number, generated when you save.</p>}
    <div className={cx('overflow-x-auto rounded-lg border', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <table className={cx('w-full text-left', typed ? 'min-w-[620px]' : 'min-w-[420px]')}>
        <thead className="border-b border-line bg-bg-subtle">
          <tr>
            <th scope="col" className={th}>Item</th>
            <th scope="col" className={cx(th, 'text-right')}>Ordered</th>
            <th scope="col" className={cx(th, 'text-right')}>Received</th>
            <th scope="col" className={cx(th, 'text-right')}>Pending</th>
            {!readOnly && <th scope="col" className={cx(th, 'w-28 text-right')}>Receive now</th>}
            {typed && <th scope="col" className={cx(th, 'w-56')}>Inward no.</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lines.map((l) => {
            const err = errors[l.line];
            return (
              <tr key={l.line} className="align-top">
                <td className={cx(td, 'min-w-0 font-semibold')}>
                  <span className="break-words">{l.name}</span>
                  {l.unit && <span className="ml-1 font-normal text-fg-muted">({l.unit})</span>}
                  {l.numbers.length > 0 && <span className="mt-0.5 block break-words text-[11px] font-normal text-fg-muted">{lineNumbersText(l)}</span>}
                </td>
                <td className={cx(td, 'text-right')}>{qtyText(l.ordered)}</td>
                <td className={cx(td, 'text-right')}>{qtyText(l.received)}</td>
                <td className={cx(td, 'text-right font-semibold')}>{qtyText(l.pending)}</td>
                {!readOnly && (
                  <td className={cx(td, 'text-right')}>
                    {l.pending > 0 ? (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label={`Receive now: ${l.name}`}
                          aria-invalid={Boolean(err) || undefined}
                          disabled={disabled}
                          value={values?.[l.line] ?? ''}
                          onChange={(e) => onChange?.(l.line, e.target.value.replace(/[^\d.]/g, ''))}
                          placeholder="0"
                          className={cx(
                            'h-9 w-24 rounded-lg border bg-surface px-2 text-right text-sm text-fg outline-none transition-colors focus:ring-1 disabled:opacity-60',
                            err ? 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]'
                          )}
                        />
                        {err && <p role="alert" className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{err}</p>}
                      </>
                    ) : (
                      <span className="text-fg-muted">Done</span>
                    )}
                  </td>
                )}
                {typed && (
                  <td className={cx(td, 'text-left')}>
                    {l.pending > 0 ? (
                      <NumberBox name={l.name} value={numbers[l.line] ?? { no: '', auto: false }} disabled={disabled} onChange={(v) => onNumberChange?.(l.line, v)} />
                    ) : null}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {error && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

function NumberBox({ name, value, disabled, onChange }: { name: string; value: GoodsNumber; disabled?: boolean; onChange: (v: GoodsNumber) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="text"
        aria-label={`Inward no.: ${name}`}
        disabled={disabled || value.auto}
        maxLength={40}
        value={value.auto ? '' : value.no}
        onChange={(e) => onChange({ no: e.target.value, auto: false })}
        placeholder={value.auto ? 'Generated on save' : ''}
        className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] disabled:opacity-60"
      />
      <button
        type="button"
        aria-pressed={value.auto}
        aria-label={`Generate an inward number for ${name}`}
        disabled={disabled}
        onClick={() => onChange({ no: '', auto: !value.auto })}
        className={cx(
          'h-9 shrink-0 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)] disabled:opacity-60',
          value.auto ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'
        )}
      >
        Auto
      </button>
    </div>
  );
}

/** "Auto-generate numbers" for a Receive all in typed numbering (sends `auto: true`). */
export function AutoNumbersCheck({ checked, onChange, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; className?: string }) {
  return (
    <label className={cx('flex cursor-pointer items-center gap-2 text-xs text-fg sm:text-sm', className)}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 accent-[var(--tt-primary)]" />
      Auto-generate numbers
    </label>
  );
}

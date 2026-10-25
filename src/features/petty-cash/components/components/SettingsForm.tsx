'use client';

import React from 'react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import { Switch } from '@/components/ui/Switch';
import { INWARD_NUMBERING, PHYSICAL_RULES, SPEND_MODES } from '../../constants/petty-cash.constants';
import type { Settings } from '../../types/petty-cash.model';
import { parseDecimal } from '../../utils/format';

/** An amount (or count) that may be left empty. The text is kept as typed; the value is null while empty. */
function NumberField({ label, value, onChange, error, hint, required, disabled, prefix, suffix, integer }: { label: string; value: number | null; onChange: (v: number | null) => void; error?: string; hint?: React.ReactNode; required?: boolean; disabled?: boolean; prefix?: string; suffix?: string; integer?: boolean }) {
  const [text, setText] = React.useState(value === null ? '' : String(value));
  // Follows the value when it is changed from outside (another settings row opened).
  React.useEffect(() => {
    setText((t) => (t === '' && value === null) || Number(t) === value ? t : value === null ? '' : String(value));
  }, [value]);
  return (
    <TextField
      label={label}
      required={required}
      inputMode={integer ? 'numeric' : 'decimal'}
      prefix={prefix}
      suffix={suffix ? <span className="shrink-0 text-xs font-semibold text-fg-muted">{suffix}</span> : undefined}
      value={text}
      disabled={disabled}
      placeholder={required ? '0' : 'No limit'}
      onChange={(raw) => {
        const next = integer ? raw.replace(/\D/g, '') : parseDecimal(raw);
        setText(next);
        onChange(next === '' || next === '.' ? null : Number(next));
      }}
      error={error}
      hint={hint}
    />
  );
}

function ToggleRow({ title, description, checked, onChange, disabled, error }: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; error?: string }) {
  return (
    <div>
      <div className={cx('flex items-center justify-between gap-3 rounded-xl border p-3', error ? 'border-[var(--tt-danger)]' : 'border-line', disabled && 'opacity-70')}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="text-[11px] text-fg-muted sm:text-xs">{description}</p>
        </div>
        <Switch checked={checked} onChange={onChange} label={title} disabled={disabled} />
      </div>
      <FieldMessage error={error} />
    </div>
  );
}

interface SettingsFormProps {
  value: Settings;
  onChange: (next: Settings) => void;
  /** Field errors keyed like the API (`spend_mode`, `inward_prefix`, …). */
  errors: Record<string, string>;
  /** Clears one field's error once the user edits it. */
  onEdit: (field: string) => void;
  readOnly?: boolean;
}

/** The rules of one settings row (the org default or a company override). */
export function SettingsForm({ value, onChange, errors, onEdit, readOnly }: SettingsFormProps) {
  const set = (patch: Partial<Settings>, field: string) => {
    onChange({ ...value, ...patch });
    onEdit(field);
  };
  return (
    <div className="space-y-5">
      <div>
        <FieldLabel label="Who can spend" required />
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Who can spend">
          {SPEND_MODES.map((m) => {
            const on = value.spendMode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={readOnly}
                onClick={() => set({ spendMode: m.value }, 'spend_mode')}
                className={cx(
                  'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed',
                  errors.spend_mode ? 'border-[var(--tt-danger)]' : on ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle',
                  readOnly && !on && 'opacity-60'
                )}
              >
                <span className="block text-sm font-semibold text-fg">{m.label}</span>
                <span className="mt-0.5 block text-[11px] text-fg-muted sm:text-xs">{m.description}</span>
              </button>
            );
          })}
        </div>
        <FieldMessage error={errors.spend_mode} />
      </div>

      <ToggleRow
        title="Approval required"
        description="Expenses wait in Approvals before they are taken from the wallet. Off: they are approved on submit."
        checked={value.approvalRequired}
        onChange={(v) => set({ approvalRequired: v }, 'approval_required')}
        disabled={readOnly}
        error={errors.approval_required}
      />

      <div className="space-y-3">
        <div>
          <FieldLabel label="Paper bill" required />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Paper bill rule">
            {PHYSICAL_RULES.map((r) => {
              const on = value.physicalCopy === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={readOnly}
                  onClick={() => set({ physicalCopy: r.value }, 'physical_copy')}
                  className={cx(
                    'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed',
                    errors.physical_copy ? 'border-[var(--tt-danger)]' : on ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle',
                    readOnly && !on && 'opacity-60'
                  )}
                >
                  <span className="block text-sm font-semibold text-fg">{r.label}</span>
                  <span className="mt-0.5 block text-[11px] text-fg-muted sm:text-xs">{r.description}</span>
                </button>
              );
            })}
          </div>
          <FieldMessage error={errors.physical_copy} />
        </div>
        {value.physicalCopy === 'above' && (
          <div className="max-w-xs">
            <NumberField label="Paper bill needed above" required prefix="₹" value={value.physicalCopyAbove} onChange={(v) => set({ physicalCopyAbove: v }, 'physical_copy_above')} disabled={readOnly} error={errors.physical_copy_above} />
          </div>
        )}
      </div>

      <div className="space-y-3">
        <ToggleRow
          title="Goods inward"
          description="Expenses of goods categories are received at the site, item by item with quantities. A part delivery can be received now and the rest later; every item received gets its own inward number."
          checked={value.inwardEnabled}
          onChange={(v) => set({ inwardEnabled: v }, 'inward_enabled')}
          disabled={readOnly}
          error={errors.inward_enabled}
        />
      </div>

      <div>
        <FieldLabel label="Inward numbers" required />
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Inward numbers">
          {INWARD_NUMBERING.map((r) => {
            const on = value.inwardNumbering === r.value;
            return (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={readOnly}
                onClick={() => set({ inwardNumbering: r.value }, 'inward_numbering')}
                className={cx(
                  'rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed',
                  errors.inward_numbering ? 'border-[var(--tt-danger)]' : on ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle',
                  readOnly && !on && 'opacity-60'
                )}
              >
                <span className="block text-sm font-semibold text-fg">{r.label}</span>
                <span className="mt-0.5 block text-[11px] text-fg-muted sm:text-xs">{r.description}</span>
              </button>
            );
          })}
        </div>
        <FieldMessage error={errors.inward_numbering} />
      </div>

      <ToggleRow
        title="Cash counts"
        description="Custodians and staff can record the physical cash in a wallet and post any difference."
        checked={value.cashCountEnabled}
        onChange={(v) => set({ cashCountEnabled: v }, 'cash_count_enabled')}
        disabled={readOnly}
        error={errors.cash_count_enabled}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Inward number prefix"
          required
          value={value.inwardPrefix}
          onChange={(v) => set({ inwardPrefix: v.toUpperCase().replace(/[^A-Z0-9]/g, '') }, 'inward_prefix')}
          maxLength={12}
          placeholder="INW"
          disabled={readOnly}
          error={errors.inward_prefix}
          hint={`Letters and digits only. Numbers look like ${value.inwardPrefix || 'INW'}/2026-27/00042`}
        />
        <NumberField label="Receipt needed above" prefix="₹" value={value.receiptRequiredAbove} onChange={(v) => set({ receiptRequiredAbove: v }, 'receipt_required_above')} disabled={readOnly} error={errors.receipt_required_above} hint="Expenses above this amount need a copy of the bill" />
        <NumberField label="Allow entering expenses up to" required integer suffix="days late" value={value.maxBackdateDays} onChange={(v) => set({ maxBackdateDays: v ?? 0 }, 'max_backdate_days')} disabled={readOnly} error={errors.max_backdate_days} />
        <NumberField label="Default maximum per expense" prefix="₹" value={value.defaultMaxPerExpense} onChange={(v) => set({ defaultMaxPerExpense: v }, 'default_max_per_expense')} disabled={readOnly} error={errors.default_max_per_expense} hint="Expenses above it are flagged for the approver, on wallets with no maximum of their own" />
      </div>
    </div>
  );
}

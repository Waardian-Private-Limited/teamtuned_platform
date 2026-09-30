'use client';

import React from 'react';
import { cx } from '@/theme/tokens';

export const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const inputClass = 'w-full min-w-0 border-none bg-transparent text-sm text-fg placeholder:text-fg-subtle outline-none focus:ring-0 disabled:cursor-not-allowed';

export function shellClass(hasError: boolean, disabled?: boolean) {
  return cx(
    'relative flex h-10 w-full items-center gap-2 rounded-lg border bg-surface px-3 transition-colors focus-within:ring-1',
    disabled && 'bg-bg-subtle opacity-60',
    hasError
      ? 'border-[var(--tt-danger)] focus-within:border-[var(--tt-danger)] focus-within:ring-[var(--tt-danger)]'
      : 'border-line focus-within:border-[var(--tt-primary)] focus-within:ring-[var(--tt-primary)]'
  );
}

export function FieldLabel({ label, required, aside }: { label: string; required?: boolean; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={labelClass}>
        {label} {required && <span className="text-[var(--tt-danger)]">*</span>}
      </span>
      {aside}
    </div>
  );
}

export function FieldMessage({ error, hint }: { error?: string; hint?: React.ReactNode }) {
  if (error) return <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{error}</p>;
  return hint ? <p className="mt-1 text-[11px] text-fg-muted">{hint}</p> : null;
}

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'prefix'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  aside?: React.ReactNode;
}

export function TextField({ label, value, onChange, error, hint, required, prefix, suffix, aside, disabled, ...rest }: TextFieldProps) {
  return (
    <div>
      <FieldLabel label={label} required={required} aside={aside} />
      <div className={shellClass(Boolean(error), disabled)}>
        {prefix && <span className="shrink-0 text-xs font-semibold text-fg-muted">{prefix}</span>}
        <input
          {...rest}
          disabled={disabled}
          value={value}
          aria-invalid={Boolean(error) || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        {suffix}
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T | null;
  onChange: (value: T | null) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  numeric?: boolean;
}

export function SelectField<T extends string | number>({
  label, value, onChange, options, placeholder = 'Select…', error, hint, required, disabled, numeric,
}: SelectFieldProps<T>) {
  return (
    <div>
      <FieldLabel label={label} required={required} />
      <div className={shellClass(Boolean(error), disabled)}>
        <select
          value={value === null ? '' : String(value)}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === '') onChange(null);
            else onChange((numeric ? Number(raw) : raw) as T);
          }}
          className={cx(inputClass, value === null && 'text-fg-subtle')}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
          ))}
        </select>
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

export function Section({ title, description, children, aside }: { title: string; description?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-4 sm:p-5 2xl:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-fg sm:text-base">{title}</h3>
          {description && <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function OptionCard({ selected, onClick, title, description, disabled }: { selected: boolean; onClick: () => void; title: string; description?: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
        selected
          ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
          : 'border-line bg-surface hover:bg-bg-subtle'
      )}
    >
      <span className={cx('mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full border', selected ? 'border-[var(--tt-primary)]' : 'border-line-strong')}>
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-[var(--tt-primary)]" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-fg sm:text-sm">{title}</span>
        {description && <span className="mt-0.5 block text-[11px] text-fg-muted sm:text-xs">{description}</span>}
      </span>
    </button>
  );
}

export function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'inline-flex h-8 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'
          : 'border-line bg-surface text-fg hover:bg-bg-subtle'
      )}
    >
      {children}
    </button>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-xs sm:text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="font-semibold text-fg">{value}</span>
    </div>
  );
}

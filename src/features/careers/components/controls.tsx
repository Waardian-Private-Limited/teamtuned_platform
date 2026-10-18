'use client';

// Small accessible form controls for the public pages. Every control has a
// real <label for>, red border + message on error (never a banner), and a
// visible focus ring. Kept local so the public bundle stays independent of
// the authenticated app's form kit.
import { useId } from 'react';
import { cx, text } from '@/theme/tokens';

const shell = (error?: string) =>
  cx(
    'w-full rounded-[var(--tt-radius-control)] border bg-surface px-4 text-base text-fg outline-none transition-[border-color,box-shadow] duration-150',
    'placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:bg-bg-subtle disabled:opacity-60',
    error
      ? 'border-[var(--tt-danger)] ring-4 ring-[var(--tt-danger)]/10'
      : 'border-line hover:border-line-strong focus:border-[var(--tt-primary)] focus:ring-4 focus:ring-[var(--tt-ring)]'
  );

interface WrapProps {
  id: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  as?: 'label' | 'legend';
}

export function FieldWrap({ id, label, required, hint, error, children, as = 'label' }: WrapProps) {
  const labelNode = (
    <>
      {label}
      {required ? (
        <span className="ml-0.5 text-[var(--tt-danger)]" aria-hidden="true">*</span>
      ) : (
        <span className="ml-1.5 text-xs font-normal text-fg-subtle">(optional)</span>
      )}
    </>
  );
  const message = (error || hint) && (
    <p id={`${id}-msg`} role={error ? 'alert' : undefined} className={cx('mt-1.5', error ? text.error : text.caption)}>
      {error || hint}
    </p>
  );
  if (as === 'legend') {
    return (
      <fieldset aria-describedby={error || hint ? `${id}-msg` : undefined}>
        <legend className="mb-2 block text-[13px] font-semibold text-fg">{labelNode}</legend>
        {children}
        {message}
      </fieldset>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-semibold text-fg">{labelNode}</label>
      {children}
      {message}
    </div>
  );
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: React.ReactNode;
}

export function TextInput({ label, value, onChange, error, hint, required, id: idProp, ...rest }: InputProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldWrap id={id} label={label} required={required} hint={hint} error={error}>
      <input
        {...rest}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(shell(error), 'h-12')}
      />
    </FieldWrap>
  );
}

interface AreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: React.ReactNode;
}

export function TextArea({ label, value, onChange, error, hint, required, rows = 4, ...rest }: AreaProps) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        {...rest}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(shell(error), 'resize-y py-3 leading-relaxed')}
      />
    </FieldWrap>
  );
}

interface SelectProps {
  label: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
  required?: boolean;
  hint?: React.ReactNode;
}

export function SelectInput({ label, value, onChange, options, placeholder = 'Select…', error, required, hint }: SelectProps) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} required={required} hint={hint} error={error}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cx(shell(error), 'h-12 appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FieldWrap>
  );
}

interface ChoiceGroupProps {
  label: React.ReactNode;
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  inline?: boolean;
}

/** Radio group rendered as selectable rows (keyboard: arrow keys via native radios). */
export function ChoiceGroup({ label, name, value, onChange, options, error, required, inline }: ChoiceGroupProps) {
  const id = useId();
  return (
    <FieldWrap id={id} label={label} required={required} error={error} as="legend">
      <div className={cx('gap-2', inline ? 'flex flex-wrap' : 'grid')}>
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--tt-radius-control)] border px-4 py-2.5 text-[15px] transition-colors',
                'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--tt-ring)]',
                inline && 'min-w-[96px]',
                checked ? 'border-[var(--tt-primary)] bg-bg-subtle font-medium text-fg' : error ? 'border-[var(--tt-danger)] text-fg' : 'border-line text-fg hover:border-line-strong'
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="h-4 w-4 shrink-0 accent-[var(--tt-primary)]"
              />
              <span className="min-w-0 break-words">{o.label}</span>
            </label>
          );
        })}
      </div>
    </FieldWrap>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  error?: string;
  id?: string;
}

export function Checkbox({ checked, onChange, children, error, id: idProp }: CheckboxProps) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <div>
      <label
        htmlFor={id}
        className={cx(
          'flex cursor-pointer items-start gap-3 rounded-[var(--tt-radius-control)] border p-4 text-sm leading-relaxed text-fg-muted transition-colors',
          'has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[var(--tt-ring)]',
          error ? 'border-[var(--tt-danger)] ring-4 ring-[var(--tt-danger)]/10' : 'border-line hover:border-line-strong'
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-msg` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--tt-primary)]"
        />
        <span className="min-w-0">{children}</span>
      </label>
      {error && (
        <p id={`${id}-msg`} role="alert" className={cx('mt-1.5', text.error)}>{error}</p>
      )}
    </div>
  );
}

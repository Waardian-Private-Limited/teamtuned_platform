'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { cx } from '@/theme/tokens';
import { money } from '../../utils/format';

// 16px text on phones stops iOS zooming into the field.
const inputBase =
  'h-11 w-full min-w-0 rounded-lg border bg-surface text-base text-fg placeholder:text-fg-subtle outline-none transition-colors disabled:cursor-not-allowed disabled:bg-bg-subtle sm:h-10 sm:text-sm';
const inputIdle = 'border-line focus:border-fg focus:ring-1 focus:ring-fg';
const inputError = 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';

/** True while the declaration window is closed: every field shows but can't be changed. */
export const ReadOnlyContext = createContext(false);

export const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
export const hintClass = 'mt-1 text-xs text-fg-muted';
export const errorClass = 'mt-1 text-xs font-medium text-[var(--tt-danger)]';

/** Shows the error in place of the hint; a field never shows both. */
export function FieldNote({ error, hint, id }: { error?: string; hint?: ReactNode; id?: string }) {
  if (error) return <p id={id} className={errorClass}>{error}</p>;
  return hint ? <p id={id} className={hintClass}>{hint}</p> : null;
}

export function AmountField({
  label,
  value,
  onChange,
  error,
  hint,
  verified,
  invalid,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  /** The amount HR checked against proofs, when there is one. */
  verified?: number;
  /** Red border only, for a group whose message shows once below it. */
  invalid?: boolean;
  /** Shown under the field, e.g. its proof files. */
  children?: ReactNode;
}) {
  const id = useId();
  const readOnly = useContext(ReadOnlyContext);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-fg-muted">₹</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          placeholder="0"
          aria-invalid={Boolean(error) || invalid}
          aria-describedby={`${id}-note`}
          className={cx(inputBase, 'pl-7 pr-3 tabular-nums', error || invalid ? inputError : inputIdle)}
        />
      </div>
      <FieldNote id={`${id}-note`} error={error} hint={hint} />
      {verified !== undefined && (
        <p className="mt-1 text-xs font-semibold text-fg">Verified by HR: {money(verified)}</p>
      )}
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  maxLength,
  upper,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  maxLength?: number;
  /** PAN and TAN are typed in capitals. */
  upper?: boolean;
  /** Red border only, for a group whose message shows once below it. */
  invalid?: boolean;
}) {
  const id = useId();
  const readOnly = useContext(ReadOnlyContext);
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(upper ? e.target.value.toUpperCase() : e.target.value)}
        disabled={readOnly}
        placeholder={placeholder}
        maxLength={maxLength}
        autoCapitalize={upper ? 'characters' : undefined}
        aria-invalid={Boolean(error) || invalid}
        aria-describedby={`${id}-note`}
        className={cx(inputBase, 'px-3', upper && 'uppercase tracking-wide', error || invalid ? inputError : inputIdle)}
      />
      <FieldNote id={`${id}-note`} error={error} hint={hint} />
    </div>
  );
}

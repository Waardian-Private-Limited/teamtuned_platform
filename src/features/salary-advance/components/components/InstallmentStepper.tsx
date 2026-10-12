'use client';

import { Minus, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';

interface InstallmentStepperProps {
  value: number;
  onChange: (value: number) => void;
  max: number;
  min?: number;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

const stepClass =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-40';

export function InstallmentStepper({ value, onChange, max, min = 1, disabled, error, hint }: InstallmentStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div>
      <FieldLabel label="Instalments" required />
      <div className={cx('inline-flex h-10 items-stretch overflow-hidden rounded-lg border bg-surface', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <button type="button" aria-label="Fewer instalments" disabled={disabled || value <= min} onClick={() => onChange(clamp(value - 1))} className={stepClass}>
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-label="Instalments"
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          className="w-14 border-x border-line bg-transparent text-center text-sm font-semibold tabular-nums text-fg outline-none [appearance:textfield] disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" aria-label="More instalments" disabled={disabled || value >= max} onClick={() => onChange(clamp(value + 1))} className={stepClass}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

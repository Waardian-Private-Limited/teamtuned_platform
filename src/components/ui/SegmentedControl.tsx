'use client';

import { cx } from '@/theme/tokens';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

// Generalises the login screen's method-switch pill (AuthTabs) to any number
// of options, for any set of string values.
export function SegmentedControl<T extends string>({ options, value, onChange, disabled }: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className="grid gap-1 rounded-[var(--tt-radius-md)] bg-bg-subtle p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cx(
              'h-9 rounded-[var(--tt-radius-sm)] text-sm font-semibold transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSelected ? 'bg-surface text-fg shadow-[var(--tt-shadow-sm)]' : 'text-fg-muted hover:text-fg'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

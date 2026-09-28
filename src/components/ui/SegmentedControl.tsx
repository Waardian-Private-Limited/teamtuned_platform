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
  className?: string;
  /** When true, each tab sizes according to its text content and padding rather than equal grid columns */
  fitText?: boolean;
}

/**
 * Modern Segmented Control with comfortable padding, crisp active state,
 * and responsive text sizing so labels like "Archived" and "Inactive" breathe easily.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  className,
  fitText = false,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cx(
        fitText
          ? 'inline-flex h-9 items-center gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5'
          : 'grid h-9 items-center gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5',
        className
      )}
      style={fitText ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
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
              'flex h-[30px] items-center justify-center rounded-md px-2.5 text-xs font-semibold transition-all duration-150 whitespace-nowrap select-none sm:text-[13px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              isSelected
                ? 'bg-surface text-fg font-bold shadow-xs border border-line/70'
                : 'text-fg-muted hover:text-fg hover:bg-surface/40'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

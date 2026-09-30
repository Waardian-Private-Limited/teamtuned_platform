'use client';

import { cx } from '@/theme/tokens';

export function FilterTabs<T extends string>({ options, value, onChange, counts }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1 tt-scroll-hidden">
      {options.map((o) => {
        const active = value === o.value;
        const count = counts ? counts[o.value] : undefined;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors 2xl:h-9 2xl:text-sm',
              active ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle hover:text-fg'
            )}
          >
            {o.label}
            {count !== undefined && <span className={cx('rounded px-1 text-[10px] 2xl:text-xs', active ? 'bg-[var(--tt-on-primary)]/20' : 'bg-bg-subtle')}>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

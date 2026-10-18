'use client';

import { useRef } from 'react';
import { cx } from '@/theme/tokens';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  idPrefix: string;
  className?: string;
  ariaLabel?: string;
}

/** Underline tab bar (roving focus with arrow keys). Pair panels with id `${idPrefix}-panel-${value}`. */
export function Tabs<T extends string>({ tabs, value, onChange, idPrefix, className, ariaLabel }: TabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = (e: React.KeyboardEvent) => {
    const at = tabs.findIndex((t) => t.value === value);
    let next = -1;
    if (e.key === 'ArrowRight') next = (at + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (at - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].value);
    refs.current[tabs[next].value]?.focus();
  };
  return (
    <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} className={cx('flex gap-4 overflow-x-auto tt-scroll-hidden border-b border-line sm:gap-5', className)}>
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => { refs.current[tab.value] = el; }}
            id={`${idPrefix}-tab-${tab.value}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cx(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2.5 pt-1 text-xs font-semibold transition-colors sm:text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tt-primary)]',
              selected ? 'border-fg text-fg' : 'border-transparent text-fg-muted hover:text-fg'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cx(
                'min-w-[18px] rounded-full border px-1.5 text-center text-[10px] font-bold leading-4 tabular-nums',
                selected ? 'border-fg bg-fg text-fg-inverted' : 'border-line text-fg-muted'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

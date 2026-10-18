'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { useRemoteOptions } from '../../hooks/useRemoteOptions';
import type { PickerOption } from '../../types/siteSubOrgMapper.model';

interface RemoteSearchSelectProps {
  label: string;
  value: PickerOption | null;
  onChange: (value: PickerOption | null) => void;
  load: (search: string) => Promise<PickerOption[]>;
  // 'filter' renders a compact toolbar trigger with an "All …" reset entry;
  // 'field' renders a full-width form control.
  variant?: 'filter' | 'field';
  placeholder?: string;
  allLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

// Dropdown whose options come from the server on every (debounced) search,
// so long lists never have to be fetched up front. Styled to match
// SearchableFilterDropdown.
export function RemoteSearchSelect({
  label,
  value,
  onChange,
  load,
  variant = 'field',
  placeholder,
  allLabel,
  invalid = false,
  disabled = false,
  className,
}: RemoteSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const { options, isLoading, error } = useRemoteOptions(load, query, open);

  const isFilter = variant === 'filter';
  const emptyLabel = isFilter ? allLabel || `All ${label.toLowerCase()}` : placeholder || `Select ${label.toLowerCase()}…`;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    setQuery('');
  }, [open]);

  function select(next: PickerOption | null) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cx('relative text-left', isFilter ? 'inline-block' : 'block w-full', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={cx(
          'flex items-center justify-between gap-2 rounded-lg border bg-surface outline-none transition-colors',
          isFilter ? 'h-9 px-2.5 text-xs font-semibold text-fg sm:text-sm' : 'h-10 w-full px-3 text-sm text-fg',
          disabled && 'cursor-not-allowed bg-bg-subtle opacity-70',
          invalid
            ? 'border-[var(--tt-danger)] ring-1 ring-[var(--tt-danger)]/30'
            : open
            ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]'
            : value
            ? isFilter ? 'border-[var(--tt-primary)]/40' : 'border-line'
            : 'border-line hover:border-line-strong hover:bg-bg-subtle/60'
        )}
      >
        <span className={cx('truncate', isFilter ? 'max-w-[130px] sm:max-w-[160px]' : 'min-w-0', !value && !isFilter && 'text-fg-subtle')}>
          {value ? value.label : emptyLabel}
          {value?.hint && !isFilter && <span className="ml-2 text-[11px] text-fg-muted">{value.hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && isFilter && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                select(null);
              }}
              title="Clear filter"
              className="rounded p-0.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={cx('h-3.5 w-3.5 text-fg-muted transition-transform duration-150', open && 'rotate-180 text-fg')} />
        </span>
      </button>

      {open && (
        <div
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          className={cx(
            'absolute left-0 z-50 mt-1.5 rounded-xl border border-line bg-surface p-1.5 shadow-lg',
            isFilter ? 'min-w-[210px] max-w-[280px] sm:min-w-[240px]' : 'w-full'
          )}
        >
          <div className="relative flex items-center rounded-lg border border-line/80 bg-bg-subtle/80 px-2.5 py-1.5 focus-within:border-[var(--tt-primary)] focus-within:bg-surface focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none"
            />
            {isLoading ? (
              <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-fg-muted border-t-transparent" />
            ) : (
              query && (
                <button type="button" onClick={() => setQuery('')} className="rounded p-0.5 text-fg-muted hover:text-fg">
                  <X className="h-3 w-3" />
                </button>
              )
            )}
          </div>

          <ul id={listId} role="listbox" className="mt-1.5 max-h-52 space-y-0.5 overflow-y-auto p-0.5 text-xs tt-scrollbar">
            {isFilter && (
              <>
                <li role="option" aria-selected={!value}>
                  <button
                    type="button"
                    onClick={() => select(null)}
                    className={cx(
                      'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-bg-subtle',
                      !value ? 'bg-bg-subtle/60 font-semibold text-fg' : 'text-fg-muted hover:text-fg'
                    )}
                  >
                    <span>{emptyLabel}</span>
                    {!value && <Check className="h-3.5 w-3.5 shrink-0 text-fg" />}
                  </button>
                </li>
                <li className="my-1 border-t border-line/50" />
              </>
            )}

            {error ? (
              <li className="px-3 py-3 text-center text-xs text-[var(--tt-danger)]">{error}</li>
            ) : options.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-fg-muted">
                {isLoading ? 'Searching…' : query ? `No ${label.toLowerCase()} match "${query}"` : `No ${label.toLowerCase()} available`}
              </li>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value?.value;
                return (
                  <li key={opt.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => select(opt)}
                      className={cx(
                        'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-fg transition-colors hover:bg-bg-subtle',
                        isSelected && 'bg-bg-subtle/80 font-semibold'
                      )}
                    >
                      <span className="min-w-0 truncate">
                        {opt.label}
                        {opt.hint && <span className="ml-1.5 font-normal text-fg-muted">{opt.hint}</span>}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-fg" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

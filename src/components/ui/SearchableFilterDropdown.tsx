'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';

export interface FilterOption {
  value: number;
  label: string;
}

interface SearchableFilterDropdownProps {
  label: string;
  allLabel?: string;
  value: number | null | undefined;
  options: FilterOption[];
  onChange: (value: number | null) => void;
  className?: string;
  searchPlaceholder?: string;
}

export function SearchableFilterDropdown({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
  searchPlaceholder,
}: SearchableFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const defaultAll = allLabel || `All ${label.toLowerCase()}`;
  const selected = options.find((o) => o.value === value) || null;

  // Filter options based on query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Auto focus input when opening & reset query when closing
  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    setQuery('');
  }, [open]);

  // Escape key to close
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handleSelect(val: number | null) {
    onChange(val);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cx('relative inline-block text-left', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'flex h-9 items-center justify-between gap-2 rounded-lg border bg-surface px-2.5 text-xs font-semibold text-fg outline-none transition-colors sm:text-sm',
          open
            ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)] shadow-2xs'
            : value !== null && value !== undefined
            ? 'border-[var(--tt-primary)]/40 bg-surface text-fg'
            : 'border-line text-fg hover:border-line-strong hover:bg-bg-subtle/60'
        )}
      >
        <span className="truncate max-w-[130px] sm:max-w-[160px]">
          {selected ? selected.label : defaultAll}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {/* Quick Clear Button */}
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(null);
              }}
              title="Clear filter"
              className="rounded p-0.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cx(
              'h-3.5 w-3.5 text-fg-muted transition-transform duration-150',
              open && 'rotate-180 text-fg'
            )}
          />
        </span>
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div
          onKeyDown={handleKeyDown}
          className="absolute left-0 z-50 mt-1.5 min-w-[210px] sm:min-w-[240px] max-w-[280px] rounded-xl border border-line bg-surface p-1.5 shadow-lg backdrop-blur-md animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Search Box Header */}
          <div className="relative flex items-center rounded-lg border border-line/80 bg-bg-subtle/80 px-2.5 py-1.5 focus-within:border-[var(--tt-primary)] focus-within:bg-surface focus-within:ring-1 focus-within:ring-[var(--tt-primary)]">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder || `Search ${label.toLowerCase()}…`}
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="rounded p-0.5 text-fg-muted hover:text-fg"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <ul
            id={listId}
            role="listbox"
            className="mt-1.5 max-h-52 overflow-y-auto tt-scrollbar space-y-0.5 p-0.5 text-xs sm:text-sm"
          >
            {/* "All" reset option */}
            <li role="option" aria-selected={value === null || value === undefined}>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cx(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-bg-subtle',
                  value === null || value === undefined
                    ? 'font-semibold text-fg bg-bg-subtle/60'
                    : 'text-fg-muted hover:text-fg'
                )}
              >
                <span>{defaultAll}</span>
                {(value === null || value === undefined) && (
                  <Check className="h-3.5 w-3.5 text-[var(--tt-primary)] shrink-0" />
                )}
              </button>
            </li>

            <li className="border-t border-line/50 my-1" />

            {/* Filtered items */}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-xs text-fg-muted">
                No {label.toLowerCase()} match &quot;{query}&quot;
              </li>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={cx(
                        'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-bg-subtle',
                        isSelected
                          ? 'font-semibold text-fg bg-bg-subtle/80'
                          : 'text-fg'
                      )}
                    >
                      <span className="truncate pr-2">{opt.label}</span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-[var(--tt-primary)] shrink-0" />
                      )}
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

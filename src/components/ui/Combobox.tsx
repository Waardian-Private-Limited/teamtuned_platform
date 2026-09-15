'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cx, field, text } from '@/theme/tokens';

export interface ComboboxOption {
  value: string | number;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  clearable?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** When provided, filtering is assumed to happen server-side and this fires on every keystroke instead of filtering `options` locally. */
  onSearch?: (term: string) => void;
}

// Searchable single-select with keyboard navigation. react-select is already
// a dependency but ships its own unstyled chrome; this stays token-native so
// the head picker reads as part of the same design system as everything else.
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyLabel = 'No results',
  clearable = true,
  disabled,
  loading,
  onSearch,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) || null;

  const filtered = useMemo(() => {
    if (onSearch) return options; // server already filtered
    const t = term.trim().toLowerCase();
    if (!t) return options;
    return options.filter((o) => o.label.toLowerCase().includes(t));
  }, [options, term, onSearch]);

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
      setHighlighted(0);
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
    setTerm('');
  }, [open]);

  useEffect(() => {
    onSearch?.(term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  function commit(option: ComboboxOption | null) {
    onChange(option ? option.value : null);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[highlighted];
      if (opt) commit(opt);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cx(
          'flex h-10 w-full items-center justify-between rounded-lg border bg-surface px-3 text-xs sm:text-sm transition-all',
          disabled
            ? 'cursor-not-allowed border-line bg-bg-subtle opacity-50'
            : open
              ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)] shadow-xs'
              : 'border-line hover:border-line-strong'
        )}
      >
        <span className={cx('truncate', selected ? 'font-medium text-fg' : 'text-fg-subtle')}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 ml-2">
          {clearable && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); commit(null); }}
              aria-label="Clear selection"
              className="rounded p-0.5 text-fg-subtle hover:bg-bg-subtle hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cx('h-4 w-4 text-fg-subtle transition-transform duration-150', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--tt-shadow-md)]">
          <div className="flex items-center gap-2 border-b border-line bg-bg-subtle/50 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs sm:text-sm text-fg outline-none placeholder:text-fg-subtle"
            />
          </div>
          <ul role="listbox" id={listId} className="max-h-56 overflow-y-auto tt-scroll-hidden p-1">
            {loading && <li className={cx('px-3 py-2.5 text-xs sm:text-sm text-fg-muted')}>Loading…</li>}
            {!loading && filtered.length === 0 && <li className={cx('px-3 py-2.5 text-xs sm:text-sm text-fg-muted')}>{emptyLabel}</li>}
            {!loading &&
              filtered.map((opt, i) => (
                <li key={opt.value} role="option" aria-selected={opt.value === value}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlighted(i)}
                    onClick={() => commit(opt)}
                    className={cx(
                      'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs sm:text-sm transition-colors',
                      i === highlighted && 'bg-bg-subtle',
                      opt.value === value ? 'font-semibold text-fg' : 'text-fg'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block truncate text-[11px] text-fg-muted">{opt.description}</span>
                      )}
                    </span>
                    {opt.value === value && <Check className="h-4 w-4 shrink-0 text-[var(--tt-primary)]" />}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

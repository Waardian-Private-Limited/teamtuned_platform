'use client';

import React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, shellClass } from '@/components/ui/FormControls';

interface Props {
  label: string;
  options: { value: number; label: string }[];
  value: number[];
  onChange: (next: number[]) => void;
  placeholder?: string;
  emptyHint?: string;
  hint?: string;
}

export function MultiSelectField({ label, options, value, onChange, placeholder = 'Any', emptyHint = 'Nothing to choose from yet', hint }: Props) {
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState('');
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const chosen = options.filter((o) => value.includes(o.value));
  const shown = options.filter((o) => o.label.toLowerCase().includes(term.trim().toLowerCase()));
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div ref={root} className="relative">
      <FieldLabel label={label} />
      <button type="button" onClick={() => setOpen((o) => !o)} className={cx(shellClass(false), 'justify-between text-left')} aria-expanded={open}>
        <span className={cx('truncate text-sm', value.length ? 'text-fg' : 'text-fg-subtle')}>
          {value.length ? `${value.length} selected` : placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-fg-muted" />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-line bg-surface shadow-[var(--tt-shadow-lg)]">
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-line bg-transparent px-3 py-2 text-sm outline-none placeholder:text-fg-subtle"
          />
          <ul className="max-h-52 overflow-y-auto py-1">
            {shown.length === 0 && <li className="px-3 py-2 text-xs text-fg-muted">{options.length === 0 ? emptyHint : 'No matches'}</li>}
            {shown.map((o) => {
              const on = value.includes(o.value);
              return (
                <li key={o.value}>
                  <button type="button" onClick={() => toggle(o.value)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg hover:bg-bg-subtle">
                    <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-fg bg-fg text-fg-inverted' : 'border-line-strong')}>
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="truncate">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {chosen.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {chosen.map((o) => (
            <span key={o.value} className="inline-flex items-center gap-1 rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-fg">
              {o.label}
              <button type="button" aria-label={`Remove ${o.label}`} onClick={() => toggle(o.value)} className="text-fg-muted hover:text-fg"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      {hint && <p className="mt-1 text-[11px] text-fg-muted">{hint}</p>}
    </div>
  );
}

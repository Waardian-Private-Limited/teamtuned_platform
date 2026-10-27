'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage, shellClass } from '@/components/ui/FormControls';
import * as api from '../../api/labour.api';
import type { Labourer } from '../../types/labour.types';
import { fullName } from '../../utils/format';
import type { Opt } from '../../hooks/useLabourLists';

/** Multi-select of sites with an inline search; shows the selection count. */
export function SiteMultiSelect({ options, value, onChange, error, disabledNotes }: { options: Opt[]; value: number[]; onChange: (v: number[]) => void; error?: string; disabledNotes?: Record<number, string> }) {
  const [q, setQ] = useState('');
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()));
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <FieldLabel label="Sites" aside={<span className="text-[11px] text-fg-muted">{value.length} selected</span>} />
      <div className={cx('rounded-lg border bg-surface', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        <div className="flex items-center gap-2 border-b border-line px-3 py-2">
          <Search className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search sites…" aria-label="Search sites" className="w-full border-none bg-transparent text-xs outline-none focus:ring-0 sm:text-sm" />
        </div>
        <ul className="max-h-40 overflow-auto tt-scroll-hidden p-1">
          {shown.length === 0 && <li className="px-3 py-3 text-xs text-fg-muted">No sites found.</li>}
          {shown.map((o) => {
            const on = value.includes(o.value);
            const note = disabledNotes?.[o.value];
            return (
              <li key={o.value}>
                <button type="button" disabled={!!note} onClick={() => toggle(o.value)} aria-pressed={on} className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent sm:text-sm">
                  <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong')}>
                    {on && <Check className="h-3 w-3" aria-hidden />}
                  </span>
                  <span className="truncate">{o.label}</span>
                  {note && <span className="ml-auto shrink-0 text-[11px] text-fg-muted">{note}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <FieldMessage error={error} />
    </div>
  );
}

/** Server-searched labourer picker (never loads the whole roll). */
export function LabourerPicker({ value, onChange, label = 'Labourer', error, disabled, params, required = true, hint }: {
  value: Labourer | null; onChange: (l: Labourer | null) => void; label?: string; error?: string; disabled?: boolean;
  /** Narrows the search, e.g. `{ contractorId, siteId }`. */
  params?: Record<string, number | string | null | undefined>;
  required?: boolean;
  hint?: string;
}) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Labourer[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const paramKey = JSON.stringify(params || {});
  useEffect(() => {
    if (!open) return;
    const extra = JSON.parse(paramKey) as Record<string, number | string | null>;
    const t = setTimeout(() => {
      api.listLabourers({ ...extra, search: q.trim() || undefined, pageSize: 8 }).then((r) => setItems(r.items || [])).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open, paramKey]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={box} className="relative">
      <FieldLabel label={label} required={required} />
      <div className={shellClass(Boolean(error), disabled)}>
        <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
        <input
          disabled={disabled}
          value={open ? q : value ? `${value.code} · ${fullName(value)}` : ''}
          onFocus={() => { setOpen(true); setQ(''); }}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, code or phone…"
          aria-invalid={Boolean(error) || undefined}
          className="w-full min-w-0 border-none bg-transparent text-sm outline-none placeholder:text-fg-subtle focus:ring-0"
        />
        {!required && value && !disabled && (
          <button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={() => onChange(null)} className="shrink-0 text-fg-subtle hover:text-fg"><X className="h-3.5 w-3.5" aria-hidden /></button>
        )}
      </div>
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-surface p-1 shadow-[var(--tt-shadow-md)]">
          {items.length === 0 && <li className="px-3 py-3 text-xs text-fg-muted">No labourers found.</li>}
          {items.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => { onChange(l); setOpen(false); }} className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs hover:bg-bg-subtle sm:text-sm">
                <span className="truncate font-semibold">{fullName(l)}</span>
                <span className="shrink-0 text-fg-muted">{l.code}{l.siteName ? ` · ${l.siteName}` : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

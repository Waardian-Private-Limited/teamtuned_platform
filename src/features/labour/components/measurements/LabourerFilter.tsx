'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import * as api from '../../api/labour.api';
import type { Labourer } from '../../types/labour.types';
import { fullName } from '../../utils/format';
import { selectCls } from '../shared/Primitives';

/** Filter-bar labourer picker: any labourer, gang entries only, or one labourer (searched on the server). */
export function LabourerFilter({ value, onChange }: { value: Labourer | 'gang' | null; onChange: (v: Labourer | 'gang' | null) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Labourer[]>([]);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => api.listLabourers({ search: q.trim() || undefined, pageSize: 8 }).then((r) => setItems(r.items || [])).catch(() => setItems([])), 250);
    return () => clearTimeout(t);
  }, [q, open]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const label = value === 'gang' ? 'Gang entries' : value ? `${value.code} · ${fullName(value)}` : 'All labourers';
  const pick = (v: Labourer | 'gang' | null) => { onChange(v); setOpen(false); setQ(''); };
  const item = 'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-xs hover:bg-bg-subtle sm:text-sm';
  return (
    <div ref={box} className="relative min-w-0 md:w-48">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label="Labourer" onClick={() => setOpen((o) => !o)} className={cx(selectCls, 'flex w-full items-center justify-between gap-2 text-left')}>
        <span className="truncate">{label}</span><ChevronDown className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-64 rounded-lg border border-line bg-surface p-1 shadow-[var(--tt-shadow-md)]">
          <div className="flex items-center gap-2 border-b border-line px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-fg-subtle" aria-hidden />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or code…" aria-label="Search labourers" className="w-full border-none bg-transparent text-xs outline-none focus:ring-0 sm:text-sm" />
          </div>
          <ul role="listbox" className="max-h-56 overflow-auto tt-scroll-hidden pt-1">
            <li><button type="button" className={cx(item, value === null && 'font-semibold')} onClick={() => pick(null)}>All labourers</button></li>
            <li><button type="button" className={cx(item, value === 'gang' && 'font-semibold')} onClick={() => pick('gang')}>Gang entries (whole team)</button></li>
            {items.map((l) => (
              <li key={l.id}>
                <button type="button" className={item} onClick={() => pick(l)}>
                  <span className="truncate font-semibold">{fullName(l)}</span><span className="shrink-0 text-fg-muted">{l.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

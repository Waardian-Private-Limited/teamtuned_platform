'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { inputCls } from '@/features/data-collection/components/shared/Ui';
import * as api from '../api/tm.api';
import type { PersonOption } from '../types/tm.types';

/** Search-as-you-type employee picker. `multiple` keeps a list of chips; otherwise the choice replaces the previous one. */
export function PersonPicker({ value, onChange, multiple = false, placeholder = 'Search by name or code', invalid }: { value: PersonOption[]; onChange: (v: PersonOption[]) => void; multiple?: boolean; placeholder?: string; invalid?: boolean }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<PersonOption[]>([]);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => {
      const mine = (seq.current += 1);
      api.searchPeople(q).then((r) => { if (mine === seq.current) setItems(r.items); }).catch(() => { if (mine === seq.current) setItems([]); });
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const pick = (p: PersonOption) => {
    onChange(multiple ? [...value.filter((v) => v.id !== p.id), p] : [p]);
    setQ('');
    if (!multiple) setOpen(false);
  };

  return (
    <div className="relative">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-semibold text-fg">
              {p.name}
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => onChange(value.filter((v) => v.id !== p.id))} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <input className={inputCls(invalid)} value={q} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onBlur={() => setTimeout(() => setOpen(false), 150)} aria-label={placeholder} />
      {open && items.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-[var(--tt-shadow-lg)]">
          {items.map((p) => (
            <li key={p.id}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-bg-subtle"><span className="truncate font-semibold text-fg">{p.name}</span><span className="shrink-0 text-xs text-fg-muted">{p.employee_code}</span></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

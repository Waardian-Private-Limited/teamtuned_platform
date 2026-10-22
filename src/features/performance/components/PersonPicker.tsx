'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { TextField } from '@/components/ui/FormControls';
import type { PersonOption } from '../types/perf.types';

/** Search a person by name or code and pick one. `search` decides who can be found (the server filters too). */
export function PersonPicker({ label, value, onChange, search, placeholder = 'Search by name or code', error, listOnFocus = false }: {
  label: string; value: PersonOption | null; onChange: (p: PersonOption | null) => void; search: (q: string) => Promise<{ items: PersonOption[] }>;
  placeholder?: string; error?: string; listOnFocus?: boolean;
}) {
  const [q, setQ] = React.useState('');
  const [items, setItems] = React.useState<PersonOption[]>([]);
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (value || !open || (!listOnFocus && q.trim().length < 2)) { setItems([]); return undefined; }
    const t = setTimeout(() => { search(q.trim()).then((d) => setItems(d.items)).catch(() => setItems([])); }, 250);
    return () => clearTimeout(t);
  }, [q, open, value, search, listOnFocus]);

  if (value) {
    return (
      <div>
        <p className="mb-1.5 text-xs font-semibold text-fg">{label}</p>
        <div className="flex h-10 items-center justify-between rounded-lg border border-line bg-surface px-3 text-sm text-fg">
          <span className="truncate">{value.name}{value.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{value.employee_code}</span>}</span>
          <button type="button" aria-label="Choose someone else" onClick={() => { onChange(null); setQ(''); }} className="rounded p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="relative" onFocus={() => setOpen(true)}>
      <TextField label={label} value={q} onChange={setQ} placeholder={placeholder} prefix={<Search className="h-3.5 w-3.5" />} error={error} />
      {items.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-line bg-surface shadow-[var(--tt-shadow-sm)]">
          {items.map((x) => <li key={x.id}><button type="button" onClick={() => { onChange(x); setItems([]); setOpen(false); }} className="w-full px-3 py-2 text-left text-sm text-fg hover:bg-bg-subtle">{x.name}{x.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{x.employee_code}</span>}</button></li>)}
        </ul>
      )}
    </div>
  );
}

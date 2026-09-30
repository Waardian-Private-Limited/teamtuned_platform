'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FieldLabel, FieldMessage } from '@/components/ui/FormControls';
import type { RatingLevel } from '../../types/compensation.dto';

const cell = 'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';

export function RatingScaleEditor({ value, onChange, error }: { value: RatingLevel[]; onChange: (v: RatingLevel[]) => void; error?: string }) {
  const set = (i: number, patch: Partial<RatingLevel>) => onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div>
      <FieldLabel label="Rating → increment guide" aside={<span className="mb-1.5 text-[11px] text-fg-muted">Default % per rating</span>} />
      <div className="space-y-2">
        {value.map((r, i) => (
          <div key={i} className="grid grid-cols-[4rem_1fr_6rem_auto] items-center gap-2">
            <input className={cell} value={r.rating} onChange={(e) => set(i, { rating: e.target.value.slice(0, 20) })} aria-label="Rating code" />
            <input className={cell} value={r.label} onChange={(e) => set(i, { label: e.target.value.slice(0, 60) })} aria-label="Rating label" />
            <div className="relative">
              <input className={cell} inputMode="decimal" value={String(r.percent)} onChange={(e) => set(i, { percent: Number(e.target.value.replace(/[^\d.-]/g, '')) || 0 })} aria-label="Increment percent" />
              <span className="pointer-events-none absolute right-2.5 top-2 text-xs text-fg-muted">%</span>
            </div>
            <button type="button" aria-label="Remove level" onClick={() => onChange(value.filter((_, idx) => idx !== i))} disabled={value.length <= 1} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle disabled:opacity-30">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {value.length < 10 && (
        <button type="button" onClick={() => onChange([...value, { rating: String(value.length + 1), label: 'New level', percent: 0 }])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add level
        </button>
      )}
      <FieldMessage error={error} />
    </div>
  );
}

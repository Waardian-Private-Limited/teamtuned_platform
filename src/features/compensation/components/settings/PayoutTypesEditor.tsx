'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FieldMessage } from '@/components/ui/FormControls';
import type { PayoutTypeConfig } from '../../types/compensation.dto';

const cell = 'h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';

export function PayoutTypesEditor({ value, onChange, error }: { value: PayoutTypeConfig[]; onChange: (v: PayoutTypeConfig[]) => void; error?: string }) {
  const set = (i: number, patch: Partial<PayoutTypeConfig>) => onChange(value.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  return (
    <div>
      <div className="space-y-2">
        {value.map((t, i) => (
          <div key={t.code || i} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
            <input className={cell} value={t.label} onChange={(e) => set(i, { label: e.target.value.slice(0, 60) })} aria-label="Payout type name" />
            <label className="flex items-center gap-1.5 text-xs text-fg"><input type="checkbox" checked={t.taxable} onChange={(e) => set(i, { taxable: e.target.checked })} />Taxable</label>
            <label className="flex items-center gap-1.5 text-xs text-fg"><input type="checkbox" checked={t.active} onChange={(e) => set(i, { active: e.target.checked })} />Active</label>
            <button type="button" aria-label="Remove type" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      {value.length < 50 && (
        <button type="button" onClick={() => onChange([...value, { code: '', label: 'New payout type', taxable: true, active: true }])} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add payout type
        </button>
      )}
      <p className="mt-2 text-[11px] text-fg-muted">Arrears, statutory bonus, gratuity and recovery are managed by the system and always available.</p>
      <FieldMessage error={error} />
    </div>
  );
}

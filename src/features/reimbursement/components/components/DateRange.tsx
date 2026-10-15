'use client';

import { X } from 'lucide-react';

/** From/to date pair for statements. Empty means open-ended. */
export function DateRange({ value, onChange }: { value: { from: string; to: string }; onChange: (v: { from: string; to: string }) => void }) {
  const cls = 'h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-xs text-fg sm:w-36 sm:flex-none sm:text-sm';
  return (
    <div className="flex w-full items-center gap-1.5 sm:w-auto">
      <input type="date" aria-label="From" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} className={cls} />
      <span className="text-xs text-fg-muted">to</span>
      <input type="date" aria-label="To" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} className={cls} />
      {(value.from || value.to) && (
        <button type="button" aria-label="Clear dates" onClick={() => onChange({ from: '', to: '' })} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

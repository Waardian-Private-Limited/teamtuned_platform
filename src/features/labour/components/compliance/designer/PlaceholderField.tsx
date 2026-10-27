'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Braces } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage, shellClass } from '@/components/ui/FormControls';

/** Placeholders from `GET /compliance/catalogue`, shared by every text field in the designer. */
export const CatalogueContext = createContext<Array<{ key: string; label: string }>>([]);

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  multiline?: boolean;
  hint?: string;
  /** Hides the placeholder button for fields that cannot hold placeholders (labels, column names). */
  plain?: boolean;
  required?: boolean;
}

/** A text input with a "{ }" button that inserts a `{{placeholder}}` at the caret. */
export function PlaceholderField({ label, value, onChange, error, multiline, hint, plain, required }: Props) {
  const catalogue = useContext(CatalogueContext);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    setOpen(false);
    setQ('');
    setCustom('');
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + token.length, start + token.length); });
  };

  const shown = catalogue.filter((f) => `${f.key} ${f.label}`.toLowerCase().includes(q.trim().toLowerCase()));
  const common = { ref, value, 'aria-invalid': Boolean(error) || undefined, onChange: (e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(e.target.value), className: 'w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0' };

  return (
    <div ref={box} className="relative">
      <FieldLabel label={label} required={required} />
      <div className={cx(shellClass(Boolean(error)), multiline && 'h-auto items-start py-2')}>
        {multiline ? <textarea {...common} rows={4} className={cx(common.className, 'resize-y')} /> : <input {...common} />}
        {!plain && (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Insert placeholder" aria-expanded={open} title="Insert placeholder" className="shrink-0 rounded-md p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg">
            <Braces className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 max-w-[90vw] rounded-lg border border-line bg-surface p-2 shadow-[var(--tt-shadow-md)]">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fields…" aria-label="Search placeholders" className="mb-2 h-8 w-full rounded-md border border-line px-2 text-xs outline-none focus:border-[var(--tt-primary)]" />
          <ul className="max-h-48 overflow-auto tt-scroll-hidden">
            {shown.map((f) => (
              <li key={f.key}><button type="button" onClick={() => insert(f.key)} className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-bg-subtle"><span className="text-xs font-semibold text-fg">{f.label}</span><span className="text-[11px] text-fg-muted">{`{{${f.key}}}`}</span></button></li>
            ))}
            {shown.length === 0 && <li className="px-2 py-2 text-xs text-fg-muted">No match.</li>}
          </ul>
          <form className="mt-2 flex gap-1.5 border-t border-line pt-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) insert(`profile.${custom.trim()}`); }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value.toLowerCase())} placeholder="pack field key" aria-label="Pack field key" className="h-8 min-w-0 flex-1 rounded-md border border-line px-2 text-xs outline-none focus:border-[var(--tt-primary)]" />
            <button type="submit" className="h-8 shrink-0 rounded-md border border-line px-2 text-xs font-semibold hover:bg-bg-subtle">Add profile.</button>
          </form>
        </div>
      )}
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

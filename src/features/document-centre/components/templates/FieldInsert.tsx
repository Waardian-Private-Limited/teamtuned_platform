'use client';

import type { FieldDto } from '../../types/documents.dto';

/** "Insert field" picker: hands back {{key}} to put at the cursor. */
export function FieldInsert({ fields, inputs, onInsert }: { fields: FieldDto[]; inputs: { key: string; label: string }[]; onInsert: (token: string) => void }) {
  return (
    <select
      value=""
      onChange={(e) => { if (e.target.value) onInsert(`{{${e.target.value}}}`); }}
      aria-label="Insert a field"
      className="h-7 max-w-[11rem] cursor-pointer rounded-md border border-line bg-surface px-1.5 text-[11px] font-semibold text-fg-muted hover:text-fg"
    >
      <option value="">+ Insert field</option>
      {inputs.length > 0 && (
        <optgroup label="Asked when generating">
          {inputs.map((i) => <option key={i.key} value={`input.${i.key}`}>{i.label}</option>)}
        </optgroup>
      )}
      <optgroup label="From the candidate / offer">
        {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
      </optgroup>
    </select>
  );
}

/** Inserts `token` into a textarea / input at the cursor and returns the new value. */
export function insertAt(el: HTMLTextAreaElement | HTMLInputElement | null, value: string, token: string): string {
  if (!el) return `${value}${token}`;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + token.length, start + token.length);
  });
  return next;
}

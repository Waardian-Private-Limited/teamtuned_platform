'use client';

import React from 'react';
import { FieldLabel, FieldMessage, TextField } from '@/components/ui/FormControls';
import type { CompensationSettings } from '../../types/compensation.dto';

type Letters = CompensationSettings['letters'];
type Kind = 'increment' | 'promotion';

const area = 'w-full resize-y rounded-lg border border-line bg-surface p-3 text-sm leading-relaxed text-fg outline-none focus:border-[var(--tt-primary)]';

export function LettersEditor({ value, onChange, placeholders, error }: { value: Letters; onChange: (v: Letters) => void; placeholders: string[]; error?: (field: string) => string | undefined }) {
  const [kind, setKind] = React.useState<Kind>('increment');
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const setBlock = (patch: Partial<Letters[Kind]>) => onChange({ ...value, [kind]: { ...value[kind], ...patch } });

  const insert = (token: string) => {
    const el = ref.current;
    const text = value[kind].body;
    const at = el ? el.selectionStart : text.length;
    setBlock({ body: `${text.slice(0, at)}{{${token}}}${text.slice(el ? el.selectionEnd : at)}` });
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-line bg-bg-subtle p-0.5">
        {(['increment', 'promotion'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${kind === k ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted'}`}>
            {k === 'increment' ? 'Increment letter' : 'Promotion letter'}
          </button>
        ))}
      </div>
      <TextField label="Title" value={value[kind].title} onChange={(v) => setBlock({ title: v })} maxLength={150} error={error?.(`letters.${kind}.title`)} />
      <div>
        <FieldLabel label="Letter text" />
        <textarea ref={ref} rows={9} value={value[kind].body} onChange={(e) => setBlock({ body: e.target.value.slice(0, 8000) })} className={area} />
        <FieldMessage error={error?.(`letters.${kind}.body`)} hint="Leave a blank line between paragraphs. Click a field to insert it." />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {placeholders.map((p) => (
            <button key={p} type="button" onClick={() => insert(p)} className="rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-fg hover:bg-surface">{`{{${p}}}`}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Signed by" value={value.signatory} onChange={(v) => onChange({ ...value, signatory: v })} maxLength={120} placeholder="e.g., Head of HR" />
        <label className="flex items-center gap-2 pt-6 text-sm text-fg">
          <input type="checkbox" checked={value.includeStructure} onChange={(e) => onChange({ ...value, includeStructure: e.target.checked })} />
          Attach revised salary structure table
        </label>
      </div>
    </div>
  );
}

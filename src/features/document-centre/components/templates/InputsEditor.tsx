'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import type { FieldDto, InputType, TemplateInput } from '../../types/documents.dto';

const TYPES: { value: InputType; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'money', label: 'Amount' },
];

const cls = 'h-9 w-full rounded-lg border bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';

/** Keys from labels: "Reporting time" → reporting_time. */
function keyOf(label: string, taken: Set<string>) {
  const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'f_$1').slice(0, 36) || 'field';
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  return key;
}

/**
 * What HR is asked when generating (e.g. joining date, reporting time). Each becomes a field
 * {{input.key}}; its starting value can be today's date, a candidate/offer field, or fixed text.
 */
export function InputsEditor({ inputs, onChange, fields, error }: { inputs: TemplateInput[]; onChange: (v: TemplateInput[]) => void; fields: FieldDto[]; error?: (path: string) => string | undefined }) {
  const set = (i: number, patch: Partial<TemplateInput>) => onChange(inputs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const isField = (d: string) => d === 'today' || fields.some((f) => f.key === d);
  return (
    <div className="space-y-2">
      {inputs.map((inp, i) => (
        <div key={inp.key} className="space-y-2 rounded-lg border border-line p-2.5">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_8rem]">
            <div>
              <input value={inp.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Label, e.g. Reporting time" aria-label="Input label" className={cx(cls, error?.(`inputs.${i}.label`) ? 'border-[var(--tt-danger)]' : 'border-line')} />
              <p className="mt-1 font-mono text-[11px] text-fg-subtle">{`{{input.${inp.key}}}`}</p>
            </div>
            <select value={inp.type} onChange={(e) => set(i, { type: e.target.value as InputType })} aria-label="Input type" className={cx(cls, 'border-line')}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
            <div className="flex gap-2">
              <select
                value={isField(inp.default) ? inp.default : inp.default ? '__text' : ''}
                onChange={(e) => set(i, { default: e.target.value === '__text' ? ' ' : e.target.value })}
                aria-label="Starting value"
                className={cx(cls, 'border-line')}
              >
                <option value="">Starts empty</option>
                {inp.type === 'date' && <option value="today">Today</option>}
                <option value="__text">Fixed text…</option>
                <optgroup label="From the candidate / offer">
                  {fields.filter((f) => f.key !== 'today' && !f.key.startsWith('letter.')).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </optgroup>
              </select>
              {!isField(inp.default) && inp.default !== '' && (
                <input value={inp.default.trimStart()} onChange={(e) => set(i, { default: e.target.value })} placeholder="Starting text" aria-label="Starting text" className={cx(cls, 'border-line')} />
              )}
            </div>
            <label className="flex items-center gap-2 text-xs text-fg"><Switch checked={inp.required} onChange={(v) => set(i, { required: v })} label="Required" /> Required</label>
            <button type="button" onClick={() => onChange(inputs.filter((_, j) => j !== i))} aria-label={`Remove ${inp.label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg"><Trash2 className="h-4 w-4" /></button>
          </div>
          {error?.(`inputs.${i}.default`) && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{error(`inputs.${i}.default`)}</p>}
        </div>
      ))}
      <button
        type="button"
        disabled={inputs.length >= 15}
        onClick={() => onChange([...inputs, { key: keyOf(`field ${inputs.length + 1}`, new Set(inputs.map((x) => x.key))), label: '', type: 'text', default: '', required: false }])}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2.5 text-xs font-semibold text-fg-muted hover:text-fg"
      >
        <Plus className="h-3.5 w-3.5" /> Add a detail to ask
      </button>
    </div>
  );
}

export { keyOf };

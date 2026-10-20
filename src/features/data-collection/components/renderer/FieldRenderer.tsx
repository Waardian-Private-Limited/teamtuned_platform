'use client';

import { useRef, useState } from 'react';
import { Camera, FileUp, MapPin, Plus, Star, Trash2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { Btn, inputCls } from '../shared/Ui';
import type { Attachment, Errors, FieldDef, Values } from '../../types/dc.types';
import { isVisible } from '../../utils/schema';
import { SignaturePad } from './SignaturePad';

export interface RenderEnv {
  readOnly?: boolean;
  /** Uploads a file and returns the attachment to keep in the values. Absent in the builder preview. */
  upload?: (file: File | Blob) => Promise<Attachment>;
}

interface FieldProps { field: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string; env: RenderEnv }

const labelOf = (f: FieldDef) => (
  <span className="mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]">{f.label}{f.required && <span className="text-[var(--tt-danger)]"> *</span>}</span>
);
const note = (f: FieldDef, error?: string) => (error ? <span role="alert" className="mt-1.5 block text-xs font-medium text-[var(--tt-danger)]">{error}</span> : f.help ? <span className="mt-1 block text-[11px] text-fg-muted">{f.help}</span> : null);

function Files({ field, value, onChange, error, env }: FieldProps) {
  const list = (Array.isArray(value) ? value : []) as Attachment[];
  const max = field.type === 'signature' ? 1 : field.config?.max_files || 1;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | File[]) => {
    if (!env.upload) return;
    setBusy(true); setProblem('');
    try {
      const next = [...list];
      for (const f of Array.from(files)) { if (next.length >= max) break; next.push(await env.upload(f)); }
      onChange(next);
    } catch (e) { setProblem(messageOf(e)); } finally { setBusy(false); if (input.current) input.current.value = ''; }
  };
  const shown = error || problem;
  return (
    <div>
      {labelOf(field)}
      <div className={cx('rounded-lg border bg-surface p-3', shown ? 'border-[var(--tt-danger)]' : 'border-line')}>
        {list.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {list.map((a, i) => (
              <li key={`${a.key || a.url}-${i}`} className="flex items-center justify-between gap-2 rounded-md bg-bg-subtle px-2.5 py-1.5 text-xs">
                <span className="min-w-0 truncate font-medium text-fg">{a.name}</span>
                {!env.readOnly && <button type="button" aria-label="Remove file" onClick={() => onChange(list.filter((_, j) => j !== i))} className="shrink-0 text-fg-muted hover:text-fg"><X className="h-3.5 w-3.5" /></button>}
                {env.readOnly && a.url && <a href={a.url} target="_blank" rel="noreferrer" className="shrink-0 font-semibold underline">Open</a>}
              </li>
            ))}
          </ul>
        )}
        {!env.readOnly && field.type === 'signature' && list.length === 0 && <SignaturePad disabled={!env.upload || busy} onDone={(blob) => add([new File([blob], 'signature.png', { type: 'image/png' })])} />}
        {!env.readOnly && field.type !== 'signature' && list.length < max && (
          <>
            <input ref={input} type="file" hidden multiple={max > 1} accept={field.type === 'photo' ? 'image/*' : 'application/pdf,image/*'} {...(field.type === 'photo' && field.config?.camera_only ? { capture: 'environment' as const } : {})} onChange={(e) => e.target.files && add(e.target.files)} />
            <Btn busy={busy} disabled={!env.upload} icon={field.type === 'photo' ? <Camera className="h-4 w-4" /> : <FileUp className="h-4 w-4" />} onClick={() => input.current?.click()}>
              {field.type === 'photo' ? 'Take or add photo' : 'Add file'}
            </Btn>
            {!env.upload && <span className="ml-2 text-[11px] text-fg-muted">Preview only</span>}
          </>
        )}
        {list.length === 0 && env.readOnly && <span className="text-xs text-fg-muted">Nothing attached</span>}
      </div>
      {note(field, shown)}
    </div>
  );
}

function Location({ field, value, onChange, error, env }: FieldProps) {
  const v = value as { lat: number; lng: number; accuracy: number | null } | undefined;
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const capture = () => {
    if (!navigator.geolocation) { setProblem('This device cannot share its location'); return; }
    setBusy(true); setProblem('');
    navigator.geolocation.getCurrentPosition(
      (p) => { onChange({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }); setBusy(false); },
      () => { setProblem('Turn on location for this site and try again'); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };
  const shown = error || problem;
  return (
    <div>
      {labelOf(field)}
      <div className={cx('flex flex-wrap items-center gap-3 rounded-lg border bg-surface p-3', shown ? 'border-[var(--tt-danger)]' : 'border-line')}>
        {v ? <span className="text-xs font-medium text-fg">{v.lat.toFixed(5)}, {v.lng.toFixed(5)}{v.accuracy ? ` · ±${Math.round(v.accuracy)} m` : ''}</span> : <span className="text-xs text-fg-muted">Not captured</span>}
        {!env.readOnly && <Btn busy={busy} icon={<MapPin className="h-4 w-4" />} onClick={capture}>{v ? 'Capture again' : 'Capture location'}</Btn>}
      </div>
      {note(field, shown)}
    </div>
  );
}

function Choice({ field, value, onChange, error, env }: FieldProps) {
  const opts = field.options || [];
  const multi = field.type === 'multi_choice';
  const cur = multi ? ((Array.isArray(value) ? value : []) as string[]) : (value as string | undefined);
  return (
    <div>
      {labelOf(field)}
      <div className={cx('space-y-1.5 rounded-lg border bg-surface p-3', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
        {opts.map((o) => {
          const on = multi ? (cur as string[]).includes(o.value) : cur === o.value;
          return (
            <label key={o.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-fg">
              <input type={multi ? 'checkbox' : 'radio'} disabled={env.readOnly} checked={on} name={field.key} className="h-4 w-4 accent-black"
                onChange={() => onChange(multi ? (on ? (cur as string[]).filter((x) => x !== o.value) : [...(cur as string[]), o.value]) : o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
      {note(field, error)}
    </div>
  );
}

export function FieldRenderer(props: FieldProps) {
  const { field: f, value, onChange, error, env } = props;
  const ro = env.readOnly;
  switch (f.type) {
    case 'section': return <h3 className="border-b border-line pb-1.5 pt-2 text-sm font-bold text-fg">{f.label}{f.help && <span className="mt-0.5 block text-[11px] font-normal text-fg-muted">{f.help}</span>}</h3>;
    case 'reference': return (
      <div className="rounded-lg border border-line bg-bg-subtle p-3 text-xs">
        <span className="font-semibold text-fg">{f.label}</span>
        {f.ref?.url ? <a href={f.ref.url} target="_blank" rel="noreferrer" className="ml-2 font-semibold underline">Open reference</a> : <span className="ml-2 text-fg-muted">No file added</span>}
      </div>
    );
    case 'textarea': return (
      <label className="block">{labelOf(f)}
        <textarea rows={3} disabled={ro} value={(value as string) ?? ''} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls(Boolean(error)), 'h-auto py-2')} />{note(f, error)}
      </label>
    );
    case 'yes_no': return (
      <div>{labelOf(f)}
        <div className={cx('inline-flex overflow-hidden rounded-lg border', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
          {[true, false].map((b) => (
            <button key={String(b)} type="button" disabled={ro} onClick={() => onChange(b)} className={cx('h-9 w-20 text-sm font-semibold transition-colors', value === b ? 'bg-fg text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted hover:bg-bg-subtle')}>{b ? 'Yes' : 'No'}</button>
          ))}
        </div>
        {note(f, error)}
      </div>
    );
    case 'rating': {
      const max = f.config?.max || 5;
      return (
        <div>{labelOf(f)}
          <div className={cx('inline-flex flex-wrap gap-1 rounded-lg border bg-surface p-1.5', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" disabled={ro} aria-label={`${n} of ${max}`} onClick={() => onChange(n)} className="p-0.5">
                <Star className={cx('h-5 w-5', Number(value) >= n ? 'fill-fg text-fg' : 'text-fg-subtle')} />
              </button>
            ))}
          </div>
          {note(f, error)}
        </div>
      );
    }
    case 'single_choice': case 'multi_choice': return <Choice {...props} />;
    case 'dropdown': return (
      <label className="block">{labelOf(f)}
        <select disabled={ro} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} className={inputCls(Boolean(error))}>
          <option value="">Select…</option>
          {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>{note(f, error)}
      </label>
    );
    case 'photo': case 'file': case 'signature': return <Files {...props} />;
    case 'location': return <Location {...props} />;
    case 'group': return null;
    case 'list': return <ListItems {...props} />;
    default: {
      const type = f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : f.type === 'datetime' ? 'datetime-local' : 'text';
      return (
        <label className="block">{labelOf(f)}
          <input type={type} step={f.type === 'currency' ? '0.01' : f.validation?.integer ? '1' : 'any'} disabled={ro} value={(value as string | number) ?? ''} placeholder={f.placeholder}
            onChange={(e) => onChange(e.target.value)} className={inputCls(Boolean(error))} />
          {note(f, error)}
        </label>
      );
    }
  }
}

/** Several short answers of one kind ("List of items"): one box per item, add / remove. */
function ListItems({ field: f, value, onChange, error, env }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string; env: RenderEnv }) {
  const items = (Array.isArray(value) ? value : []) as (string | number)[];
  const shown = items.length ? items : [''];
  const max = f.config?.max_items || 20;
  const label = f.config?.item_label || 'Item';
  const set = (next: (string | number)[]) => onChange(next);
  return (
    <div>
      {labelOf(f)}
      <div className="space-y-2">
        {shown.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right text-xs font-semibold tabular-nums text-fg-muted">{i + 1}.</span>
            <input aria-label={`${label} ${i + 1}`} type={f.config?.item_type === 'number' ? 'number' : 'text'} disabled={env.readOnly} value={it ?? ''} placeholder={label}
              onChange={(e) => { const next = [...shown]; next[i] = e.target.value; set(next); }} className={inputCls(Boolean(error))} />
            {!env.readOnly && shown.length > 1 && <button type="button" aria-label={`Remove ${label} ${i + 1}`} onClick={() => set(shown.filter((_, j) => j !== i))} className="p-1 text-fg-muted hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
      </div>
      {!env.readOnly && <Btn className="mt-2" disabled={shown.length >= max} icon={<Plus className="h-4 w-4" />} onClick={() => set([...shown, ''])}>Add {label.toLowerCase()}</Btn>}
      {note(f, error)}
    </div>
  );
}

/**
 * A subform: its fields repeat once per entry ("Completed tasks" -> task name, status, times for each task).
 * Single-entry subforms show the fields once with no add / remove.
 */
export function GroupRenderer({ field, rows, onChange, errors, env, path }: { field: FieldDef; rows: Values[]; onChange: (rows: Values[]) => void; errors: Errors; env: RenderEnv; path: string }) {
  const multiple = field.config?.multiple !== false;
  const max = multiple ? field.config?.max_rows || 20 : 1;
  const entry = field.config?.entry_label || 'Entry';
  const shown = !multiple && rows.length === 0 ? [{}] : rows;
  const addEntry = () => onChange([...rows, {}]);
  return (
    <div className="space-y-3 rounded-xl border border-line p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-bold text-fg">{field.label}{field.required && <span className="text-[var(--tt-danger)]"> *</span>}</span>
          {field.help && <p className="text-xs text-fg-muted">{field.help}</p>}
        </div>
        {multiple && <span className="text-xs font-semibold tabular-nums text-fg-muted">{rows.length} {entry.toLowerCase()}{rows.length === 1 ? '' : 's'}</span>}
      </div>
      {errors[path] && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors[path]}</p>}
      {multiple && rows.length === 0 && <p className="rounded-lg border border-dashed border-line p-3 text-center text-xs text-fg-muted">No {entry.toLowerCase()} added yet</p>}
      {shown.map((row, i) => (
        <div key={i} className="rounded-lg border border-line bg-bg-subtle/40 p-3">
          <div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{multiple ? `${entry} ${i + 1}` : entry}</span>
            {multiple && !env.readOnly && <button type="button" aria-label={`Remove ${entry} ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-fg-muted hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>}
          </div>
          <FieldList fields={field.fields || []} values={row} onChange={(v) => onChange(!multiple && rows.length === 0 ? [v] : rows.map((r, j) => (j === i ? v : r)))} errors={errors} env={env} prefix={`${path}[${i}]`} />
        </div>
      ))}
      {multiple && !env.readOnly && <Btn disabled={rows.length >= max} icon={<Plus className="h-4 w-4" />} onClick={addEntry}>Add {entry.toLowerCase()}</Btn>}
    </div>
  );
}

export function FieldList({ fields, values, onChange, errors, env, prefix = '' }: { fields: FieldDef[]; values: Values; onChange: (v: Values) => void; errors: Errors; env: RenderEnv; prefix?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        if (!isVisible(f, values)) return null;
        const path = prefix ? `${prefix}.${f.key}` : f.key;
        const wide = f.width !== 'half' || f.type === 'section' || f.type === 'group';
        return (
          <div key={f.key} className={wide ? 'sm:col-span-2' : ''}>
            {f.type === 'group'
              ? <GroupRenderer field={f} rows={(Array.isArray(values[f.key]) ? values[f.key] : []) as Values[]} onChange={(rows) => onChange({ ...values, [f.key]: rows })} errors={errors} env={env} path={path} />
              : <FieldRenderer field={f} value={values[f.key]} onChange={(v) => onChange({ ...values, [f.key]: v })} error={errors[path]} env={env} />}
          </div>
        );
      })}
    </div>
  );
}

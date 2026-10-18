'use client';

import { useRef } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import type { AssetDto, FieldDto, TemplateBlock } from '../../types/documents.dto';
import { FieldInsert, insertAt } from './FieldInsert';

const inputCls = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';
const labelCls = 'mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-fg';

interface Ctx {
  fields: FieldDto[];
  inputs: { key: string; label: string }[];
  signatories: AssetDto[];
  error?: (path: string) => string | undefined;
}

function TextArea({ label, value, onChange, ctx, rows = 6, error }: { label: string; value: string; onChange: (v: string) => void; ctx: Ctx; rows?: number; error?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <div>
      <div className={labelCls}>
        <span>{label}</span>
        <FieldInsert fields={ctx.fields} inputs={ctx.inputs} onInsert={(t) => onChange(insertAt(ref.current, value, t))} />
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error) || undefined}
        className={cx('w-full resize-y rounded-lg border bg-surface px-3 py-2 font-mono text-[13px] leading-relaxed text-fg outline-none focus:border-[var(--tt-primary)]', error ? 'border-[var(--tt-danger)]' : 'border-line')}
      />
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

function Line({ label, value, onChange, ctx, placeholder, error }: { label: string; value: string; onChange: (v: string) => void; ctx?: Ctx; placeholder?: string; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="min-w-0">
      <div className={labelCls}>
        <span>{label}</span>
        {ctx && <FieldInsert fields={ctx.fields} inputs={ctx.inputs} onInsert={(t) => onChange(insertAt(ref.current, value, t))} />}
      </div>
      <input ref={ref} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, error && 'border-[var(--tt-danger)]')} />
      {error && <p className="mt-1 text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm text-fg">
      {label}
      <Switch checked={checked} onChange={onChange} label={label} />
    </label>
  );
}

/** The settings of one block. `path` is its index for server error mapping ("blocks.3.text"). */
export function BlockEditor({ block, onChange, ctx, index }: { block: TemplateBlock; onChange: (b: TemplateBlock) => void; ctx: Ctx; index: number }) {
  const err = (k: string) => ctx.error?.(`blocks.${index}.${k}`);
  switch (block.type) {
    case 'letterhead':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Show logo" checked={block.showLogo} onChange={(v) => onChange({ ...block, showLogo: v })} />
          <Toggle label="Show address" checked={block.showAddress} onChange={(v) => onChange({ ...block, showAddress: v })} />
        </div>
      );
    case 'meta':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle label="Reference number" checked={block.showReference} onChange={(v) => onChange({ ...block, showReference: v })} />
          <Toggle label="Letter date" checked={block.showDate} onChange={(v) => onChange({ ...block, showDate: v })} />
        </div>
      );
    case 'title':
      return (
        <div className="space-y-2">
          <Line label="Title" value={block.text} onChange={(v) => onChange({ ...block, text: v })} ctx={ctx} error={err('text')} />
          <SegmentedControl options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Centre' }] as const} value={block.align} onChange={(v) => onChange({ ...block, align: v })} />
        </div>
      );
    case 'text':
      return <TextArea label="Text" value={block.text} onChange={(v) => onChange({ ...block, text: v })} ctx={ctx} rows={8} error={err('text')} />;
    case 'footer_note':
      return <TextArea label="Note" value={block.text} onChange={(v) => onChange({ ...block, text: v })} ctx={ctx} rows={3} error={err('text')} />;
    case 'acceptance':
      return <TextArea label="Acceptance text (empty = standard wording)" value={block.text} onChange={(v) => onChange({ ...block, text: v })} ctx={ctx} rows={3} error={err('text')} />;
    case 'spacer':
      return <SegmentedControl options={[{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] as const} value={block.size} onChange={(v) => onChange({ ...block, size: v })} />;
    case 'page_break':
      return <p className="text-xs text-fg-muted">Everything after this starts on a new page.</p>;
    case 'table':
      return (
        <div className="space-y-2">
          <Line label="Heading (optional)" value={block.heading} onChange={(v) => onChange({ ...block, heading: v })} error={err('heading')} />
          {block.rows.map((r, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-end gap-2">
              <Line label={`Row ${i + 1} label`} value={r.label} onChange={(v) => onChange({ ...block, rows: block.rows.map((x, j) => (j === i ? { ...x, label: v } : x)) })} error={err(`rows.${i}.label`)} />
              <Line label="Value" value={r.value} ctx={ctx} onChange={(v) => onChange({ ...block, rows: block.rows.map((x, j) => (j === i ? { ...x, value: v } : x)) })} error={err(`rows.${i}.value`)} />
              <button type="button" onClick={() => onChange({ ...block, rows: block.rows.filter((_, j) => j !== i) })} disabled={block.rows.length === 1} aria-label={`Remove row ${i + 1}`} className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => onChange({ ...block, rows: [...block.rows, { label: '', value: '' }] })} disabled={block.rows.length >= 30} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2.5 text-xs font-semibold text-fg-muted hover:text-fg">
            <Plus className="h-3.5 w-3.5" /> Add row
          </button>
        </div>
      );
    case 'signatures':
      return (
        <div className="space-y-3">
          <Line label="Closing line" value={block.closing} onChange={(v) => onChange({ ...block, closing: v })} ctx={ctx} placeholder="e.g. For {{company.name}}" error={err('closing')} />
          {block.slots.map((s, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-2.5">
              <div className="grid gap-2 sm:grid-cols-2">
                <Line label={`Signature ${i + 1} caption`} value={s.label} onChange={(v) => onChange({ ...block, slots: block.slots.map((x, j) => (j === i ? { ...x, label: v } : x)) })} placeholder="e.g. Authorised signatory" />
                <div>
                  <div className={labelCls}><span>Signed by</span></div>
                  <select
                    value={s.signatoryId ?? ''}
                    onChange={(e) => onChange({ ...block, slots: block.slots.map((x, j) => (j === i ? { ...x, signatoryId: e.target.value ? Number(e.target.value) : null } : x)) })}
                    className={inputCls}
                  >
                    <option value="">Choose when generating</option>
                    {ctx.signatories.map((p) => <option key={p.id} value={p.id}>{p.designation ? `${p.name}, ${p.designation}` : p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-fg"><Switch checked={s.showStamp} onChange={(v) => onChange({ ...block, slots: block.slots.map((x, j) => (j === i ? { ...x, showStamp: v } : x)) })} label="Company stamp" /> Company stamp</label>
                <button type="button" onClick={() => onChange({ ...block, slots: block.slots.filter((_, j) => j !== i) })} disabled={block.slots.length === 1} className="text-xs font-semibold text-fg-muted hover:text-fg disabled:opacity-30">Remove</button>
              </div>
            </div>
          ))}
          {block.slots.length < 3 && (
            <button type="button" onClick={() => onChange({ ...block, slots: [...block.slots, { label: '', signatoryId: null, showStamp: false }] })} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-2.5 text-xs font-semibold text-fg-muted hover:text-fg">
              <Plus className="h-3.5 w-3.5" /> Add signature
            </button>
          )}
        </div>
      );
    default:
      return null;
  }
}

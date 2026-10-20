'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { AutoText } from '../shared/AutoText';
import { Btn, Checkbox, Labeled, inputCls } from '../shared/Ui';
import { HAS_OPTIONS, METRIC_TYPES, NO_VALUE, OPS, TYPE_INFO } from '../../constants/dc.constants';
import type { FieldDef } from '../../types/dc.types';

interface Props { field: FieldDef; above: FieldDef[]; onChange: (patch: Partial<FieldDef>) => void }

const num = (v: string) => (v === '' ? undefined : Number(v));

type Opt = NonNullable<FieldDef['options']>[number];

/** A short list shown in full (each choice wraps to as many lines as it needs), unlike a native select. */
function ChoiceList<T extends string | boolean>({ label, items, value, onChange }: { label: string; items: { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-line p-1">
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={String(it.value)} type="button" role="radio" aria-checked={on} onClick={() => onChange(it.value)}
            className={cx('flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors sm:text-sm', on ? 'bg-fg text-bg' : 'text-fg hover:bg-bg-subtle')}>
            <span className={cx('mt-1 h-2.5 w-2.5 shrink-0 rounded-full border', on ? 'border-bg bg-bg' : 'border-line-strong')} />
            <span className="min-w-0 whitespace-pre-wrap break-words">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** One option row: drag handle, full-text label (wraps), optional score, remove. */
function OptionRow({ id, o, onLabel, onScore, onRemove }: { id: string; o: Opt; onLabel: (v: string) => void; onScore: (v: number | undefined) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx('flex items-start gap-1.5', isDragging && 'relative z-10 opacity-60')}>
      <button type="button" aria-label={`Drag ${o.label || 'option'}`} {...attributes} {...listeners} className="mt-2 shrink-0 cursor-grab touch-none rounded p-0.5 text-fg-subtle hover:bg-bg-subtle active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
      <AutoText ariaLabel="Option label" value={o.label} onChange={onLabel} className="min-w-0 flex-1" />
      <input aria-label="Score" type="number" placeholder="Score" className={`${inputCls()} !w-20 shrink-0`} value={o.score ?? ''} onChange={(e) => onScore(num(e.target.value))} />
      <button type="button" aria-label="Remove option" onClick={onRemove} className="mt-1.5 shrink-0 p-1 text-fg-muted hover:text-[var(--tt-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function OptionList({ opts, onChange }: { opts: Opt[]; onChange: (next: Opt[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = opts.map((_, i) => `opt-${i}`);
  const end = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    onChange(arrayMove(opts, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {opts.map((o, i) => (
            <OptionRow key={ids[i]} id={ids[i]} o={o}
              onLabel={(v) => onChange(opts.map((x, j) => (j === i ? { ...x, label: v, value: v } : x)))}
              onScore={(v) => onChange(opts.map((x, j) => (j === i ? { ...x, score: v } : x)))}
              onRemove={() => onChange(opts.filter((_, j) => j !== i))} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

export function Properties({ field: f, above, onChange }: Props) {
  const set = <K extends keyof FieldDef>(k: K, v: FieldDef[K] | undefined) => onChange({ [k]: v } as Partial<FieldDef>);
  const setV = (patch: NonNullable<FieldDef['validation']>) => {
    const next = { ...(f.validation || {}), ...patch };
    for (const k of Object.keys(next) as (keyof typeof next)[]) if (next[k] === undefined || next[k] === '' || next[k] === false) delete next[k];
    set('validation', Object.keys(next).length ? next : undefined);
  };
  const setC = (patch: NonNullable<FieldDef['config']>) => set('config', { ...(f.config || {}), ...patch });
  const opts = f.options || [];
  const setOpts = (next: typeof opts) => set('options', next);
  const withValue = !NO_VALUE.has(f.type);
  const numeric = f.type === 'number' || f.type === 'currency';
  const textual = ['text', 'textarea', 'email', 'phone', 'barcode'].includes(f.type);
  const cond = above.find((a) => a.key === f.showWhen?.field);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-bg-subtle px-3 py-2 text-[11px] text-fg-muted">{TYPE_INFO[f.type].label} · key <span className="font-mono font-semibold text-fg">{f.key}</span></div>
      <Labeled label="Label" required><AutoText value={f.label} onChange={(v) => set('label', v)} /></Labeled>
      <Labeled label="Help text"><AutoText multiline value={f.help || ''} onChange={(v) => set('help', v || undefined)} /></Labeled>
      {withValue && f.type !== 'group' && ['text', 'textarea', 'number', 'currency', 'email', 'phone', 'barcode'].includes(f.type) && (
        <Labeled label="Placeholder"><AutoText value={f.placeholder || ''} onChange={(v) => set('placeholder', v || undefined)} /></Labeled>
      )}
      {withValue && <Checkbox checked={Boolean(f.required)} onChange={(v) => set('required', v || undefined)} label="Required" />}
      {f.type !== 'section' && f.type !== 'group' && <Checkbox checked={f.width === 'half'} onChange={(v) => set('width', v ? 'half' : undefined)} label="Half width" hint="Two half-width fields sit side by side" />}

      {HAS_OPTIONS.has(f.type) && (
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-fg sm:text-[13px]">Options <span className="font-normal text-fg-muted">(drag to reorder · score is optional)</span></span>
          <OptionList opts={opts} onChange={setOpts} />
          <Btn icon={<Plus className="h-4 w-4" />} onClick={() => setOpts([...opts, { value: `Option ${opts.length + 1}`, label: `Option ${opts.length + 1}` }])}>Add option</Btn>
        </div>
      )}

      {numeric && (
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Minimum"><input type="number" className={inputCls()} value={f.validation?.min ?? ''} onChange={(e) => setV({ min: num(e.target.value) })} /></Labeled>
          <Labeled label="Maximum"><input type="number" className={inputCls()} value={f.validation?.max ?? ''} onChange={(e) => setV({ max: num(e.target.value) })} /></Labeled>
          {f.type === 'number' && <div className="col-span-2"><Checkbox checked={Boolean(f.validation?.integer)} onChange={(v) => setV({ integer: v })} label="Whole numbers only" /></div>}
        </div>
      )}
      {textual && (
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Min length"><input type="number" className={inputCls()} value={f.validation?.minLength ?? ''} onChange={(e) => setV({ minLength: num(e.target.value) })} /></Labeled>
          <Labeled label="Max length"><input type="number" className={inputCls()} value={f.validation?.maxLength ?? ''} onChange={(e) => setV({ maxLength: num(e.target.value) })} /></Labeled>
          {f.type === 'text' && <div className="col-span-2"><Labeled label="Must match pattern" hint="Optional regular expression"><input className={inputCls()} value={f.validation?.pattern || ''} onChange={(e) => setV({ pattern: e.target.value || undefined })} /></Labeled></div>}
        </div>
      )}
      {f.type === 'rating' && <Labeled label="Scale"><select className={inputCls()} value={f.config?.max || 5} onChange={(e) => setC({ max: Number(e.target.value) })}><option value={5}>1 to 5</option><option value={10}>1 to 10</option></select></Labeled>}
      {(f.type === 'photo' || f.type === 'file') && <Labeled label="Most files"><input type="number" min={1} max={10} className={inputCls()} value={f.config?.max_files || 1} onChange={(e) => setC({ max_files: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} /></Labeled>}
      {f.type === 'photo' && <Checkbox checked={f.config?.camera_only !== false} onChange={(v) => setC({ camera_only: v })} label="Camera only" hint="Blocks picking from the gallery on phones" />}
      {f.type === 'location' && (
        <div className="space-y-2">
          <Labeled label="Accuracy needed (metres)"><input type="number" className={inputCls()} value={f.config?.accuracy_m ?? 50} onChange={(e) => setC({ accuracy_m: num(e.target.value) })} /></Labeled>
          <Checkbox checked={Boolean(f.config?.inside_site)} onChange={(v) => setC({ inside_site: v })} label="Must be inside the site" />
        </div>
      )}
      {f.type === 'group' && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <p className="text-xs text-fg-muted">The fields inside this subform repeat for every entry the person adds, like one row per completed task with its name and status.</p>
          <Checkbox checked={f.config?.multiple !== false} onChange={(v) => setC(v ? { multiple: true, min_rows: 1, max_rows: 20 } : { multiple: false, min_rows: 1, max_rows: 1 })} label="Allow several entries" hint="Off: the fields are filled once, as one block" />
          <Labeled label="Name of one entry" hint="Shown as “Add task”, “Task 1”, …"><AutoText value={f.config?.entry_label || ''} placeholder="Entry" onChange={(v) => setC({ entry_label: v || undefined })} /></Labeled>
          {f.config?.multiple !== false && (
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Fewest entries"><input type="number" min={0} className={inputCls()} value={f.config?.min_rows ?? 0} onChange={(e) => setC({ min_rows: Math.max(0, Number(e.target.value) || 0) })} /></Labeled>
              <Labeled label="Most entries"><input type="number" min={1} max={100} className={inputCls()} value={f.config?.max_rows ?? 20} onChange={(e) => setC({ max_rows: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} /></Labeled>
            </div>
          )}
          <p className="text-[11px] text-fg-muted">To add fields to it: select the subform and click a field on the left, or drag a field into it.</p>
        </div>
      )}
      {f.type === 'list' && (
        <div className="space-y-3 rounded-lg border border-line p-3">
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="Each item is"><select className={inputCls()} value={f.config?.item_type || 'text'} onChange={(e) => setC({ item_type: e.target.value as 'text' | 'number' })}><option value="text">Text</option><option value="number">Number</option></select></Labeled>
            <Labeled label="Item name"><AutoText value={f.config?.item_label || ''} placeholder="Item" onChange={(v) => setC({ item_label: v || undefined })} /></Labeled>
            <Labeled label="Fewest items"><input type="number" min={0} className={inputCls()} value={f.config?.min_items ?? 0} onChange={(e) => setC({ min_items: Math.max(0, Number(e.target.value) || 0) })} /></Labeled>
            <Labeled label="Most items"><input type="number" min={1} max={100} className={inputCls()} value={f.config?.max_items ?? 20} onChange={(e) => setC({ max_items: Math.min(100, Math.max(1, Number(e.target.value) || 1)) })} /></Labeled>
          </div>
        </div>
      )}
      {f.type === 'reference' && (
        <div className="space-y-2">
          <Labeled label="File link"><input className={inputCls()} placeholder="https://…" value={f.ref?.url || ''} onChange={(e) => set('ref', { url: e.target.value, kind: f.ref?.kind || 'pdf' })} /></Labeled>
          <Labeled label="Kind"><select className={inputCls()} value={f.ref?.kind || 'pdf'} onChange={(e) => set('ref', { url: f.ref?.url || '', kind: e.target.value as 'pdf' | 'image' | 'dxf' })}><option value="pdf">PDF</option><option value="image">Image</option><option value="dxf">Drawing (DXF)</option></select></Labeled>
        </div>
      )}

      {METRIC_TYPES.has(f.type) && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <Checkbox checked={Boolean(f.metric)} onChange={(v) => set('metric', v ? { agg: 'sum' } : undefined)} label="Track as metric" hint="Feeds dashboard charts and, later, KPIs" />
          {f.metric && (
            <div className="grid grid-cols-2 gap-2">
              <Labeled label="Combine by"><select className={inputCls()} value={f.metric.agg} onChange={(e) => set('metric', { ...f.metric!, agg: e.target.value as NonNullable<FieldDef['metric']>['agg'] })}>{['sum', 'avg', 'min', 'max', 'count'].map((a) => <option key={a} value={a}>{a}</option>)}</select></Labeled>
              <Labeled label="Unit"><input className={inputCls()} value={f.metric.unit || ''} onChange={(e) => set('metric', { ...f.metric!, unit: e.target.value })} /></Labeled>
              <div className="col-span-2"><Labeled label="Target (optional)"><input type="number" className={inputCls()} value={f.metric.target ?? ''} onChange={(e) => set('metric', { ...f.metric!, target: num(e.target.value) })} /></Labeled></div>
            </div>
          )}
        </div>
      )}

      {f.type !== 'section' && (
        <div className="space-y-2 rounded-lg border border-line p-3">
          <Checkbox checked={Boolean(f.showWhen)} onChange={(v) => set('showWhen', v && above.length ? { field: above[0].key, op: 'eq', value: '' } : undefined)} label="Show only when…" hint={above.length ? undefined : 'Add a field above this one first'} />
          {f.showWhen && (
            <div className="space-y-3">
              <div><span className="mb-1 block text-[11px] font-semibold text-fg-muted">When this field</span>
                <ChoiceList label="Field" items={above.map((a) => ({ value: a.key, label: a.label || a.key }))} value={f.showWhen.field} onChange={(v) => set('showWhen', { ...f.showWhen!, field: v, value: '' })} /></div>
              <div><span className="mb-1 block text-[11px] font-semibold text-fg-muted">Condition</span>
                <select aria-label="Condition" className={inputCls()} value={f.showWhen.op} onChange={(e) => set('showWhen', { ...f.showWhen!, op: e.target.value as NonNullable<FieldDef['showWhen']>['op'] })}>{OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              {!['filled', 'empty'].includes(f.showWhen.op) && (
                <div><span className="mb-1 block text-[11px] font-semibold text-fg-muted">Value</span>
                  {cond?.options?.length
                    ? <ChoiceList label="Value" items={cond.options.map((o) => ({ value: o.value, label: o.label }))} value={String(f.showWhen.value ?? '')} onChange={(v) => set('showWhen', { ...f.showWhen!, value: v })} />
                    : cond?.type === 'yes_no'
                      ? <ChoiceList label="Value" items={[{ value: true, label: 'Yes' }, { value: false, label: 'No' }]} value={f.showWhen.value === true || f.showWhen.value === 'true'} onChange={(v) => set('showWhen', { ...f.showWhen!, value: v })} />
                      : <AutoText ariaLabel="Value" value={String(f.showWhen.value ?? '')} onChange={(v) => set('showWhen', { ...f.showWhen!, value: v })} />}
                </div>
              )}
              {cond && <p className="whitespace-pre-wrap break-words rounded-md bg-bg-subtle px-2.5 py-2 text-[11px] text-fg-muted">Shown only when “{cond.label}” {OPS.find((o) => o.value === f.showWhen!.op)?.label.toLowerCase()}{['filled', 'empty'].includes(f.showWhen.op) ? '' : ` “${cond.options?.find((o) => o.value === f.showWhen!.value)?.label ?? (cond.type === 'yes_no' ? (f.showWhen.value === true || f.showWhen.value === 'true' ? 'Yes' : 'No') : String(f.showWhen.value ?? ''))}”`}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

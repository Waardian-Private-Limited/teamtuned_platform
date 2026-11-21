'use client';

import { useState } from 'react';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { OPS } from '../../../../constants/dc.constants';
import type { Condition, PaletteField, Widget, WidgetSeries } from '../../../../types/dc.types';
import { Checkbox, inputCls } from '../../../shared/Ui';
import { ALL_TYPES, DIMENSIONS, GROUP_LABELS, RUN_STATS, aggsFor, countSeries, fieldSeries, flatFields, isNumericField } from './widgetDefaults';

const AGG_LABEL: Record<string, string> = { count: 'Count', sum: 'Total', avg: 'Average', min: 'Lowest', max: 'Highest' };
const sel = `${inputCls()} !h-8 text-xs`;
const NO_VALUE = ['filled', 'empty'];

type Opts = { sites: { id: number; name: string }[]; departments: { id: number; name: string }[]; people: { id: number; name: string; code: string | null }[] };

/** Edit one widget: chart type, axes, Y series (combo), raw columns, and its own filters. */
export function WidgetConfig({ widget, columns, scheduled, options, onChange, onRemove }: {
  widget: Widget; columns: PaletteField[]; scheduled: boolean; options: Opts; onChange: (w: Widget) => void; onRemove: () => void;
}) {
  const fields = flatFields(columns);
  const set = (patch: Partial<Widget>) => onChange({ ...widget, ...patch });
  const isChart = ['bar', 'line', 'area'].includes(widget.type);
  const hasSeries = ['bar', 'line', 'area', 'pie', 'kpi', 'table'].includes(widget.type);
  const hasX = isChart || widget.type === 'pie' || widget.type === 'table';

  const changeType = (type: Widget['type']) => {
    const next: Widget = { ...widget, type };
    if (type === 'scatter') next.scatter = widget.scatter || { xField: fields[0]?.key || '', yField: (fields[1] || fields[0])?.key || '' };
    if (type === 'data') next.columns = widget.columns || [];
    if (['bar', 'line', 'area', 'pie', 'kpi', 'table'].includes(type) && !widget.series?.length) next.series = [countSeries()];
    if ((type === 'pie' || type === 'kpi') && widget.series) next.series = widget.series.slice(0, 1);
    if (type === 'kpi') next.x = { kind: 'none' };
    onChange(next);
  };
  const setSeries = (list: WidgetSeries[]) => set({ series: list });

  return (
    <div className="space-y-2.5 rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center gap-2">
        <input aria-label="Widget title" className={`${inputCls()} !h-8 flex-1 text-xs font-semibold`} value={widget.title} onChange={(e) => set({ title: e.target.value })} />
        <button type="button" aria-label="Remove widget" onClick={onRemove} className="shrink-0 rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Labeled label="Chart">
          <select aria-label="Chart type" className={sel} value={widget.type} onChange={(e) => changeType(e.target.value as Widget['type'])}>
            {ALL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Labeled>
        {hasX && (
          <Labeled label="X axis (group by)">
            <select aria-label="Group by" className={sel} value={widget.x?.kind === 'field' ? `field:${widget.x.field}` : widget.x?.kind || 'site'}
              onChange={(e) => { const v = e.target.value; set({ x: v.startsWith('field:') ? { kind: 'field', field: v.slice(6) } : { kind: v as NonNullable<Widget['x']>['kind'] } }); }}>
              {DIMENSIONS.map((k) => <option key={k} value={k}>{GROUP_LABELS[k]}</option>)}
              {fields.map((f) => <option key={f.key} value={`field:${f.key}`}>{f.label}</option>)}
            </select>
          </Labeled>
        )}
      </div>

      {widget.type === 'scatter' && widget.scatter && (
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="X field"><select aria-label="X field" className={sel} value={widget.scatter.xField} onChange={(e) => set({ scatter: { ...widget.scatter!, xField: e.target.value } })}>{fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></Labeled>
          <Labeled label="Y field"><select aria-label="Y field" className={sel} value={widget.scatter.yField} onChange={(e) => set({ scatter: { ...widget.scatter!, yField: e.target.value } })}>{fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select></Labeled>
        </div>
      )}

      {hasSeries && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">{widget.type === 'kpi' ? 'Measure' : 'Series (Y)'}</span>
          {(widget.series || []).map((s, i) => (
            <SeriesRow key={s.id} s={s} fields={fields} isChart={isChart} scheduled={scheduled && widget.type === 'kpi'} canType={isChart}
              onChange={(ns) => setSeries((widget.series || []).map((x, j) => (j === i ? ns : x)))}
              onRemove={widget.type === 'kpi' || widget.type === 'pie' ? undefined : () => setSeries((widget.series || []).filter((_, j) => j !== i))} />
          ))}
          {widget.type !== 'kpi' && widget.type !== 'pie' && (
            <div className="flex gap-1.5">
              <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-bg-subtle" onClick={() => setSeries([...(widget.series || []), countSeries()])}><Plus className="h-3 w-3" />Count</button>
              {fields.filter((f) => isNumericField(f)).length > 0 && <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-bg-subtle" onClick={() => setSeries([...(widget.series || []), fieldSeries(fields.find((f) => isNumericField(f))!)])}><Plus className="h-3 w-3" />Field</button>}
            </div>
          )}
        </div>
      )}

      {widget.type === 'data' && (
        <Labeled label="Columns to show">
          <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-line p-2">
            {fields.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-xs text-fg">
                <input type="checkbox" checked={(widget.columns || []).includes(f.key)} onChange={(e) => set({ columns: e.target.checked ? [...(widget.columns || []), f.key] : (widget.columns || []).filter((k) => k !== f.key) })} />
                <span className="truncate">{f.label}</span>
              </label>
            ))}
          </div>
        </Labeled>
      )}

      {(isChart || widget.type === 'pie' || widget.type === 'table') && (
        <div className="grid grid-cols-2 gap-2">
          <Labeled label="Show top"><input aria-label="Limit" type="number" min={1} max={100} className={sel} value={widget.limit} onChange={(e) => set({ limit: Math.max(1, Math.min(100, Number(e.target.value) || 12)) })} /></Labeled>
          {widget.x?.kind !== 'day' && <Labeled label="Sort"><select aria-label="Sort" className={sel} value={widget.sort} onChange={(e) => set({ sort: e.target.value as Widget['sort'] })}><option value="value_desc">Highest first</option><option value="value_asc">Lowest first</option><option value="label">By name</option></select></Labeled>}
        </div>
      )}

      <FilterEditor widget={widget} fields={fields} options={options} onChange={(filter) => set({ filter })} />
    </div>
  );
}

function SeriesRow({ s, fields, isChart, scheduled, canType, onChange, onRemove }: {
  s: WidgetSeries; fields: PaletteField[]; isChart: boolean; scheduled: boolean; canType: boolean; onChange: (s: WidgetSeries) => void; onRemove?: () => void;
}) {
  const field = s.source === 'field' ? fields.find((f) => f.key === s.field) || null : null;
  const value = s.source === 'field' ? `field:${s.field}` : s.source === 'run' ? `run:${s.runStat}` : 'count';
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-line bg-bg-subtle/40 p-1.5">
      <select aria-label="Measure" className={`${sel} flex-1 basis-32`} value={value} onChange={(e) => {
        const v = e.target.value;
        if (v === 'count') onChange({ ...s, source: 'count', field: undefined, runStat: undefined, agg: undefined });
        else if (v.startsWith('run:')) onChange({ ...s, source: 'run', runStat: v.slice(4) as WidgetSeries['runStat'], field: undefined });
        else { const f = fields.find((x) => x.key === v.slice(6)); onChange({ ...s, source: 'field', field: v.slice(6), runStat: undefined, agg: isNumericField(f) ? s.agg || 'avg' : 'count' }); }
      }}>
        <option value="count">Submission count</option>
        {fields.map((f) => <option key={f.key} value={`field:${f.key}`}>{f.label}</option>)}
        {scheduled && <optgroup label="Progress">{RUN_STATS.map((r) => <option key={r.value} value={`run:${r.value}`}>{r.label}</option>)}</optgroup>}
      </select>
      {s.source === 'field' && isNumericField(field) && (
        <select aria-label="Aggregation" className={`${sel} basis-24`} value={s.agg || 'avg'} onChange={(e) => onChange({ ...s, agg: e.target.value as WidgetSeries['agg'] })}>{aggsFor(field).map((a) => <option key={a} value={a}>{AGG_LABEL[a]}</option>)}</select>
      )}
      {canType && (<>
        <select aria-label="Series chart" className={`${sel} basis-20`} value={s.chart || 'bar'} onChange={(e) => onChange({ ...s, chart: e.target.value as WidgetSeries['chart'] })}><option value="bar">Bar</option><option value="line">Line</option><option value="area">Area</option></select>
        <select aria-label="Axis" className={`${sel} basis-20`} value={s.axis || 'left'} onChange={(e) => onChange({ ...s, axis: e.target.value as WidgetSeries['axis'] })}><option value="left">Left</option><option value="right">Right</option></select>
      </>)}
      {onRemove && <button type="button" aria-label="Remove series" onClick={onRemove} className="rounded p-1 text-fg-muted hover:text-[var(--tt-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>}
    </div>
  );
}

/** Per-widget filter: date override, dimension overrides, and field conditions (reuses the form OPS). */
function FilterEditor({ widget, fields, options, onChange }: { widget: Widget; fields: PaletteField[]; options: Opts; onChange: (f: Widget['filter']) => void }) {
  const f = widget.filter || {};
  const conditions = f.conditions || [];
  const active = Boolean(f.from || f.to || f.siteId || f.departmentId || f.employeeId || f.status || f.late || conditions.length);
  const [open, setOpen] = useState(active);
  const set = (patch: Partial<NonNullable<Widget['filter']>>) => { const next = { ...f, ...patch }; onChange(cleanFilter(next)); };
  const setConds = (list: Condition[]) => onChange(cleanFilter({ ...f, conditions: list, match: f.match || 'all' }));

  return (
    <div className="rounded-md border border-line">
      <button type="button" className="flex w-full items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-fg-muted" onClick={() => setOpen(!open)}>
        <span>Filters{active ? ' · on' : ''}</span><ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-line p-2.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input aria-label="From" type="date" className={sel} value={f.from || ''} onChange={(e) => set({ from: e.target.value || undefined })} />
            <input aria-label="To" type="date" className={sel} value={f.to || ''} onChange={(e) => set({ to: e.target.value || undefined })} />
            <select aria-label="Site" className={sel} value={f.siteId || ''} onChange={(e) => set({ siteId: Number(e.target.value) || undefined })}><option value="">Any site</option>{options.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select aria-label="Department" className={sel} value={f.departmentId || ''} onChange={(e) => set({ departmentId: Number(e.target.value) || undefined })}><option value="">Any department</option>{options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select aria-label="Person" className={sel} value={f.employeeId || ''} onChange={(e) => set({ employeeId: Number(e.target.value) || undefined })}><option value="">Anyone</option>{options.people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ''}</option>)}</select>
            <select aria-label="Status" className={sel} value={f.status || ''} onChange={(e) => set({ status: e.target.value || undefined })}><option value="">Any status</option>{['submitted', 'in_review', 'approved', 'returned', 'rejected'].map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select>
          </div>
          <Checkbox checked={Boolean(f.late)} onChange={(v) => set({ late: v || undefined })} label="Late only" />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">Conditions</span>
              {conditions.length > 1 && <select aria-label="Match" className={`${inputCls()} !h-7 !w-24 text-[11px]`} value={f.match || 'all'} onChange={(e) => set({ match: e.target.value as 'all' | 'any' })}><option value="all">All</option><option value="any">Any</option></select>}
            </div>
            {conditions.map((c, i) => <CondRow key={i} c={c} fields={fields} onChange={(nc) => setConds(conditions.map((x, j) => (j === i ? nc : x)))} onRemove={() => setConds(conditions.filter((_, j) => j !== i))} />)}
            {fields.length > 0 && <button type="button" className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-muted hover:bg-bg-subtle" onClick={() => setConds([...conditions, { field: fields[0].key, op: 'eq', value: '' }])}><Plus className="h-3 w-3" />Add condition</button>}
          </div>
        </div>
      )}
    </div>
  );
}

function CondRow({ c, fields, onChange, onRemove }: { c: Condition; fields: PaletteField[]; onChange: (c: Condition) => void; onRemove: () => void }) {
  const field = fields.find((f) => f.key === c.field);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select aria-label="Field" className={`${sel} flex-1 basis-28`} value={c.field} onChange={(e) => onChange({ ...c, field: e.target.value, value: '' })}>{fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
      <select aria-label="Operator" className={`${sel} basis-20`} value={c.op} onChange={(e) => onChange({ ...c, op: e.target.value as Condition['op'] })}>{OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
      {!NO_VALUE.includes(c.op) && (
        field?.options?.length
          ? <select aria-label="Value" className={`${sel} basis-24`} value={String(c.value ?? '')} onChange={(e) => onChange({ ...c, value: e.target.value })}><option value="">…</option>{field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          : <input aria-label="Value" className={`${sel} basis-24`} type={field && isNumericField(field) ? 'number' : field?.type === 'date' ? 'date' : 'text'} value={String(c.value ?? '')} onChange={(e) => onChange({ ...c, value: e.target.value })} />
      )}
      <button type="button" aria-label="Remove condition" onClick={onRemove} className="rounded p-1 text-fg-muted hover:text-[var(--tt-danger)]"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function cleanFilter(f: NonNullable<Widget['filter']>): Widget['filter'] {
  const out: NonNullable<Widget['filter']> = {};
  for (const k of ['from', 'to', 'status'] as const) if (f[k]) out[k] = f[k];
  for (const k of ['siteId', 'departmentId', 'employeeId'] as const) if (f[k]) out[k] = f[k];
  if (f.late) out.late = true;
  const conds = (f.conditions || []).filter((c) => c.field && c.op);
  if (conds.length) { out.conditions = conds; out.match = f.match || 'all'; }
  return Object.keys(out).length ? out : undefined;
}

const Labeled = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block"><span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">{label}</span>{children}</label>
);


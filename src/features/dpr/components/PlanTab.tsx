'use client';

import React from 'react';
import { ArrowDownToLine, CalendarPlus, Check, Download, History, ListPlus, Pencil, Plus, RotateCcw, Save, Trash2, Wand2, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { addDays, formatDate } from '@/lib/datetime';
import { fieldErrorsOf, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, IconBtn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { Location, Milestone, PlanLine, PlanSettings, PlanView } from '../api/dpr.api';
import { EditDialog, GenerateDialog, HistoryDialog } from './MilestoneDialogs';
import { DateBox, LocationSelect, n1, NumBox, PLAN_LABEL, STATE_LABEL, stateTone, Tag, TextBox } from './parts';

type Res = 'staff' | 'labour' | 'equipment';
const DEFAULTS: PlanSettings = { concrete_mode: 'date', concrete_scope: 'tower', staff_scope: 'overall', labour_scope: 'overall', equipment_scope: 'overall' };
const RES: { kind: Res; title: string; unit: string; placeholder: string }[] = [
  { kind: 'staff', title: 'Staff planning', unit: 'designation', placeholder: 'e.g. Site Engineer' },
  { kind: 'labour', title: 'Labour planning', unit: 'trade', placeholder: 'e.g. Mason' },
  { kind: 'equipment', title: 'Equipment planning', unit: 'equipment', placeholder: 'e.g. Tower crane' },
];

/** A numbered plan section with its toolbar, as on the old planning screen. */
function Section({ id, no, title, note, tools, children }: { id: string; no: number; title: string; note?: React.ReactNode; tools?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 overflow-hidden rounded-xl border border-line bg-surface">
      <header className="flex flex-col gap-2 border-b border-line bg-bg-subtle px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-fg">{no}. {title}{note && <span className="ml-1.5 font-semibold normal-case tracking-normal text-fg-muted">{note}</span>}</h3>
        {tools && <div className="flex flex-wrap items-center gap-1.5">{tools}</div>}
      </header>
      <div className="space-y-3 p-3.5">{children}</div>
    </section>
  );
}

/** "Clear all" that asks once: the first press arms it for a few seconds. */
function ClearAll({ onClear, disabled }: { onClear: () => void; disabled?: boolean }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => { if (!armed) return undefined; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return <Btn variant={armed ? 'danger' : 'ghost'} size="sm" icon={Trash2} disabled={disabled} onClick={() => { if (armed) { onClear(); setArmed(false); } else setArmed(true); }}>{armed ? 'Sure? Clear' : 'Clear all'}</Btn>;
}

function Mode<T extends string>({ value, onChange, options, disabled }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; disabled?: boolean }) {
  return <SegmentedControl fitText value={value} onChange={onChange} options={options} disabled={disabled} className="h-8" />;
}

/** The pick list of the old auto-fill drawer: names with what attendance suggests; ticked ones are added with their count. */
function PickDialog({ kind, siteId, view, have, onAdd, onClose }: { kind: Res; siteId: number; view: PlanView; have: string[]; onAdd: (rows: { name: string; qty: number }[]) => void; onClose: () => void }) {
  const sug = useAsync(() => (kind === 'equipment' ? Promise.resolve(null) : api.suggestions(siteId)), [siteId, kind]);
  const [rows, setRows] = React.useState<{ name: string; hint: string; qty: number; on: boolean }[] | null>(null);
  const [q, setQ] = React.useState('');
  const [custom, setCustom] = React.useState('');
  React.useEffect(() => {
    if (kind !== 'equipment' && !sug.data) return;
    const found = kind === 'equipment' ? [] : (sug.data?.[kind] || []).map((s) => ({ name: s.name, hint: `${s.assigned} at the site · ${s.avg_present}/day present (30 days)`, qty: Math.max(1, Math.round(s.avg_present) || s.assigned), on: true }));
    const listed = view.catalog[kind].filter((n) => !found.some((f) => f.name.toLowerCase() === n.toLowerCase())).map((n) => ({ name: n, hint: 'From the master list', qty: 1, on: kind === 'equipment' }));
    setRows([...found, ...listed].filter((r) => !have.some((h) => h.toLowerCase() === r.name.toLowerCase())));
  }, [sug.data, kind, view.catalog, have]);
  const shown = (rows || []).filter((r) => r.name.toLowerCase().includes(q.toLowerCase()));
  const picked = (rows || []).filter((r) => r.on);
  const set = (name: string, patch: Partial<{ qty: number; on: boolean }>) => setRows((rs) => (rs || []).map((r) => (r.name === name ? { ...r, ...patch } : r)));
  return (
    <Dialog open onClose={onClose} title={kind === 'equipment' ? 'Pick from the master list' : `Add ${kind === 'staff' ? 'designations' : 'trades'} from attendance`} maxWidthClassName="max-w-lg"
      footer={<div className="flex items-center justify-between gap-2"><span className="text-xs text-fg-muted">{picked.length} picked · {picked.reduce((s, r) => s + r.qty, 0)} per day</span><div className="flex gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn disabled={!picked.length} onClick={() => { onAdd(picked.map((r) => ({ name: r.name, qty: r.qty }))); onClose(); }}>Add</Btn></div></div>}>
      <div className="space-y-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" aria-label="Filter" className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
        {sug.error && <p className="text-xs text-[var(--tt-danger)]">{sug.error}</p>}
        {!rows ? <TableSkeleton rows={4} columns={2} /> : !shown.length ? <p className="text-xs text-fg-muted">{kind === 'labour' ? 'No trades found. Labour comes from the labour module of this site, and the master list.' : 'Nothing to add.'}</p> : (
          <ul className="max-h-80 divide-y divide-line/60 overflow-auto">
            {shown.map((r) => (
              <li key={r.name} className="flex items-center justify-between gap-3 py-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                  <input type="checkbox" checked={r.on} onChange={(e) => set(r.name, { on: e.target.checked })} className="mt-1 h-4 w-4 accent-[var(--tt-primary)]" />
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-fg">{r.name}</span><span className="block text-[11px] text-fg-muted">{r.hint}</span></span>
                </label>
                <NumBox value={r.qty} onChange={(v) => set(r.name, { qty: v ?? 0, on: true })} ariaLabel={`${r.name} planned`} />
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={`Add another ${kind === 'staff' ? 'designation' : kind === 'labour' ? 'trade' : 'machine'}`} aria-label="Add custom" className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-sm outline-none" />
          <Btn variant="secondary" icon={Plus} disabled={!custom.trim()} onClick={() => { setRows((rs) => [...(rs || []), { name: custom.trim(), hint: 'Added here', qty: 1, on: true }]); setCustom(''); }}>Add</Btn>
        </div>
      </div>
    </Dialog>
  );
}

const isReportDay = (date: string, days: string) => days[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7] === '1';

/** The concrete grid: one row per pour date (or one row for the month), one column per location (or one for overall), achieved beside it. */
function ConcreteGrid({ view, from, to, lines, setLines, settings, edit, errors }: { view: PlanView; from: string; to: string; lines: PlanLine[]; setLines: (f: (l: PlanLine[]) => PlanLine[]) => void; settings: PlanSettings; edit: boolean; errors: Record<string, string> }) {
  const cols: (Location | null)[] = settings.concrete_scope === 'tower' && view.setup.locations.length ? view.setup.locations : [null];
  const monthly = settings.concrete_mode === 'month';
  const pours = lines.map((l, i) => ({ l, i })).filter((x) => x.l.kind === 'pour');
  const [extra, setExtra] = React.useState<string[]>([]);
  const dates = monthly ? [''] : [...new Set([...pours.map((p) => p.l.on_date || ''), ...extra])].filter(Boolean).sort();
  const cell = (date: string, loc: string | null) => pours.find((p) => (p.l.on_date || '') === date && (p.l.location_id || null) === loc);
  const setCell = (date: string, loc: string | null, qty: number | null) => setLines((ls) => {
    const at = ls.findIndex((l) => l.kind === 'pour' && (l.on_date || '') === date && (l.location_id || null) === loc);
    if (!qty) return at >= 0 ? ls.filter((_, j) => j !== at) : ls;
    if (at >= 0) return ls.map((l, j) => (j === at ? { ...l, qty } : l));
    return [...ls, { kind: 'pour', location_id: loc, name: null, on_date: date || null, qty }];
  });
  // A new pour date: the next report day after the last one in the grid (or the plan's first day).
  const addDate = () => {
    let d = dates.length ? addDays(dates[dates.length - 1], 1) : from;
    while (d <= to && !isReportDay(d, view.setup.report_days)) d = addDays(d, 1);
    if (d > to) { showError('No report day left in this plan period'); return; }
    setExtra((x) => [...x, d]);
  };
  const moveDate = (was: string, next: string | null) => {
    if (!next || next === was || dates.includes(next) || next < from || next > to) return;
    setExtra((x) => [...x.filter((d) => d !== was), next]);
    setLines((ls) => ls.map((l) => (l.kind === 'pour' && l.on_date === was ? { ...l, on_date: next } : l)));
  };
  const removeDate = (date: string) => { setExtra((x) => x.filter((d) => d !== date)); setLines((ls) => ls.filter((l) => !(l.kind === 'pour' && l.on_date === date))); };
  // Copies a row to every later date in the grid.
  const fillDown = (date: string) => setLines((ls) => {
    const src = ls.filter((l) => l.kind === 'pour' && l.on_date === date);
    const later = dates.filter((d) => d > date);
    return [...ls.filter((l) => !(l.kind === 'pour' && l.on_date && later.includes(l.on_date))), ...later.flatMap((d) => src.map((s) => ({ ...s, on_date: d })))];
  });
  const rowTotal = (date: string) => cols.reduce((s, c) => s + (cell(date, c?.id ?? null)?.l.qty || 0), 0);
  const total = pours.reduce((s, p) => s + p.l.qty, 0);
  const achievedTotal = Object.values(view.actuals).reduce((s, a) => s + a.total, 0);
  const err = Object.entries(errors).find(([k]) => pours.some((p) => k.startsWith(`lines.${p.i}.`)))?.[1];

  return (
    <div className="space-y-2">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm" style={{ minWidth: 260 + cols.length * 96 }}>
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
              <th className="border-b border-line px-2 py-1.5">{monthly ? 'Period' : 'Pour date'}</th>
              {cols.map((c) => <th key={c?.id || 'overall'} className="border-b border-line px-2 py-1.5 text-right">{c?.name || 'Overall'}</th>)}
              {cols.length > 1 && <th className="border-b border-line px-2 py-1.5 text-right">Planned</th>}
              <th className="border-b border-line px-2 py-1.5 text-right">Achieved</th>
              {edit && !monthly && <th className="border-b border-line px-2 py-1.5" />}
            </tr>
          </thead>
          <tbody>
            {dates.map((date) => {
              const planned = monthly ? total : rowTotal(date);
              const got = monthly ? achievedTotal : view.actuals[date]?.total;
              return (
                <tr key={date || 'month'} className={cx(date === view.today && 'bg-bg-subtle font-semibold')}>
                  <td className="border-b border-line/60 px-2 py-1.5">{monthly ? `${formatDate(from, 'short')} – ${formatDate(to, 'short')}` : edit ? <DateBox value={date} min={from} max={to} onChange={(v) => moveDate(date, v)} ariaLabel="Pour date" /> : formatDate(date, 'weekday')}</td>
                  {cols.map((c) => <td key={c?.id || 'overall'} className="border-b border-line/60 px-2 py-1.5 text-right"><NumBox value={cell(date, c?.id ?? null)?.l.qty ?? null} onChange={(v) => setCell(date, c?.id ?? null, v)} ariaLabel={`${c?.name || 'Overall'} m³`} step={0.5} disabled={!edit} placeholder="0" /></td>)}
                  {cols.length > 1 && <td className="border-b border-line/60 px-2 py-1.5 text-right tabular-nums">{n1(planned)}</td>}
                  <td className="border-b border-line/60 px-2 py-1.5 text-right tabular-nums">{got === undefined ? '—' : <>{n1(got)}<span className={cx('ml-1 text-[11px]', got < planned ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>{got - planned >= 0 ? '▲' : '▼'}{n1(Math.abs(got - planned))}</span></>}</td>
                  {edit && !monthly && <td className="whitespace-nowrap border-b border-line/60 px-1 py-1.5 text-right"><IconBtn label="Copy to every later date" onClick={() => fillDown(date)}><ArrowDownToLine className="h-4 w-4" /></IconBtn><IconBtn label="Remove date" onClick={() => removeDate(date)}><Trash2 className="h-4 w-4" /></IconBtn></td>}
                </tr>
              );
            })}
            {!dates.length && <tr><td colSpan={cols.length + 4} className="px-2 py-3 text-xs text-fg-muted">No pour dates yet.</td></tr>}
          </tbody>
          <tfoot className="font-semibold">
            <tr>
              <td className="px-2 py-1.5">Total</td>
              {cols.map((c) => <td key={c?.id || 'overall'} className="px-2 py-1.5 text-right tabular-nums">{n1(pours.filter((p) => (p.l.location_id || null) === (c?.id ?? null)).reduce((s, p) => s + p.l.qty, 0))}</td>)}
              {cols.length > 1 && <td className="px-2 py-1.5 text-right tabular-nums">{n1(total)}</td>}
              <td className="px-2 py-1.5 text-right tabular-nums">{n1(achievedTotal)}{total > 0 && <span className="ml-1 text-[11px] text-fg-muted">{Math.round((achievedTotal / total) * 100)}%</span>}</td>
              {edit && !monthly && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      {err && <p className="text-xs font-medium text-[var(--tt-danger)]">{err}</p>}
      {edit && !monthly && <Btn variant="secondary" size="sm" icon={CalendarPlus} onClick={addDate}>Add pour date</Btn>}
    </div>
  );
}

function Resource({ r, no, view, siteId, lines, setLines, scope, setScope, edit, errors }: { r: (typeof RES)[number]; no: number; view: PlanView; siteId: number; lines: PlanLine[]; setLines: (f: (l: PlanLine[]) => PlanLine[]) => void; scope: 'tower' | 'overall'; setScope: (v: 'tower' | 'overall') => void; edit: boolean; errors: Record<string, string> }) {
  const [picking, setPicking] = React.useState(false);
  const rows = lines.map((l, i) => ({ l, i })).filter((x) => x.l.kind === r.kind);
  const set = (i: number, patch: Partial<PlanLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = rows.reduce((s, x) => s + (Number(x.l.qty) || 0), 0);
  const tower = scope === 'tower' && view.setup.locations.length > 0;
  return (
    <Section id={r.kind} no={no} title={r.title} note={`${total} per day`}
      tools={(
        <>
          <Mode value={scope} onChange={setScope} disabled={!edit} options={[{ value: 'overall', label: 'Overall' }, { value: 'tower', label: 'Tower-wise' }]} />
          {edit && <Btn variant="secondary" size="sm" icon={r.kind === 'equipment' ? ListPlus : Wand2} onClick={() => setPicking(true)}>{r.kind === 'equipment' ? 'Pick from master list' : 'Add from attendance'}</Btn>}
          {edit && <Btn variant="secondary" size="sm" icon={Plus} onClick={() => setLines((ls) => [...ls, { kind: r.kind, location_id: null, name: '', on_date: null, qty: 1 }])}>Add row</Btn>}
          {edit && <ClearAll disabled={!rows.length} onClear={() => setLines((ls) => ls.filter((l) => l.kind !== r.kind))} />}
        </>
      )}>
      <datalist id={`dpr-plan-${r.kind}`}>{view.catalog[r.kind].map((n) => <option key={n} value={n} />)}</datalist>
      {!rows.length ? <p className="text-xs text-fg-muted">Nothing planned.</p> : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[360px] border-separate border-spacing-0 text-sm">
            <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted"><th className="border-b border-line px-2 py-1.5">Period</th>{tower && <th className="border-b border-line px-2 py-1.5">Tower / area</th>}<th className="border-b border-line px-2 py-1.5 capitalize">{r.unit}</th><th className="border-b border-line px-2 py-1.5 text-right">Planned</th>{edit && <th className="border-b border-line" />}</tr></thead>
            <tbody>
              {rows.map(({ l, i }) => (
                <tr key={i}>
                  <td className="border-b border-line/60 px-2 py-1.5 text-xs text-fg-muted">Whole plan</td>
                  {tower && <td className="border-b border-line/60 px-2 py-1.5"><LocationSelect locations={view.setup.locations} value={l.location_id} onChange={(v) => set(i, { location_id: v })} ariaLabel="Location" overallLabel="Overall" disabled={!edit} /></td>}
                  <td className="border-b border-line/60 px-2 py-1.5">
                    <input list={`dpr-plan-${r.kind}`} value={l.name ?? ''} disabled={!edit} placeholder={r.placeholder} aria-label={r.unit} onChange={(e) => set(i, { name: e.target.value })}
                      className={cx('h-9 w-full min-w-[9rem] rounded-lg border bg-surface px-2.5 text-sm outline-none focus:ring-1 disabled:bg-bg-subtle', errors[`lines.${i}.name`] ? 'border-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]')} />
                    {errors[`lines.${i}.name`] && <p className="mt-1 text-[11px] text-[var(--tt-danger)]">{errors[`lines.${i}.name`]}</p>}
                  </td>
                  <td className="border-b border-line/60 px-2 py-1.5 text-right"><NumBox value={l.qty} onChange={(v) => set(i, { qty: v ?? 0 })} ariaLabel="Planned" error={errors[`lines.${i}.qty`]} disabled={!edit} /></td>
                  {edit && <td className="border-b border-line/60 px-1 py-1.5 text-right"><IconBtn label="Remove" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></IconBtn></td>}
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><td className="px-2 py-1.5" colSpan={tower ? 3 : 2}>Total</td><td className="px-2 py-1.5 text-right tabular-nums">{total}</td>{edit && <td />}</tr></tfoot>
          </table>
        </div>
      )}
      {picking && <PickDialog kind={r.kind} siteId={siteId} view={view} have={rows.map((x) => x.l.name || '')} onClose={() => setPicking(false)} onAdd={(add) => setLines((ls) => [...ls, ...add.map((a) => ({ kind: r.kind, location_id: null, name: a.name, on_date: null, qty: a.qty }))])} />}
    </Section>
  );
}

/** The plan's milestones: targeted or done in its period, or carried in (still open from before, or rescheduled into it). Saved as they change. */
function Milestones({ siteId, view, edit, onChanged }: { siteId: number; view: PlanView; edit: boolean; onChanged: () => void }) {
  const [editing, setEditing] = React.useState<Milestone | 'new' | null>(null);
  const [generating, setGenerating] = React.useState(false);
  const [history, setHistory] = React.useState<Milestone | null>(null);
  const [cycle, setCycle] = React.useState<{ start_on: string | null; every_days: number; location_id: string | null } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const loc = (id: string | null) => (id ? view.setup.locations.find((l) => l.id === id)?.name || 'Removed location' : 'Whole site');
  const run = async (f: () => Promise<unknown>, done?: string) => { setBusy(true); try { await f(); if (done) showSuccess(done); onChanged(); } catch (e) { showError(messageOf(e)); } finally { setBusy(false); } };
  const rows = [...view.milestones].sort((a, b) => (a.target_on || '9').localeCompare(b.target_on || '9'));
  return (
    <Section id="milestones" no={4} title="Milestone schedule" note={`${rows.length} · ${rows.filter((m) => m.state === 'done').length} done`}
      tools={edit ? (
        <>
          <Btn variant="secondary" size="sm" icon={RotateCcw} disabled={!rows.length || !view.plan} onClick={() => setCycle({ start_on: view.valid_from, every_days: 7, location_id: null })}>Set dates by cycle</Btn>
          <Btn variant="secondary" size="sm" icon={Wand2} disabled={!view.setup.locations.length} onClick={() => setGenerating(true)}>By level</Btn>
          <Btn variant="secondary" size="sm" icon={Plus} onClick={() => setEditing('new')}>Add milestone</Btn>
        </>
      ) : undefined}>
      {!rows.length ? <p className="text-xs text-fg-muted">No milestones in this plan period. Milestones still open from before, or moved into this period, show here by themselves.</p> : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[780px] border-separate border-spacing-0 text-sm">
            <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{['Tower / area', 'Slab / level', 'Target date', 'Work item', 'Purpose', 'Status', ''].map((h, i) => <th key={i} className="border-b border-line px-2 py-1.5">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((m) => {
                const reported = Boolean(m.done_report_id);
                return (
                  <tr key={m.id} className={cx(m.state === 'done' && 'text-fg-muted')}>
                    <td className="border-b border-line/60 px-2 py-1.5">{loc(m.location_id)}</td>
                    <td className="border-b border-line/60 px-2 py-1.5">{m.level || '—'}</td>
                    <td className="border-b border-line/60 px-2 py-1.5">
                      <span className="whitespace-nowrap">{formatDate(m.target_on, 'short')}</span>
                      {m.planned_on && m.planned_on !== m.target_on && <s className="ml-1 text-[11px] text-fg-muted">{formatDate(m.planned_on, 'short')}</s>}
                      {m.revisions > 0 && <IconBtn label="Target history" onClick={() => setHistory(m)}><History className="h-3.5 w-3.5" /></IconBtn>}
                      {m.carried && <span className="mt-0.5 block text-[11px] font-semibold text-fg-muted">{m.carried.kind === 'overdue' ? `Carried from ${m.carried.from}` : `Rescheduled from ${m.carried.from}`}</span>}
                    </td>
                    <td className="border-b border-line/60 px-2 py-1.5 font-medium">{m.activity}</td>
                    <td className="border-b border-line/60 px-2 py-1.5 text-xs">{m.purpose || '—'}</td>
                    <td className="border-b border-line/60 px-2 py-1.5">
                      {m.state === 'done'
                        ? <span className="inline-flex items-center gap-1"><Tag tone="done">Done {formatDate(m.done_on, 'short')}{reported ? ' · reported' : ''}</Tag>{edit && !reported && <IconBtn label="Not done" onClick={() => run(() => api.editMilestone(m.id, { done_on: null }))}><X className="h-3.5 w-3.5" /></IconBtn>}</span>
                        : <span className="inline-flex items-center gap-1"><Tag tone={stateTone(m.state)}>{STATE_LABEL[m.state]}</Tag>{edit && <Btn variant="ghost" size="sm" icon={Check} disabled={busy} onClick={() => run(() => api.editMilestone(m.id, { done_on: m.target_on && m.target_on <= view.today ? m.target_on : view.today }), 'Marked done')}>Mark done</Btn>}</span>}
                    </td>
                    <td className="whitespace-nowrap border-b border-line/60 px-1 py-1.5 text-right">
                      {edit && !reported && <IconBtn label="Edit" onClick={() => setEditing(m)}><Pencil className="h-4 w-4" /></IconBtn>}
                      {edit && !reported && <IconBtn label="Delete" onClick={() => run(() => api.deleteMilestone(m.id), 'Milestone deleted')}><Trash2 className="h-4 w-4" /></IconBtn>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {cycle && (
        <Dialog open onClose={() => setCycle(null)} title="Set dates by cycle" footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={() => setCycle(null)}>Cancel</Btn><Btn loading={busy} disabled={!cycle.start_on} onClick={() => run(async () => { const r = await api.milestonesByCycle(siteId, { plan_id: view.plan!.id, start_on: cycle.start_on as string, every_days: cycle.every_days, location_id: cycle.location_id }); showSuccess(`${r.moved} target${r.moved === 1 ? '' : 's'} set`); setCycle(null); })}>Apply</Btn></div>}>
          <div className="space-y-3">
            <p className="text-xs text-fg-muted">The open milestones of this plan get new targets in their order: the first on the start date, each next one the set number of days later. Each tower or area runs its own sequence. Done ones are left alone; every move is kept in the history.</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold">Start<DateBox value={cycle.start_on} onChange={(v) => setCycle({ ...cycle, start_on: v })} ariaLabel="Start" /></label>
              <label className="text-xs font-semibold">Cycle (days)<NumBox value={cycle.every_days} onChange={(v) => setCycle({ ...cycle, every_days: v ?? 1 })} ariaLabel="Days" /></label>
            </div>
            <label className="block text-xs font-semibold">Apply to<LocationSelect locations={view.setup.locations} value={cycle.location_id} onChange={(v) => setCycle({ ...cycle, location_id: v })} ariaLabel="Apply to" overallLabel="All towers and areas" /></label>
          </div>
        </Dialog>
      )}
      {editing && <EditDialog siteId={siteId} milestone={editing === 'new' ? null : editing} locations={view.setup.locations} defaultTarget={view.status === 'active' ? view.today : view.valid_from} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChanged(); }} />}
      {generating && <GenerateDialog siteId={siteId} locations={view.setup.locations} onClose={() => setGenerating(false)} onSaved={() => { setGenerating(false); onChanged(); }} />}
      {history && <HistoryDialog milestone={history} onClose={() => setHistory(null)} />}
    </Section>
  );
}

function Editor({ siteId, view, onSaved, onReloadMilestones }: { siteId: number; view: PlanView; onSaved: (v: PlanView) => void; onReloadMilestones: () => void }) {
  const edit = view.access.edit;
  const [period, setPeriod] = React.useState({ from: view.valid_from, to: view.valid_till });
  const days = period.from && period.to && period.to >= period.from ? Math.round((Date.parse(period.to) - Date.parse(period.from)) / 864e5) + 1 : 0;
  const { track } = useDownloadCenter();
  const [lines, setLinesRaw] = React.useState<PlanLine[]>(view.lines);
  const [settings, setSettings] = React.useState<PlanSettings>({ ...DEFAULTS, ...(view.copied_from?.settings || {}), ...(view.plan?.settings || {}) });
  const [target, setTarget] = React.useState<number | null>(view.plan?.concrete_target_m3 ?? null);
  const [bills, setBills] = React.useState({ client: view.plan?.client_bill_on ?? null, contractor: view.plan?.contractor_bill_on ?? null });
  const [note, setNote] = React.useState(view.plan?.note ?? '');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [exporting, setExporting] = React.useState<'' | 'pdf' | 'xlsx'>('');
  const setLines = (f: (l: PlanLine[]) => PlanLine[]) => { setLinesRaw(f); setDirty(true); };
  const setMode = <K extends keyof PlanSettings>(k: K, v: PlanSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setDirty(true);
    // Switching concrete between date-wise and monthly keeps the quantities: per location, for the month or on its first day.
    if (k === 'concrete_mode') setLinesRaw((ls) => {
      const byLoc = new Map<string, number>();
      for (const p of ls.filter((l) => l.kind === 'pour')) byLoc.set(p.location_id || '', (byLoc.get(p.location_id || '') || 0) + p.qty);
      const day = v === 'date' ? period.from : null;
      return [...ls.filter((l) => l.kind !== 'pour'), ...[...byLoc].map(([loc, qty]) => ({ kind: 'pour' as const, location_id: loc || null, name: null, on_date: day, qty }))];
    });
  };
  const pourSum = lines.filter((l) => l.kind === 'pour').reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const count = (k: PlanLine['kind']) => lines.filter((l) => l.kind === k).reduce((s, l) => s + (Number(l.qty) || 0), 0);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const body = { valid_from: period.from, valid_till: period.to, concrete_target_m3: target, client_bill_on: bills.client, contractor_bill_on: bills.contractor, note: note || null, settings, lines };
      const out = view.plan ? await api.savePlan(view.plan.id, body) : await api.createPlan(siteId, body);
      showSuccess(view.plan ? 'Plan saved' : 'Plan created. Daily forms come up for every report day of the period.');
      setDirty(false);
      onSaved(out);
    } catch (e) {
      const { fields, general } = fieldErrorsOf(e);
      setErrors(fields);
      showError(general || 'Check the highlighted fields');
    } finally { setSaving(false); }
  };
  const download = async (format: 'pdf' | 'xlsx') => {
    setExporting(format);
    try { track(await api.exportPlan({ plan_id: view.plan!.id, format })); showSuccess('The plan is being prepared. Find it in Downloads.'); } catch (e) { showError(messageOf(e)); } finally { setExporting(''); }
  };
  const p = view.progress;
  const nav: [string, string][] = [['concrete', `Concrete ${n1(target ?? pourSum)} m³`], ['staff', `Staff ${count('staff')}`], ['labour', `Labour ${count('labour')}`], ['milestones', `Milestones ${view.milestones.length}`], ['equipment', `Equipment ${count('equipment')}`]];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid gap-3 rounded-xl border border-line bg-surface p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-semibold text-fg">Valid from<DateBox value={period.from} onChange={(v) => { setPeriod((x) => ({ ...x, from: v || '' })); setDirty(true); }} ariaLabel="Valid from" error={errors.valid_from} disabled={!edit || view.status !== 'upcoming' && Boolean(view.plan)} /></label>
        <label className="text-xs font-semibold text-fg">Valid till<DateBox value={period.to} min={period.from} onChange={(v) => { setPeriod((x) => ({ ...x, to: v || '' })); setDirty(true); }} ariaLabel="Valid till" error={errors.valid_till} disabled={!edit} /></label>
        <div className="rounded-lg bg-[var(--tt-primary)] px-4 py-2 text-center text-[var(--tt-on-primary)]"><p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Duration</p><p className="text-lg font-bold tabular-nums">{days} days</p></div>
      </div>
      {view.status === 'upcoming' && view.plan && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">Scheduled: this plan takes over on {formatDate(view.valid_from)}. Edit it freely until then.</p>}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-fg-muted">
          <Tag tone={view.status === 'active' ? 'done' : view.status === 'closed' ? 'plain' : 'wait'}>{view.plan ? PLAN_LABEL[view.status] : 'Draft · not saved'}{p?.days_left !== null && p?.days_left !== undefined ? ` · ${p.days_left} days left` : ''}</Tag>
          {p?.last_report ? <span>Last report <b className="text-fg">{formatDate(p.last_report.date, 'short')}</b> · {n1(p.last_report.m3)} m³</span> : view.plan ? <span>No report yet</span> : null}
          {p && <span>Against plan to date <b className={p.variance_to_date < 0 ? 'text-[var(--tt-danger)]' : 'text-fg'}>{p.variance_to_date === 0 ? 'on plan' : `${n1(Math.abs(p.variance_to_date))} m³ ${p.variance_to_date < 0 ? 'behind' : 'ahead'}`}</b></span>}
          <span>{view.expected_days} report days</span>
        </div>
        {view.plan && <div className="flex gap-2"><Btn variant="secondary" size="sm" icon={Download} loading={exporting === 'xlsx'} onClick={() => download('xlsx')}>Excel</Btn><Btn variant="secondary" size="sm" icon={Download} loading={exporting === 'pdf'} onClick={() => download('pdf')}>PDF</Btn></div>}
      </div>
      {view.copied_from && !view.plan && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">Staff, labour, equipment and the section modes are copied from the plan {view.copied_from.label}. Change what is different and save.</p>}

      <nav className="sticky top-0 z-20 -mx-1 flex gap-1.5 overflow-x-auto bg-bg/95 px-1 py-1.5 backdrop-blur tt-scroll-hidden" aria-label="Sections">
        {nav.map(([id, label]) => <a key={id} href={`#${id}`} className="inline-flex h-8 shrink-0 items-center rounded-full border border-line bg-surface px-3 text-xs font-semibold text-fg-muted hover:text-fg">{label}</a>)}
      </nav>

      <Section id="concrete" no={1} title="Concrete planning" note={`${n1(target ?? pourSum)} m³ this plan`}
        tools={(
          <>
            <Mode value={settings.concrete_mode} onChange={(v) => setMode('concrete_mode', v)} disabled={!edit} options={[{ value: 'date', label: 'Date-wise' }, { value: 'month', label: 'Monthly' }]} />
            <Mode value={settings.concrete_scope} onChange={(v) => setMode('concrete_scope', v)} disabled={!edit} options={[{ value: 'tower', label: 'Tower-wise' }, { value: 'overall', label: 'Overall' }]} />
          </>
        )}>
        {p && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([['Planned in this plan', `${n1(target ?? pourSum)} m³`], ['Achieved so far', `${n1(p.poured_to_date)} m³`], ['Variance to date', `${p.variance_to_date > 0 ? '+' : ''}${n1(p.variance_to_date)} m³`], ['Today', `${n1(view.actuals[view.today]?.total ?? 0)} m³`]] as const).map(([l, v]) => (
              <div key={l} className="rounded-lg bg-bg-subtle p-2.5"><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{l}</p><p className="mt-0.5 font-bold tabular-nums text-fg">{v}</p></div>
            ))}
          </div>
        )}
        <ConcreteGrid view={view} from={period.from} to={period.to} lines={lines} setLines={setLines} settings={settings} edit={edit} errors={errors} />
        <div className="flex flex-wrap items-end gap-3 border-t border-line/60 pt-3">
          <label className="text-xs font-semibold text-fg">Cumulative planned for this plan (m³)<NumBox wide value={target} onChange={(v) => { setTarget(v); setDirty(true); }} disabled={!edit} placeholder={String(pourSum)} ariaLabel="Plan total" error={errors.concrete_target_m3} step={0.5} /></label>
          <p className="max-w-md text-[11px] text-fg-muted">Blank = the sum of the grid ({n1(pourSum)} m³). Without pour dates, the plan total is spread evenly over the report days.</p>
        </div>
      </Section>

      {RES.slice(0, 2).map((r, i) => <Resource key={r.kind} r={r} no={i + 2} view={view} siteId={siteId} lines={lines} setLines={setLines} scope={settings[`${r.kind}_scope` as 'staff_scope' | 'labour_scope']} setScope={(v) => setMode(`${r.kind}_scope` as 'staff_scope' | 'labour_scope', v)} edit={edit} errors={errors} />)}
      <Milestones siteId={siteId} view={view} edit={edit} onChanged={onReloadMilestones} />
      <Resource r={RES[2]} no={5} view={view} siteId={siteId} lines={lines} setLines={setLines} scope={settings.equipment_scope} setScope={(v) => setMode('equipment_scope', v)} edit={edit} errors={errors} />

      {view.setup.billing_enabled && (
        <Section id="billing" no={6} title="Billing targets">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-fg">Client bill target<DateBox value={bills.client} onChange={(v) => { setBills((b) => ({ ...b, client: v })); setDirty(true); }} ariaLabel="Client bill target" error={errors.client_bill_on} disabled={!edit} /></label>
            <label className="text-xs font-semibold text-fg">Contractor bill target<DateBox value={bills.contractor} onChange={(v) => { setBills((b) => ({ ...b, contractor: v })); setDirty(true); }} ariaLabel="Contractor bill target" error={errors.contractor_bill_on} disabled={!edit} /></label>
          </div>
        </Section>
      )}
      <Section id="note" no={view.setup.billing_enabled ? 7 : 6} title="Note for the site">
        <TextBox value={note} onChange={(v) => { setNote(v); setDirty(true); }} ariaLabel="Note" placeholder="Anything the site should know this month" disabled={!edit} />
      </Section>

      {edit && (
        <div className="sticky bottom-0 z-20 -mx-1 flex items-center justify-end gap-2 border-t border-line bg-bg/95 px-1 py-2.5 backdrop-blur">
          <p className="mr-auto truncate text-[11px] text-fg-muted">{dirty ? 'Unsaved changes' : view.plan?.updated_by_name ? `Saved by ${view.plan.updated_by_name}` : ''}</p>
          <Btn icon={Save} loading={saving} onClick={save}>{view.plan ? 'Save changes' : 'Create plan'}</Btn>
        </div>
      )}
    </div>
  );
}

const STATUS_TONE: Record<string, 'done' | 'wait' | 'plain'> = { active: 'done', upcoming: 'wait', closed: 'plain' };

/** The site's plans, as the old "planned schedules" list: period, status, daily forms filed, and open or create. */
function PlanList({ siteId, onOpen, onTab }: { siteId: number; onOpen: (id: number | 'new') => void; onTab: (t: string) => void }) {
  const list = useAsync(() => api.plans(siteId), [siteId]);
  const [busy, setBusy] = React.useState(0);
  const d = list.data;
  const running = d?.items.find((p) => p.status === 'active');
  const scheduled = d?.items.filter((p) => p.status === 'upcoming') || [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted">{running ? <>Running: <b className="text-fg">{running.label}</b></> : 'No plan is running today.'}{scheduled.length > 0 && <> · Scheduled: {scheduled.map((p) => `${p.label} (starts ${formatDate(p.valid_from, 'short')})`).join(', ')}</>}</p>
        {d?.access.plan && <Btn icon={Plus} disabled={!d.ready} onClick={() => onOpen('new')}>Create plan</Btn>}
      </div>
      {d && !d.ready && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">Set up the site first (towers, areas and who reports). <button type="button" className="font-semibold text-fg underline" onClick={() => onTab('setup')}>Site setup</button></p>}
      {list.error && <p className="text-sm text-[var(--tt-danger)]">{list.error}</p>}
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {!d ? <div className="p-4"><TableSkeleton rows={4} columns={5} /></div> : !d.items.length ? <p className="p-6 text-center text-sm text-fg-muted">No plans yet. Create the first plan: pick its period, then plan concrete, staff, labour, milestones and equipment.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead><tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{['Plan period', 'Status', 'Daily reports', 'Concrete', 'Last updated', ''].map((h, i) => <th key={i} className="border-b border-line bg-bg-subtle px-3 py-2.5">{h}</th>)}</tr></thead>
              <tbody>
                {d.items.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-bg-subtle/60" onClick={() => onOpen(p.id)}>
                    <td className="border-b border-line/60 px-3 py-2.5"><p className="font-semibold text-fg">{p.label}</p><p className="text-[11px] text-fg-muted">{formatDate(p.valid_from)} – {formatDate(p.valid_till)} · {p.days} days</p></td>
                    <td className="border-b border-line/60 px-3 py-2.5"><Tag tone={STATUS_TONE[p.status]}>{p.status === 'active' ? 'Active' : p.status === 'upcoming' ? `Scheduled · starts ${formatDate(p.valid_from, 'short')}` : 'Closed'}</Tag></td>
                    <td className="border-b border-line/60 px-3 py-2.5 tabular-nums">{p.filed}/{p.forms_expected} filled</td>
                    <td className="border-b border-line/60 px-3 py-2.5 tabular-nums">{n1(p.poured_m3)} / {n1(p.target_m3)} m³</td>
                    <td className="border-b border-line/60 px-3 py-2.5 text-xs text-fg-muted">{p.updated_at ? formatDate(p.updated_at.slice(0, 10)) : '—'}{p.updated_by_name ? ` · ${p.updated_by_name}` : ''}</td>
                    <td className="whitespace-nowrap border-b border-line/60 px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <Btn variant={p.status === 'closed' ? 'secondary' : 'primary'} size="sm" onClick={() => onOpen(p.id)}>{p.status === 'closed' ? 'View plan' : 'Open plan'}</Btn>
                      {p.status === 'upcoming' && d.access.plan && <IconBtn label="Remove plan" disabled={busy === p.id} onClick={async () => { setBusy(p.id); try { await api.deletePlan(p.id); showSuccess('Plan removed'); void list.refetch(); } catch (e) { showError(messageOf(e)); } finally { setBusy(0); } }}><Trash2 className="h-4 w-4" /></IconBtn>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/** Planning of a site, as the old screen: the list of plans, and one plan (or a new one) with its validity, sections and milestones. */
export function PlanTab({ siteId, plan, onOpen, onTab }: { siteId: number; plan: number | 'new' | null; onOpen: (p: number | 'new' | null) => void; onTab: (t: string) => void }) {
  const view = useAsync(() => (plan === 'new' ? api.newPlan(siteId) : api.plan(plan as number)), [siteId, plan], plan !== null);
  if (plan === null) return <PlanList siteId={siteId} onOpen={onOpen} onTab={onTab} />;
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Btn variant="ghost" size="sm" onClick={() => onOpen(null)}>← All plans</Btn>
        <h2 className="text-base font-bold text-fg">{plan === 'new' ? 'New plan' : `Plan · ${view.data?.label || ''}`}</h2>
        {view.data?.plan && <Tag tone={STATUS_TONE[view.data.status]}>{PLAN_LABEL[view.data.status]}</Tag>}
        {view.data?.plan && view.data.status !== 'upcoming' && <Btn variant="secondary" size="sm" icon={CalendarPlus} className="ml-auto" onClick={() => onOpen('new')}>Create plan for next period</Btn>}
      </div>
      {view.error && <p className="text-sm text-[var(--tt-danger)]">{view.error}</p>}
      {!view.data ? <div className="rounded-xl border border-line bg-surface p-4"><TableSkeleton rows={5} columns={3} /></div> : (
        <>
          {!view.data.setup.ready && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">Set up the site first (towers, areas and who reports). <button type="button" className="font-semibold text-fg underline" onClick={() => onTab('setup')}>Site setup</button></p>}
          {view.data.status === 'closed' && <p className="text-xs text-fg-muted">This plan is over; it is kept for its record.</p>}
          <Editor key={`${view.data.plan?.id || 'new'}:${view.data.plan?.updated_at || view.data.valid_from}`} siteId={siteId} view={view.data}
            onSaved={(v) => { if (plan === 'new' && v.plan) onOpen(v.plan.id); else view.setData(v); }}
            onReloadMilestones={() => { if (typeof plan === 'number') void api.plan(plan).then((v) => view.setData((cur) => (cur ? { ...cur, milestones: v.milestones } : v))); }} />
        </>
      )}
    </div>
  );
}

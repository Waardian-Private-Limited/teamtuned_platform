'use client';

import React from 'react';
import Link from 'next/link';
import { ClipboardList, Download, ExternalLink, History } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { formatDate } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { Chip } from '@/components/ui/FormControls';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, btnClass, IconBtn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { Dashboard, Item, Milestone, ReportKind } from '../api/dpr.api';
import { LineChart } from './LineChart';
import { HistoryDialog } from './MilestoneDialogs';
import { Bar, n1, Tag } from './parts';

const signed = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${n1(v)}`);
const TARGET: Record<Dashboard['targets'][number]['status'], { label: string; tone: 'done' | 'wait' | 'late' }> = {
  achieved: { label: 'Achieved', tone: 'done' }, revised: { label: 'Revised', tone: 'wait' }, missed: { label: 'Missed', tone: 'late' }, pending: { label: 'Pending', tone: 'wait' },
};

/** A board panel: a title bar and its content, as on the old DPR analytics page. */
export function Panel({ title, note, right, children, className }: { title: string; note?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface', className)}>
      <header className="flex items-center justify-between gap-2 border-b border-line bg-bg-subtle px-3.5 py-2.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-fg sm:text-xs">{title}{note !== undefined && <span className="ml-1.5 font-semibold normal-case tracking-normal text-fg-muted">{note}</span>}</h3>
        {right}
      </header>
      <div className="min-w-0 flex-1 p-3.5">{children}</div>
    </section>
  );
}

const th = 'border-b border-line px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-fg-muted sm:text-[11px]';
const tdc = 'border-b border-line/60 px-2 py-1.5 text-xs text-fg sm:text-sm';

/** A compact table that scrolls sideways on a phone. */
export function MiniTable({ head, children, foot, minWidth = 360 }: { head: { label: string; right?: boolean }[]; children: React.ReactNode; foot?: React.ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full border-separate border-spacing-0" style={{ minWidth }}>
        <thead><tr>{head.map((h, i) => <th key={i} className={cx(th, h.right && 'text-right')}>{h.label}</th>)}</tr></thead>
        <tbody>{children}</tbody>
        {foot && <tfoot className="font-semibold">{foot}</tfoot>}
      </table>
    </div>
  );
}

function Deployment({ title, rows, planned, present }: { title: string; rows: Dashboard['staff']['rows']; planned: number; present: number | null }) {
  return (
    <Panel title={title} note={present === null ? 'no report' : `${present} / ${planned}`}>
      {!rows.length ? <p className="text-xs text-fg-muted">Nothing planned.</p> : (
        <MiniTable head={[{ label: 'Role' }, { label: 'Pln', right: true }, { label: 'Act', right: true }, { label: 'Var', right: true }]}
          foot={<tr><td className={tdc}>Total</td><td className={`${tdc} text-right tabular-nums`}>{planned}</td><td className={`${tdc} text-right tabular-nums`}>{present ?? '—'}</td><td className={`${tdc} text-right tabular-nums`}>{present === null ? '—' : signed(present - planned)}</td></tr>}>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className={tdc}>{r.name}{r.extra && <span className="ml-1 rounded border border-line px-1 text-[10px] text-fg-muted">new requirement</span>}{r.split && <span className="block text-[10px] text-fg-muted">{r.split}</span>}</td>
              <td className={`${tdc} text-right tabular-nums`}>{r.planned}</td>
              <td className={`${tdc} text-right tabular-nums`}>{r.present ?? '—'}</td>
              <td className={cx(tdc, 'text-right tabular-nums', r.variance !== null && r.variance < 0 && 'font-semibold text-[var(--tt-danger)]')}>{signed(r.variance)}</td>
            </tr>
          ))}
        </MiniTable>
      )}
    </Panel>
  );
}

function ItemList({ items, basePath, empty }: { items: Item[]; basePath: string; empty: string }) {
  const mom = basePath.replace(/\/dpr$/, '');
  if (!items.length) return <p className="text-xs text-fg-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-line/60">
      {items.map((i) => (
        <li key={i.id} className="flex items-start justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className={cx('text-sm font-medium', i.status === 'closed' ? 'text-fg-muted line-through' : 'text-fg')}>{i.title}</p>
            <p className="text-[11px] text-fg-muted">{[i.location_name, i.owner_name || 'No owner', i.status === 'open' ? `${i.days_open ?? 0} d open` : `closed ${formatDate(i.closed_on, 'short')}`, i.due_on ? `due ${formatDate(i.due_on, 'short')}` : null].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Tag tone={i.status === 'open' ? 'wait' : 'done'}>{i.status === 'open' ? 'Open' : 'Closed'}</Tag>
            {i.mom && <Link href={`${mom}/mom/meetings/${i.mom.meeting_id}?point=${i.mom.point_id}`} title={`MOM #${i.mom.point_id}`} className="text-fg-muted hover:text-fg"><ExternalLink className="h-3.5 w-3.5" /></Link>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Asks what goes in the file: the planning board, the billing board or both, and PDF or Excel. */
function DownloadDialog({ d, siteId, kind, onClose }: { d: Dashboard; siteId: number; kind: ReportKind; onClose: () => void }) {
  const { track } = useDownloadCenter();
  const billing = d.setup.billing_enabled;
  const [reports, setReports] = React.useState<ReportKind[]>([billing ? kind : 'progress']);
  const [format, setFormat] = React.useState<'pdf' | 'xlsx'>('pdf');
  const [busy, setBusy] = React.useState(false);
  const toggle = (r: ReportKind) => setReports((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));
  const download = async () => {
    setBusy(true);
    try {
      track(await api.exportReport({ site_id: siteId, date: d.date, format, reports: (['progress', 'billing'] as const).filter((r) => reports.includes(r)) }));
      showSuccess('The report is being prepared. Find it in Downloads.');
      onClose();
    } catch (e) { showError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title="Download report" maxWidthClassName="max-w-md"
      footer={<div className="flex justify-end gap-2"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn icon={Download} loading={busy} disabled={!reports.length} onClick={download}>Download</Btn></div>}>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg">Reports <span className="font-normal text-fg-muted">· {formatDate(d.date)}</span></p>
          <div className="flex flex-wrap gap-2">
            <Chip active={reports.includes('progress')} onClick={() => toggle('progress')}>Planning (DPR analytics)</Chip>
            <Chip active={reports.includes('billing')} onClick={() => toggle('billing')} disabled={!billing}>Billing (CBD)</Chip>
          </div>
          {!billing && <p className="mt-1.5 text-[11px] text-fg-muted">This site keeps no billing report.</p>}
          {!reports.length && <p className="mt-1.5 text-[11px] font-medium text-[var(--tt-danger)]">Pick at least one report.</p>}
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg">Format</p>
          <div className="flex gap-2">
            <Chip active={format === 'pdf'} onClick={() => setFormat('pdf')}>PDF</Chip>
            <Chip active={format === 'xlsx'} onClick={() => setFormat('xlsx')}>Excel</Chip>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Toolbar({ d, basePath, siteId, onDate, kind }: { d: Dashboard; basePath: string; siteId: number; onDate: (v: string) => void; kind: ReportKind }) {
  const [asking, setAsking] = React.useState(false);
  const canFill = kind === 'progress' ? d.access.progress : d.access.billing;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={d.date} max={d.today} onChange={(e) => onDate(e.target.value)} aria-label="Report day"
          className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
        <span className="text-xs text-fg-muted">{d.plan ? `Plan ${d.month_label}` : 'No plan on this day'} · Reports filed <b className={d.reports.missing.length ? 'text-[var(--tt-danger)]' : 'text-fg'}>{d.reports.filed}/{d.reports.expected}</b></span>
      </div>
      <div className="flex flex-wrap gap-2">
        {canFill && d.plan && <Link href={`${basePath}/daily/${siteId}/${d.date}?kind=${kind}`} className={btnClass('primary')}><ClipboardList className="h-3.5 w-3.5" />{kind === 'progress' && d.report ? 'Open report' : 'Fill report'}</Link>}
        <Btn variant="secondary" icon={Download} onClick={() => setAsking(true)}>Download</Btn>
      </div>
      {asking && <DownloadDialog d={d} siteId={siteId} kind={kind} onClose={() => setAsking(false)} />}
    </div>
  );
}

function ProgressBoard({ d, basePath, onTab }: { d: Dashboard; basePath: string; onTab: (t: string) => void }) {
  const [history, setHistory] = React.useState<Milestone | null>(null);
  const c = d.concrete;
  const obs = d.observations;
  const tiles: [string, number][] = [['Int. safety', obs.safety.day.internal], ['Cli. safety', obs.safety.day.client], ['Safety NC', obs.safety.day.nc], ['Int. quality', obs.quality.day.internal], ['Cli. quality', obs.quality.day.client], ['Quality NC', obs.quality.day.nc]];
  const eqPlanned = d.equipment.rows.reduce((s, r) => s + r.planned, 0);
  const eqOnSite = d.equipment.rows.reduce((s, r) => s + (r.on_site ?? 0), 0);
  return (
    <div className="space-y-3 sm:space-y-4">
      {d.report?.note && <p className="rounded-xl border border-line bg-surface p-3 text-sm text-fg"><b>Note from site{d.report.filled_by_name ? ` · ${d.report.filled_by_name}` : ''}:</b> {d.report.note}</p>}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-5">
        <Panel title="Tower schedule status" className="lg:col-span-3">
          {!d.towers.length ? <p className="text-xs text-fg-muted">No towers. Add them with start and end dates in Planning › Site setup.</p> : (
            <MiniTable head={[{ label: 'Tower' }, { label: 'Start' }, { label: 'End' }, { label: 'Total days', right: true }, { label: 'Remaining', right: true }]}>
              {d.towers.map((t) => (
                <tr key={t.id}>
                  <td className={`${tdc} font-medium`}>{t.name}</td>
                  <td className={tdc}>{formatDate(t.start_on)}</td>
                  <td className={tdc}>{formatDate(t.end_on)}</td>
                  <td className={`${tdc} text-right tabular-nums`}>{t.total_days ?? '—'}</td>
                  <td className={cx(tdc, 'text-right tabular-nums', Boolean(t.overdue_days) && 'font-semibold text-[var(--tt-danger)]')}>{t.overdue_days ? `Overdue ${t.overdue_days} d` : t.remaining_days ?? '—'}</td>
                </tr>
              ))}
            </MiniTable>
          )}
        </Panel>
        <Panel title="Concrete progress" className="lg:col-span-2">
          <div className="space-y-3.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><span className="font-semibold text-fg">Total project scope</span><span className="tabular-nums text-fg-muted"><b className="text-fg">{n1(c.project_poured)}</b> / {n1(c.project_total)} m³{c.project_pct !== null && ` · ${c.project_pct}%`}</span></div>
              <Bar pct={c.project_pct} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs"><span className="font-semibold text-fg">This plan ({d.month_label})</span><span className="tabular-nums text-fg-muted"><b className="text-fg">{n1(c.poured_to_date)}</b> / {n1(c.month_target)} m³{c.month_pct !== null && ` · ${c.month_pct}%`}</span></div>
              <Bar pct={c.month_pct} />
              <p className="text-[11px] text-fg-muted">Plan to date {n1(c.planned_to_date)} m³ · <span className={c.variance_to_date < 0 ? 'font-semibold text-[var(--tt-danger)]' : ''}>{signed(c.variance_to_date)}</span></p>
            </div>
            <div className="flex items-end justify-between rounded-lg bg-bg-subtle p-2.5">
              <div><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Achieved {d.date === d.today ? 'today' : formatDate(d.date, 'short')}</p><p className="text-2xl font-extrabold tabular-nums text-fg">{n1(c.poured_on_date)} <span className="text-sm font-semibold">m³</span></p></div>
              <p className="text-xs tabular-nums text-fg-muted">Planned {n1(c.planned_on_date)} m³</p>
            </div>
            {d.report?.shortfall_reason && <p className="text-xs text-fg-muted"><b className="text-fg">Shortfall:</b> {d.report.shortfall_reason}</p>}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-6">
        {tiles.map(([label, v]) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-2.5 text-center sm:p-3">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-fg-muted sm:text-[11px]">{label}</p>
            <p className={cx('mt-1 text-xl font-extrabold tabular-nums sm:text-2xl', label.includes('NC') && v > 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Deployment title="Staff deployment" rows={d.staff.rows} planned={d.staff.planned} present={d.staff.present} />
        <Panel title="Schedule targets" note={`due or achieved on ${formatDate(d.date, 'short')}`} right={<button type="button" onClick={() => onTab('milestones')} className="text-xs font-semibold text-fg hover:underline">View all</button>}>
          {!d.targets.length ? <p className="text-xs text-fg-muted">Nothing due or achieved on this day.</p> : (
            <MiniTable minWidth={420} head={[{ label: 'Tower / slab' }, { label: 'Target' }, { label: 'Status' }, { label: '' }]}>
              {d.targets.map((m) => (
                <tr key={m.id}>
                  <td className={tdc}><span className="font-medium">{[m.location_name, m.level].filter(Boolean).join(' · ') || 'Site'}</span><span className="block text-[11px] text-fg-muted">{m.activity}</span></td>
                  <td className={tdc}>{formatDate(m.target_on, 'short')}{m.planned_on && m.planned_on !== m.target_on && <s className="ml-1 text-[11px] text-fg-muted">{formatDate(m.planned_on, 'short')}</s>}</td>
                  <td className={tdc}><Tag tone={TARGET[m.status].tone}>{TARGET[m.status].label}</Tag></td>
                  <td className={`${tdc} text-right`}><IconBtn label="Log" onClick={() => setHistory(m)}><History className="h-3.5 w-3.5" /></IconBtn></td>
                </tr>
              ))}
            </MiniTable>
          )}
        </Panel>
        <Deployment title="Labour deployment" rows={d.labour.rows} planned={d.labour.planned} present={d.labour.present} />
        <Panel title="Equipment" note={d.equipment.short ? `${d.equipment.short} short` : undefined}>
          {!d.equipment.rows.length ? <p className="text-xs text-fg-muted">Nothing planned.</p> : (
            <MiniTable head={[{ label: 'Equipment' }, { label: 'Status' }, { label: 'Act / Pln', right: true }]}
              foot={<tr><td className={tdc} colSpan={2}>Total</td><td className={`${tdc} text-right tabular-nums`}>{eqOnSite} / {eqPlanned}</td></tr>}>
              {d.equipment.rows.map((e) => {
                const short = e.on_site !== null && e.on_site < e.planned;
                return (
                  <tr key={e.name} className={short ? 'bg-[var(--tt-danger-soft)]' : undefined}>
                    <td className={tdc}><span className="font-medium">{e.name}</span>{e.reason && <span className="block text-[11px] text-fg-muted">{e.reason}</span>}</td>
                    <td className={tdc}>{e.on_site === null ? <Tag tone="plain">No report</Tag> : short ? <Tag tone="late">{e.planned - e.on_site} short</Tag> : <Tag tone="done">OK</Tag>}</td>
                    <td className={`${tdc} text-right tabular-nums`}>{e.on_site ?? '—'} / {e.planned}</td>
                  </tr>
                );
              })}
            </MiniTable>
          )}
          {d.day.breakdown.rows.length > 0 && <div className="mt-3"><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Breakdowns</p><ItemList items={d.day.breakdown.rows} basePath={basePath} empty="" /></div>}
        </Panel>
        <Panel title="Materials">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Requested this day</p><ItemList items={d.day.material.raised} basePath={basePath} empty="None" /></div>
            <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Received this day</p><ItemList items={d.day.material.closed} basePath={basePath} empty="None" /></div>
          </div>
          {d.day.material.open.length > 0 && <p className="mt-2 text-[11px] text-fg-muted">{d.day.material.open.length} still awaited.</p>}
        </Panel>
        <Panel title="Safety and quality issues" right={<span className="text-[11px] text-fg-muted">{d.day.issue.open.length} open · {d.day.issue.closed.length} closed · {d.day.issue.raised.length} raised today</span>}>
          <ItemList items={d.day.issue.rows} basePath={basePath} empty="No open issues." />
        </Panel>
      </div>
      <Panel title="Actions and observations" note={`raised this day or still open · ${d.day.action.rows.length}`}>
        <ItemList items={d.day.action.rows} basePath={basePath} empty="Nothing open." />
      </Panel>
      {history && <HistoryDialog milestone={history} onClose={() => setHistory(null)} />}
    </div>
  );
}

function BillingBoard({ d }: { d: Dashboard }) {
  const b = d.billing;
  if (!b) return <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">This site keeps no billing report.</p>;
  const s = b.steel || {};
  const locName = (id: string | null) => d.setup.locations.find((l) => l.id === id)?.name || 'Overall';
  const late = (target: string | null, done: string | null) => !done && target && target < d.date;
  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {([['Steel received', s.received], ['Steel billed', s.billed], ['Doc compliance', b.compliance_pct === null ? null : `${b.compliance_pct}%`], ['WIP steel', s.wip]] as [string, number | string | null | undefined][]).map(([label, v]) => (
          <div key={label} className="rounded-xl border border-line bg-surface p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums text-fg">{v === null || v === undefined ? '—' : typeof v === 'number' ? n1(v) : v}</p></div>
        ))}
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Panel title="Billing deadlines">
          <MiniTable head={[{ label: '' }, { label: 'Target' }, { label: 'Achieved' }]}>
            <tr><td className={`${tdc} font-medium`}>Client bill</td><td className={tdc}>{formatDate(b.client_bill_on)}</td><td className={cx(tdc, late(b.client_bill_on, b.client_bill_done_on) && 'font-semibold text-[var(--tt-danger)]')}>{b.client_bill_done_on ? formatDate(b.client_bill_done_on) : late(b.client_bill_on, null) ? 'Late' : '—'}</td></tr>
            <tr><td className={`${tdc} font-medium`}>Contractor bill</td><td className={tdc}>{formatDate(b.contractor_bill_on)}</td><td className={cx(tdc, late(b.contractor_bill_on, b.contractor_bill_done_on) && 'font-semibold text-[var(--tt-danger)]')}>{b.contractor_bill_done_on ? formatDate(b.contractor_bill_done_on) : late(b.contractor_bill_on, null) ? 'Late' : '—'}</td></tr>
          </MiniTable>
        </Panel>
        <Panel title="Steel reconciliation" note={b.steel_as_of ? `as of ${formatDate(b.steel_as_of, 'short')}` : undefined}>
          <dl className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
            {([['received', 'Received'], ['billed', 'Billed'], ['wip', 'WIP'], ['jmr', 'JMR'], ['stock', 'Stock'], ['scrap', 'Scrap'], ['wastage_pct', 'Wastage %']] as const).map(([k, label]) => <div key={k} className="rounded-lg bg-bg-subtle p-2"><dt className="text-fg-muted">{label}</dt><dd className="font-bold tabular-nums text-fg">{n1(s[k] ?? null)}</dd></div>)}
          </dl>
          <div className="mt-3"><LineChart points={b.series.steel} series={[{ key: 'received', label: 'Received' }, { key: 'billed', label: 'Billed', dashed: true }]} /></div>
        </Panel>
      </div>
      <Panel title="Daily concrete reconciliation">
        {!b.concrete.length ? <p className="text-xs text-fg-muted">No reconciliation on this day.</p> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {b.concrete.map((r, i) => (
              <div key={i} className="rounded-lg border border-line p-2.5 text-xs">
                <p className="font-semibold text-fg">{locName(r.location_id)}</p>
                <p className="mt-1 tabular-nums text-fg-muted">Theo {n1(r.theoretical)} · Cons {n1(r.consumed)}</p>
                <p className={cx('tabular-nums', (r.difference ?? 0) > 0 ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg')}>Diff {signed(r.difference ?? null)} · {r.wastage_pct ?? '—'}%</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3"><LineChart points={b.series.concrete} series={[{ key: 'consumed', label: 'Consumed' }, { key: 'theoretical', label: 'Theoretical', dashed: true }]} unit=" m³" /></div>
      </Panel>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {([['Report checklist', b.day?.checklist], ['Billing documents', b.day?.documents]] as const).map(([title, rows]) => (
          <Panel key={title} title={title}>
            {!rows?.length ? <p className="text-xs text-fg-muted">No billing report on this day.</p> : (
              <ul className="divide-y divide-line/60">
                {rows.map((x) => (
                  <li key={x.name} className="flex items-start justify-between gap-2 py-1.5 text-sm">
                    <div className="min-w-0"><p className="text-fg">{x.name}</p>{x.remark && <p className="text-[11px] text-fg-muted">{x.remark}</p>}{x.files.map((f) => <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="mr-2 text-[11px] font-semibold underline">{f.name}</a>)}</div>
                    <Tag tone={x.done === null ? 'wait' : x.done ? 'done' : 'late'}>{x.done === null ? '—' : x.done ? 'Yes' : 'No'}</Tag>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Panel title="Vendor compliance">
          {!b.day?.vendors.length ? <p className="text-xs text-fg-muted">No vendors on this day.</p> : (
            <MiniTable head={[{ label: 'Vendor' }, { label: 'Reg' }, { label: 'WO' }, { label: 'Closing' }]}>
              {b.day.vendors.map((v) => (
                <tr key={v.name}><td className={tdc}>{v.name}{v.remark && <span className="block text-[11px] text-fg-muted">{v.remark}</span>}</td>
                  {([v.reg_form, v.work_order, v.closing_bill]).map((x, i) => <td key={i} className={tdc}><Tag tone={x === null ? 'wait' : x ? 'done' : 'late'}>{x === null ? '—' : x ? 'Yes' : 'No'}</Tag></td>)}</tr>
              ))}
            </MiniTable>
          )}
        </Panel>
        <Panel title="Document compliance breakdown" note="this month">
          {!b.series.documents.length ? <p className="text-xs text-fg-muted">No billing reports yet.</p> : (
            <ul className="space-y-2">
              {b.series.documents.map((x) => (
                <li key={x.name} className="space-y-1">
                  <div className="flex justify-between gap-2 text-xs"><span className="truncate text-fg">{x.name}</span><span className="tabular-nums text-fg-muted">{x.yes} / {x.asked}</span></div>
                  <Bar pct={x.asked ? (x.yes / x.asked) * 100 : 0} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/** DPR analytics for one site and day, laid out as the old board. `kind` progress shows the planning board, billing the CBD board. */
export function DashboardTab({ siteId, basePath, onTab, kind = 'progress' }: { siteId: number; basePath: string; onTab: (t: string) => void; kind?: 'progress' | 'billing' }) {
  const [date, setDate] = React.useState('');
  const { data: d, loading, error } = useAsync(() => api.dashboard(siteId, { date: date || undefined }), [siteId, date]);
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;
  if (!d) return <div className="rounded-xl border border-line bg-surface p-4"><TableSkeleton rows={6} columns={4} /></div>;
  return (
    <div className={cx('space-y-3 sm:space-y-4', loading && 'opacity-70 transition-opacity')}>
      <Toolbar d={d} basePath={basePath} siteId={siteId} onDate={setDate} kind={kind} />
      {!d.setup.ready && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">This site is not set up yet. {d.access.plan && <button type="button" onClick={() => onTab('setup')} className="font-semibold text-fg underline">Set it up</button>}</p>}
      {d.setup.ready && !d.plan && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">No plan covers {formatDate(d.date)}, so no daily forms. {d.access.plan && <button type="button" onClick={() => onTab('plan')} className="font-semibold text-fg underline">Create a plan</button>}</p>}
      {kind === 'progress' ? <ProgressBoard d={d} basePath={basePath} onTab={onTab} /> : <BillingBoard d={d} />}
    </div>
  );
}

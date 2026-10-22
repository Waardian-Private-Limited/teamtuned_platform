'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { EmptyState } from '@/components/ui/EmptyState';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../api/perf.api';
import { CYCLE_STATUS_LABEL, SCORE_BASIS_LABEL } from '../constants/perf.constants';
import { fmt } from '../lib';
import type { CycleReport } from '../types/perf.types';
import { Btn, PageHead, Stat, td, th } from './ui';

const card = 'rounded-xl border border-line bg-surface p-3 sm:p-4';

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—');

/** A heat cell: darker means a higher average score. Plain ink on paper, no colour scale to learn. */
function Heat({ value }: { value: number | null }) {
  if (value === null) return <td className={`${td} text-center text-fg-muted`}>—</td>;
  const strength = Math.max(0, Math.min(100, value)) / 100;
  return (
    <td className={`${td} text-center font-semibold`} style={{ background: `color-mix(in srgb, var(--tt-primary) ${Math.round(strength * 28)}%, transparent)` }}>{fmt(value, 1)}</td>
  );
}

/** HR view of one cycle: how far it has got, how ratings are spread, which KRAs and KPIs are strong or weak, and how each team did. */
export function CycleReportPage({ id, basePath }: { id: number; basePath: string }) {
  const { track } = useDownloadCenter();
  const [report, setReport] = React.useState<CycleReport | null>(null);
  const [error, setError] = React.useState('');
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => { api.cycleReport(id).then(setReport).catch((e) => setError(messageOf(e))); }, [id]);

  const download = async () => {
    setExporting(true);
    try { track(await api.exportCycleReport(id)); } catch (e) { setError(messageOf(e)); } finally { setExporting(false); }
  };

  if (!report) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;
  const p = report.progress;
  const d = report.distribution;
  const maxCount = Math.max(1, ...d.overall.rows.map((r) => r.count));
  const kpiRows = report.heatmap.rows.filter((r) => r.kind === 'kpi');
  const compRows = report.heatmap.rows.filter((r) => r.kind === 'competency');

  const heatTable = (rows: CycleReport['heatmap']['rows'], withGroup: boolean) => (
    <div className="overflow-auto rounded-lg border border-line tt-scroll-hidden">
      <table className="w-full min-w-[560px] border-separate border-spacing-0">
        <thead>
          <tr>
            {withGroup && <th className={th}>KRA</th>}
            <th className={th}>{withGroup ? 'KPI' : 'Competency'}</th>
            <th className={`${th} text-center`}>All</th>
            {report.heatmap.departments.map((x) => <th key={x.department_id} className={`${th} text-center`}>{x.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.group}-${r.name}`} className="border-t border-line/60">
              {withGroup && <td className={`${td} text-fg-muted`}>{r.group || '—'}</td>}
              <td className={td}>{r.name}</td>
              <Heat value={r.average} />
              {r.cells.map((c) => <Heat key={c.department_id} value={c.average} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        help={HELP.report}
        title={<><Link href={`${basePath}/cycles/${id}`} aria-label="Back to cycle" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>{report.cycle.name}: reports</>}
        subtitle={`${CYCLE_STATUS_LABEL[report.cycle.status]} · ${report.cycle.period_start} to ${report.cycle.period_end} · ${report.people_count} people`}
        actions={<Btn variant="secondary" icon={Download} loading={exporting} onClick={download}>Download Excel</Btn>}
      >
        {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      </PageHead>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto tt-scroll-hidden">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat label="Goals approved" value={`${p.goals_approved} of ${p.total}`} note={pct(p.goals_approved, p.total)} />
        <Stat label="Reviews approved" value={`${p.reviews_approved} of ${p.total}`} note={pct(p.reviews_approved, p.total)} />
        <Stat label="Released" value={`${p.released} of ${p.total}`} note={pct(p.released, p.total)} />
        <Stat label="Acknowledged" value={`${p.acknowledged} of ${p.released}`} note={p.acknowledgement.disputed ? `${p.acknowledgement.disputed} disputed` : undefined} />
      </div>

      {report.breaks.length > 0 && (
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-fg">Goal score by break</h2>
            <p className="text-[11px] text-fg-muted">Year-end score: {SCORE_BASIS_LABEL[report.cycle.score_basis]}</p>
          </div>
          <div className="flex h-40 items-end gap-2 sm:gap-3">
            {report.breaks.map((b) => {
              const h = b.average === null ? 0 : Math.max(4, Math.min(100, (b.average / Math.max(100, ...report.breaks.map((x) => x.average ?? 0))) * 100));
              return (
                <div key={b.period_id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-bold text-fg">{b.average === null ? '—' : fmt(b.average, 1)}</span>
                  <div className="w-full max-w-16 rounded-t-md bg-[var(--tt-primary)]" style={{ height: `${h}%`, opacity: b.closed ? 1 : 0.55 }} title={`${b.label}: ${b.scored} people scored`} />
                  <span className="w-full truncate text-center text-[11px] font-semibold text-fg">{b.label}</span>
                  <span className="text-[10px] text-fg-muted">{b.scored} scored{b.weight !== null ? ` · ${b.weight}%` : ''}{b.closed ? ' · closed' : ''}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-fg-muted">Average goal score of everyone with a value in that break. Solid bars are closed breaks; lighter bars can still change.</p>
        </section>
      )}

      <section className={card}>
        <h2 className="mb-2 text-sm font-bold text-fg">Progress by department</h2>
        <div className="overflow-auto rounded-lg border border-line tt-scroll-hidden">
          <table className="w-full min-w-[520px] border-separate border-spacing-0">
            <thead><tr><th className={th}>Department</th><th className={th}>People</th><th className={th}>Goals approved</th><th className={th}>Reviews approved</th><th className={th}>Released</th></tr></thead>
            <tbody>
              {p.departments.map((x) => (
                <tr key={x.department_id} className="border-t border-line/60">
                  <td className={td}>{x.name}</td><td className={td}>{x.total}</td>
                  <td className={td}>{x.goals_approved} <span className="text-fg-muted">({pct(x.goals_approved, x.total)})</span></td>
                  <td className={td}>{x.reviews_approved} <span className="text-fg-muted">({pct(x.reviews_approved, x.total)})</span></td>
                  <td className={td}>{x.released}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-2 text-sm font-bold text-fg">Rating spread</h2>
        {d.overall.total === 0 ? <EmptyState compact title="No ratings yet" description="Ratings appear once reviews are written." /> : (
          <div className="space-y-1.5">
            {d.overall.rows.map((r) => (
              <div key={r.code} className="grid grid-cols-[6rem_1fr_9rem] items-center gap-2 text-xs text-fg">
                <span className="truncate">{r.code}</span>
                <div className="h-4 rounded bg-bg-subtle"><div className="h-4 rounded bg-[var(--tt-primary)]" style={{ width: `${(r.count / maxCount) * 100}%` }} /></div>
                <span className={r.flag ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted'}>{r.count} · {r.percent}%{r.target !== null ? ` (aim ${r.target}%)` : ''}</span>
              </div>
            ))}
          </div>
        )}
        {d.departments.length > 1 && (
          <div className="mt-3 overflow-auto rounded-lg border border-line tt-scroll-hidden">
            <table className="w-full min-w-[480px] border-separate border-spacing-0">
              <thead><tr><th className={th}>Department</th><th className={th}>Rated</th>{d.codes.map((c) => <th key={c} className={`${th} text-center`}>{c}</th>)}</tr></thead>
              <tbody>
                {d.departments.map((x) => (
                  <tr key={x.department_id} className="border-t border-line/60"><td className={td}>{x.name}</td><td className={td}>{x.total}</td>{d.codes.map((c) => <td key={c} className={`${td} text-center`}>{x.bands[c] || '—'}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-1 text-sm font-bold text-fg">KRA and KPI scores by department</h2>
        <p className="mb-2 text-[11px] text-fg-muted">Average score of the people who have one. Darker is higher.</p>
        {kpiRows.length === 0 ? <EmptyState compact title="No scored goals yet" description="Scores appear once goals have values." /> : heatTable(kpiRows, true)}
        {compRows.length > 0 && <div className="mt-4">{heatTable(compRows, false)}</div>}
      </section>

      <section className={card}>
        <h2 className="mb-2 text-sm font-bold text-fg">Team scorecards</h2>
        <div className="overflow-auto rounded-lg border border-line tt-scroll-hidden">
          <table className="w-full min-w-[560px] border-separate border-spacing-0">
            <thead><tr><th className={th}>Reviewer</th><th className={th}>Team</th><th className={th}>Scored</th><th className={th}>Average</th><th className={th}>Released</th>{d.codes.map((c) => <th key={c} className={`${th} text-center`}>{c}</th>)}</tr></thead>
            <tbody>
              {report.teams.map((t) => (
                <tr key={t.reviewer_id ?? 'none'} className="border-t border-line/60">
                  <td className={td}>{t.reviewer_name || '—'}</td><td className={td}>{t.size}</td><td className={td}>{t.scored}</td><td className={td}>{fmt(t.average_score, 1)}</td><td className={td}>{t.released}</td>
                  {d.codes.map((c) => <td key={c} className={`${td} text-center`}>{t.bands[c] || '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </div>
  );
}

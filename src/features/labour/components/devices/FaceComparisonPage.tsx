'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import * as api from '../../api/labour.api';
import { LABOUR_ILLUSTRATIONS as ILL } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { useLabourSites } from '../../hooks/useLabourLists';
import { usePagedList } from '../../hooks/usePagedList';
import type { FaceComparisonOutcome, FaceComparisonPage as Page, FaceComparisonPerson, FaceComparisonRow } from '../../types/labour.types';
import { fmtDateTime, today } from '../../utils/format';
import { DateFilter, FilterBar, FilterGrid, FilterSelect, Gate, ListShell, PageHeader, Pill, td, th } from '../shared/Primitives';

/** The share of agreement the org set as the bar for moving labour matching to the AI server. */
const BAR = 90;

const OUTCOMES: Array<{ value: FaceComparisonOutcome; label: string }> = [
  { value: 'disagree', label: 'All disagreements' },
  { value: 'different_person', label: 'Named different people' },
  { value: 'aws_only', label: 'AWS matched, AI found no one' },
  { value: 'ai_only', label: 'AI matched, AWS found no one' },
  { value: 'agree', label: 'Agreed' },
  { value: 'unjudged', label: 'Could not compare' },
  { value: 'all', label: 'Everything' },
];

const addDays = (ymd: string, n: number) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const pct = (n: number, d: number) => (d ? (n / d) * 100 : null);
const fmtPct = (v: number | null) => (v === null ? '–' : `${v.toFixed(1)}%`);

interface Filters extends Record<string, unknown> { search?: string; from: string; to: string; siteId: string; outcome: FaceComparisonOutcome }
const INITIAL: Filters = { from: addDays(today(), -13), to: today(), siteId: '', outcome: 'disagree' };

/** Org admins only: our AI server vs AWS on real labour punches, to decide whether labour matching can move to the AI server. */
export function FaceComparisonPage() {
  const { enabled } = useLabourAccess();
  const { isOrgAdmin } = usePermission();
  return <Gate enabled={enabled} allowed={isOrgAdmin} what="the face comparison"><FaceComparison /></Gate>;
}

function Person({ p, empty = 'No one' }: { p: FaceComparisonPerson | null; empty?: string }) {
  if (!p) return <span className="text-fg-muted">{empty}</span>;
  return (
    <>
      <div className="font-semibold text-fg">{p.name}</div>
      <div className="text-[11px] text-fg-muted">{p.code}</div>
    </>
  );
}

function Stat({ label, value, hint, active, onClick }: { label: string; value: React.ReactNode; hint?: string; active?: boolean; onClick?: () => void }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-fg-muted">{hint}</p>}
    </>
  );
  const cls = cx('rounded-xl border bg-surface p-3 text-left', active ? 'border-fg' : 'border-line');
  return onClick
    ? <button type="button" onClick={onClick} className={cx(cls, 'transition-colors hover:bg-bg-subtle')}>{body}</button>
    : <div className={cls}>{body}</div>;
}

function FaceComparison() {
  const { sites } = useLabourSites();
  const [meta, setMeta] = useState<Pick<Page, 'mode' | 'summary' | 'sites'> | null>(null);
  const [photo, setPhoto] = useState<FaceComparisonRow | null>(null);
  const list = usePagedList<FaceComparisonRow, Filters>(
    (f, page, pageSize) => api.faceComparison({ from: f.from, to: f.to, siteId: f.siteId ? Number(f.siteId) : undefined, outcome: f.outcome, page, pageSize })
      .then((r) => { setMeta({ mode: r.mode, summary: r.summary, sites: r.sites }); return r; }),
    INITIAL, { pageSize: 25 },
  );
  const f = list.filters;
  const s = meta?.summary;
  const agreePct = s ? pct(s.agreed, s.judged) : null;
  const pick = (outcome: FaceComparisonOutcome) => list.update({ outcome: f.outcome === outcome ? 'disagree' : outcome });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeader title="Face comparison" description="Our AI server and AWS checked the same labour punches. AWS decided each punch; the AI server's answer was recorded silently next to it. Use this to decide whether labour can move to the AI server." />

      {meta && meta.mode !== 'aws' && (
        <p className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg-muted">
          Labour matching is set to <b className="text-fg">{meta.mode === 'both' ? 'AI server first, then AWS' : 'AI server only'}</b>, so nothing new is recorded here. The figures are from when it ran on AWS.
        </p>
      )}

      {s && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Stat label="Agreement" value={fmtPct(agreePct)}
              hint={agreePct === null ? 'Nothing to compare yet' : `${s.agreed} of ${s.judged} punches · ${agreePct >= BAR ? 'at or above' : 'below'} the ${BAR}% bar`}
              active={f.outcome === 'agree'} onClick={() => pick('agree')} />
            <Stat label="Same person" value={s.bothSame} hint="Both named the same labourer" />
            <Stat label="Both found no one" value={s.bothNone} hint="Both refused the face" />
            <Stat label="Checked by both" value={s.total} hint={`${s.total - s.judged} could not be compared${s.aiMs ? ` · AI ${s.aiMs} ms avg` : ''}`}
              active={f.outcome === 'unjudged'} onClick={() => pick('unjudged')} />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Stat label="Named different people" value={s.differentPerson} hint="One of them is wrong: check the photo" active={f.outcome === 'different_person'} onClick={() => pick('different_person')} />
            <Stat label="AWS matched, AI found no one" value={s.awsOnly} hint="AI stricter: the worker would try again" active={f.outcome === 'aws_only'} onClick={() => pick('aws_only')} />
            <Stat label="AI matched, AWS found no one" value={s.aiOnly} hint="AI looser, or AWS missed: check the photo" active={f.outcome === 'ai_only'} onClick={() => pick('ai_only')} />
          </div>
        </>
      )}

      {meta && meta.sites.length > 1 && (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={th}>Site</th><th className={cx(th, 'text-right')}>Compared</th><th className={cx(th, 'text-right')}>Agreed</th><th className={cx(th, 'text-right')}>Agreement</th></tr></thead>
            <tbody>
              {meta.sites.map((x) => {
                const p = pct(x.agreed, x.judged);
                return (
                  <tr key={x.siteId ?? 'none'}>
                    <td className={td}>{x.siteName || '-'}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{x.judged}</td>
                    <td className={cx(td, 'text-right tabular-nums')}>{x.agreed}</td>
                    <td className={cx(td, 'text-right font-semibold tabular-nums', p !== null && p < BAR ? 'text-fg' : 'text-fg-muted')}>{fmtPct(p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FilterBar>
        <FilterGrid>
          <DateFilter label="From" value={f.from} onChange={(from) => list.update({ from, to: f.to < from ? from : f.to })} />
          <DateFilter label="To" value={f.to} onChange={(to) => list.update({ to })} />
          <FilterSelect label="Site" value={f.siteId} onChange={(siteId) => list.update({ siteId })} anyLabel="All sites" options={sites.map((x) => ({ value: String(x.value), label: x.label }))} />
          <FilterSelect label="Show" value={f.outcome} onChange={(outcome) => list.update({ outcome: (outcome || 'disagree') as FaceComparisonOutcome })} anyLabel="All disagreements"
            options={OUTCOMES.filter((o) => o.value !== 'disagree').map((o) => ({ value: o.value, label: o.label }))} />
        </FilterGrid>
      </FilterBar>

      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={false} onClear={list.clear}
        emptyIllustration={ILL.events} emptyTitle="Nothing here" emptyText="No punches of this kind in the range." minH="min-h-[240px]"
        page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr><th className={th}>Time</th><th className={th}>Machine said</th><th className={th}>AWS (decided)</th><th className={th}>AI server</th><th className={cx(th, 'hidden lg:table-cell')}>Site</th><th className={th}>Punch</th></tr>
            </thead>
            <tbody>
              {list.rows.map((r) => (
                <tr key={r.id}>
                  <td className={cx(td, 'whitespace-nowrap text-fg-muted')}>{fmtDateTime(r.at)}</td>
                  <td className={td}>{r.kind === 'confirm' ? <Person p={r.machine} /> : <span className="text-fg-muted">Did not know the face</span>}</td>
                  <td className={td}>
                    {r.aws.verdict === 'error' ? <span className="text-fg-muted">AWS unavailable</span> : <Person p={r.aws.labourer} />}
                    {r.aws.similarity !== null && <div className="text-[11px] text-fg-muted">{r.aws.similarity.toFixed(1)}%</div>}
                  </td>
                  <td className={td}>
                    <Person p={r.ai.labourer} empty={r.ai.status === 'NO_FACE' ? 'No face seen' : r.ai.status === 'LOW_QUALITY' ? 'Poor photo' : 'No one'} />
                    <div className="text-[11px] text-fg-muted">{r.ai.status}{r.ai.similarity !== null ? ` · cos ${r.ai.similarity.toFixed(2)}` : ''}</div>
                    {r.agree !== null && <div className="mt-1"><Pill tone={r.agree ? 'good' : 'bad'}>{r.agree ? 'Agrees' : 'Disagrees'}</Pill></div>}
                  </td>
                  <td className={cx(td, 'hidden lg:table-cell')}>
                    <div className="text-fg">{r.site.name || '-'}</div>
                    <div className="text-[11px] text-fg-muted">{r.deviceName}</div>
                  </td>
                  <td className={cx(td, 'w-20')}>
                    {r.imageUrl ? (
                      <button type="button" onClick={() => setPhoto(r)} aria-label="Open the photo" className="h-11 w-11 overflow-hidden rounded-lg border border-line bg-bg-subtle">
                        {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link */}
                        <img src={r.imageUrl} alt="" className="h-full w-full object-cover" />
                      </button>
                    ) : null}
                    <div className="text-[11px] text-fg-muted">{r.punchId ? `#${r.punchId}` : 'Refused'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ListShell>

      {photo && (
        <Dialog open onClose={() => setPhoto(null)} title={`Punch #${photo.punchId} · ${fmtDateTime(photo.at)}`} maxWidthClassName="max-w-xl">
          <div className="flex items-center justify-center overflow-hidden rounded-xl border border-line bg-bg-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived presigned link (refresh the list if it has expired) */}
            <img src={photo.imageUrl || ''} alt="Punch photo" className="max-h-[70vh] w-full object-contain" />
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            AWS: {photo.aws.labourer ? `${photo.aws.labourer.name} (${photo.aws.labourer.code})` : 'no one'} · AI server: {photo.ai.labourer ? `${photo.ai.labourer.name} (${photo.ai.labourer.code})` : 'no one'}
          </p>
        </Dialog>
      )}
    </div>
  );
}

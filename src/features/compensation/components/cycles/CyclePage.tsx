'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Lock, RefreshCw, Save, Sparkles, Upload, UserPlus, Send } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Alert } from '@/components/ui/Alert';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { usePermission } from '@/lib/hooks/usePermission';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import { COMP_PERMISSIONS } from '../../constants/compensation.constants';
import { usePagedQuery } from '../../hooks/usePagedQuery';
import type { CycleDto, LinkablePerformanceCycleDto, PerformanceImportDto, ProposalFlag, RatingLevel, RatingSource, RatingSyncDto, RevisionDto } from '../../types/compensation.dto';
import { date, inr, pct } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { ConfirmDialog, type ConfirmState } from '../shared/ConfirmDialog';
import { Empty, Panel, Stat, Toolbar, td, th } from '../shared/Panel';
import { SearchBox } from '../shared/SearchBox';
import { FilterTabs } from '../shared/FilterTabs';
import { StatusBadge } from '../shared/StatusBadge';
import { SalaryHistoryDrawer } from '../SalaryHistoryDrawer';
import { BonusPanel } from './BonusPanel';
import { PerformanceCyclePicker, type PickableCycle } from './PerformanceCyclePicker';
import { SubmitCycleDialog } from './SubmitCycleDialog';
import { ManagerReviewPanel } from './ManagerReviewPanel';
import { RateForManagerDialog } from './RateForManagerDialog';
import { RatingUploadDialog } from './RatingUploadDialog';

interface Draft {
  rating?: string;
  percent?: string;
  designation?: string;
}

const FLAG_LABEL: Record<ProposalFlag, string> = {
  rating_changed: 'Changed in Performance',
  differs: 'Differs from Performance',
  disputed: 'Disputed',
  promotion_ready: 'Promotion ready',
  on_pip: 'On improvement plan',
};
const FLAG_ORDER = Object.keys(FLAG_LABEL) as ProposalFlag[];

/** What Performance says about one row, in a line or two under the rating. */
function RowFlags({ r }: { r: RevisionDto }) {
  const flags = r.flags || [];
  if (!flags.length) return null;
  const p = r.performance;
  const text = (f: ProposalFlag) => {
    if (f === 'rating_changed') return `Performance now ${p?.band ?? '—'} (imported ${p?.imported ?? '—'})`;
    if (f === 'differs') return `Performance: ${p?.band ?? '—'}`;
    if (f === 'promotion_ready') return p?.box_name ? `Promotion ready · ${p.box_name}` : FLAG_LABEL[f];
    return FLAG_LABEL[f];
  };
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {flags.map((f) => (
        <span key={f} className={cx('rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight', f === 'rating_changed' || f === 'disputed' ? 'border-fg text-fg' : 'border-line text-fg-muted')}>{text(f)}</span>
      ))}
    </div>
  );
}

const SOURCE_LABEL: Record<RatingSource, string> = { performance: 'Rated from Performance', manager: 'Rated by managers', hr: 'Rated by HR' };

/** Ratings with the highest and lowest increment need a comment (same rule as the server). */
function commentRequired(scale: RatingLevel[]): string[] {
  if (!scale.length) return [];
  const p = scale.map((r) => Number(r.percent) || 0);
  const max = Math.max(...p);
  const min = Math.min(...p);
  return max === min ? [] : scale.filter((r) => [max, min].includes(Number(r.percent) || 0)).map((r) => r.rating);
}

/** The manager's assessment under HR's rating: their rating, suggested increment, promotion, comment and whether it is in. */
function ManagerNote({ r }: { r: RevisionDto }) {
  const m = r.manager_review;
  if (!m) return <p className="mt-1 text-[11px] text-fg-muted">No manager: HR rates</p>;
  const name = m.evaluator.name || 'Manager';
  if (m.status !== 'submitted') return <p className="mt-1 text-[11px] text-fg-muted">{name}: {m.rating ? `draft ${m.rating}` : 'not rated yet'}</p>;
  const parts = [m.rating ? `rated ${m.rating}` : null, m.recommended_percent !== null ? `suggests ${pct(m.recommended_percent)}` : null, m.recommend_promotion ? `promote to ${m.proposed_designation || '—'}` : null].filter(Boolean);
  return (
    <div className="mt-1 text-[11px] leading-snug text-fg-muted">
      <span className="font-semibold text-fg">{m.rated_by_hr ? `HR for ${name}` : name}</span>: {parts.join(' · ')}
      {m.comment && <span className="block line-clamp-2 italic" title={m.comment}>“{m.comment}”</span>}
    </div>
  );
}

const cellInput = 'h-8 w-full rounded-md border border-line bg-surface px-2 text-xs text-fg outline-none focus:border-[var(--tt-primary)] sm:text-sm disabled:bg-bg-subtle disabled:opacity-60';

function BudgetMeter({ used }: { used: number | null }) {
  if (used === null) return null;
  const width = Math.min(Math.max(used, 0), 100);
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={cx('h-full rounded-full', used > 100 ? 'bg-[var(--tt-danger)]' : 'bg-[var(--tt-primary)]')} style={{ width: `${width}%` }} />
    </div>
  );
}

export function CyclePage({ cycleId, basePath }: { cycleId: number; basePath: string }) {
  const { can: canCode, hasPerm } = usePermission();
  const can = (code: string) => canCode(code) || hasPerm('HR_MODE');
  const perms = { add: can(COMP_PERMISSIONS.ADD), edit: can(COMP_PERMISSIONS.EDIT), approve: can(COMP_PERMISSIONS.APPROVE) };
  const [cycle, setCycle] = React.useState<CycleDto | null>(null);
  const [error, setError] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<number, Draft>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [historyId, setHistoryId] = React.useState<number | null>(null);
  const [perfCycles, setPerfCycles] = React.useState<LinkablePerformanceCycleDto[]>([]);
  const [imported, setImported] = React.useState<PerformanceImportDto | null>(null);
  const [linkDraft, setLinkDraft] = React.useState<number[] | null>(null);
  const [syncNote, setSyncNote] = React.useState<RatingSyncDto | null>(null);
  const [flag, setFlag] = React.useState<ProposalFlag | 'all'>('all');
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [rateRow, setRateRow] = React.useState<RevisionDto | null>(null);

  const loadCycle = React.useCallback(() => api.getCycle(cycleId).then(setCycle).catch((e) => setError(messageOf(e))), [cycleId]);
  React.useEffect(() => { loadCycle(); }, [loadCycle]);

  const source = cycle?.rating_source;
  React.useEffect(() => {
    if (source === 'performance') api.performanceCycles().then((r) => setPerfCycles(r.cycles)).catch(() => setPerfCycles([]));
  }, [source]);

  const q = usePagedQuery<RevisionDto>(async ({ page, pageSize, search }) => {
    const res = await api.listProposals(cycleId, { page, pageSize, search, ...(flag !== 'all' ? { flag } : {}) });
    return { rows: res.revisions, total: res.total, pages: res.pages };
  }, [cycleId, flag], { pageSize: 25 });

  const editable = cycle ? ['draft', 'in_review'].includes(cycle.status) && perms.edit : false;
  const dirty = Object.keys(drafts).length;
  const scale = cycle?.rating_scale || [];
  const s = cycle?.summary;
  const linked = cycle?.performance_cycle_ids || [];
  const selection = linkDraft ?? linked;
  const linkDirty = linkDraft !== null && (linkDraft.length !== linked.length || linkDraft.some((x) => !linked.includes(x)));
  // Linked cycles stay pickable even when they are no longer offered (for example re-opened in Performance).
  const offered: PickableCycle[] = [
    ...perfCycles,
    ...(cycle?.performance_cycles || []).filter((p) => !perfCycles.some((x) => x.id === p.id)),
  ];
  const check = cycle?.rating_check;
  const flagCounts = check ? { ...check.counts, all: s?.proposals ?? 0 } : undefined;
  const flagOptions = [{ value: 'all' as const, label: 'All' }, ...FLAG_ORDER.filter((f) => (check?.counts[f] ?? 0) > 0 || flag === f).map((f) => ({ value: f, label: FLAG_LABEL[f] }))];
  const noteSync = (c: CycleDto) => setSyncNote(c.rating_sync?.changed ? c.rating_sync : null);
  const review = cycle?.review;
  const reviewOpen = source === 'manager' && review?.status === 'open';
  const canUpload = editable && (source === 'hr' || (source === 'manager' && review?.status === 'closed'));
  const needComment = commentRequired(scale);
  const reload = () => Promise.all([loadCycle(), q.reload()]);

  const run = async (key: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(key);
    try {
      await fn();
      showSuccess(message);
      await Promise.all([loadCycle(), q.reload()]);
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(null);
    }
  };

  const setDraft = (id: number, patch: Draft) => setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));

  const save = () => run('save', async () => {
    const items = Object.entries(drafts).map(([id, d]) => {
      const item: Record<string, unknown> = { revision_id: Number(id) };
      if (d.rating !== undefined) item.rating = d.rating || null;
      if (d.percent !== undefined && d.percent !== '') {
        item.change_mode = 'percent';
        item.change_value = Number(d.percent);
      }
      if (d.designation !== undefined) item.new_designation = d.designation.trim() || null;
      return item;
    });
    await api.updateProposals(cycleId, items);
    setDrafts({});
  }, 'Proposals saved');

  if (error) return <Alert message={error} tone="error" />;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={basePath} aria-label="Back" className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold text-fg sm:text-lg">{cycle?.name || 'Appraisal cycle'}</h1>
              {cycle && <StatusBadge status={cycle.status} />}
              {source && <span className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted sm:inline">{SOURCE_LABEL[source]}</span>}
            </div>
            {cycle && <p className="text-[11px] text-fg-muted sm:text-xs">Review {date(cycle.period_start)} – {date(cycle.period_end)} · effective {date(cycle.effective_from)}</p>}
          </div>
        </div>
        {cycle && (
          <div className="flex flex-wrap gap-2">
            {perms.add && editable && <Btn icon={<UserPlus className="h-3.5 w-3.5" />} busy={busy === 'gen'} onClick={() => run('gen', () => api.generateProposals(cycleId), 'Eligible employees added')}>Add eligible</Btn>}
            {canUpload && <Btn icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setUploadOpen(true)}>Upload ratings</Btn>}
            {editable && <Btn icon={<Sparkles className="h-3.5 w-3.5" />} busy={busy === 'rate'} onClick={() => run('rate', () => api.applyRatings(cycleId), 'Guide % applied to rated rows')}>Apply rating guide</Btn>}
            {editable && dirty > 0 && <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} busy={busy === 'save'} onClick={save}>Save {dirty}</Btn>}
            {perms.add && cycle.status === 'draft' && dirty === 0 && !reviewOpen && (
              <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => setSubmitOpen(true)}>Submit</Btn>
            )}
            {perms.approve && cycle.status === 'in_review' && (
              <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => setConfirm({ title: 'Approve cycle', body: <>Approves {s?.pending ?? 0} proposals. Salaries switch on the effective date and back-dated months are paid as arrears.</>, cta: 'Approve', run: () => run('approve', () => api.approveCycle(cycleId), 'Cycle approved') })}>Approve</Btn>
            )}
            {perms.edit && cycle.status !== 'closed' && (
              <Btn icon={<Lock className="h-3.5 w-3.5" />} onClick={() => setConfirm({ title: 'Close cycle', body: 'Cancels proposals that are not approved yet. Approved and applied revisions stay.', cta: 'Close cycle', danger: true, run: () => run('close', () => api.closeCycle(cycleId), 'Cycle closed') })}>Close</Btn>
            )}
          </div>
        )}
      </div>

      {s && (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
          <Stat label="Proposals" value={s.proposals} hint={`${s.promotions} promotion${s.promotions === 1 ? '' : 's'}`} />
          <Stat label="Current CTC" value={inr(s.current_ctc)} />
          <Stat label="Proposed CTC" value={inr(s.proposed_ctc)} hint={`${inr(s.increase, { sign: true })} (${pct(s.increase_percent)})`} />
          <div className="min-w-0 rounded-lg border border-line bg-surface px-3.5 py-3">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Budget used</p>
            <p className={cx('mt-1 text-base font-bold sm:text-lg', (s.budget_used_percent ?? 0) > 100 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{s.budget_used_percent === null ? 'No budget' : `${s.budget_used_percent}%`}</p>
            <BudgetMeter used={s.budget_used_percent} />
            {s.budget !== null && <p className="mt-1 truncate text-[11px] text-fg-muted">of {inr(s.budget)}</p>}
          </div>
          <Stat label="Status" value={`${s.approved + s.applied} approved`} hint={`${s.pending} pending · ${s.drafts} draft`} />
        </div>
      )}

      {cycle && source === 'manager' && <ManagerReviewPanel cycle={cycle} canEdit={perms.edit} onChanged={reload} />}

      {source === 'performance' && (perfCycles.length > 0 || linked.length > 0) && (
        <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Performance ratings</p>
              <p className="mt-0.5 text-[11px] text-fg-muted">
                {linked.length ? `From ${(cycle?.performance_cycles || []).map((p) => p.name).join(', ')}. Only released ratings are used.` : 'Not linked. Pick the review cycles whose ratings set the increments.'}
              </p>
            </div>
            {editable && linked.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {cycle?.status === 'draft' && <Btn icon={<RefreshCw className="h-3.5 w-3.5" />} busy={busy === 'sync'} onClick={() => run('sync', async () => noteSync(await api.syncRatings(cycleId)), 'Guide checked against Performance')}>Sync ratings</Btn>}
                <Btn busy={busy === 'import'} onClick={() => run('import', async () => setImported(await api.importPerformanceRatings(cycleId, false)), 'Ratings copied')}>Copy ratings only</Btn>
                <Btn variant="primary" icon={<Sparkles className="h-3.5 w-3.5" />} busy={busy === 'import'} onClick={() => run('import', async () => setImported(await api.importPerformanceRatings(cycleId, true)), 'Ratings imported and guide % applied')}>Import and apply</Btn>
              </div>
            )}
          </div>
          <div className="mt-3">
            <PerformanceCyclePicker cycles={offered} value={selection} onChange={setLinkDraft} disabled={!editable || busy !== null} />
            {linkDirty && (
              <div className="mt-2 flex justify-end gap-2">
                <Btn onClick={() => setLinkDraft(null)}>Cancel</Btn>
                <Btn variant="primary" busy={busy === 'link'} onClick={() => run('link', async () => { const c = await api.linkPerformanceCycles(cycleId, selection); setLinkDraft(null); setImported(null); noteSync(c); }, selection.length ? 'Performance cycles linked' : 'Link removed')}>Save links</Btn>
              </div>
            )}
          </div>
          {syncNote && (
            <p className="mt-3 rounded-lg border border-line bg-bg-subtle/50 p-2.5 text-xs text-fg">
              Guide now uses Performance’s ratings{syncNote.added.length ? `: added ${syncNote.added.join(', ')}` : ''}{syncNote.removed.length ? `${syncNote.added.length ? ';' : ':'} removed ${syncNote.removed.join(', ')}` : ''}. Set the increment % for new ratings in the guide, then import.
            </p>
          )}
          {imported && (
            <div className="mt-3 space-y-1.5 text-xs text-fg">
              <p>
                {imported.imported} rated from {imported.performance_cycles.map((p) => `“${p.name}”`).join(', ')}{imported.applied ? `, ${imported.applied} increments set` : ''}.
                {' '}{imported.without_rating} proposal{imported.without_rating === 1 ? ' has' : 's have'} no released rating.
                {imported.partial ? ` ${imported.partial} ${imported.partial === 1 ? 'person was' : 'people were'} rated in only some of the linked cycles.` : ''}
              </p>
              {imported.unmatched_bands.length > 0 && (
                <Alert tone="error" message={`Not in this cycle's guide (${imported.scale_codes.join(', ')}): ${imported.unmatched_bands.map((b) => `${b.band} (${b.employees})`).join(', ')}. Use Sync ratings, or change the guide, then import again.`} />
              )}
            </div>
          )}
        </div>
      )}

      {cycle && (perms.edit || perms.add) && <BonusPanel cycle={cycle} canEdit={perms.edit} canCreate={perms.add} onChanged={loadCycle} />}

      <Panel>
        <Toolbar>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <SearchBox value={q.searchInput} onChange={q.setSearchInput} placeholder="Search employee…" />
            <p className="text-[11px] text-fg-muted">Guide: {scale.map((r) => `${r.rating}=${r.percent}%${r.bonus_percent ? ` +${r.bonus_percent}% bonus` : ''}`).join(' · ')}</p>
          </div>
          {flagOptions.length > 1 && (
            <div className="mt-2 flex flex-col gap-1.5">
              <FilterTabs options={flagOptions} value={flag} onChange={(v) => { if (dirty) showError('Save changes before filtering'); else { setFlag(v); q.setPage(1); } }} counts={flagCounts} />
              {check && check.linked > 0 && check.without_rating > 0 && <p className="text-[11px] text-fg-muted">{check.without_rating} proposal{check.without_rating === 1 ? ' has' : 's have'} no released rating in the linked cycles.</p>}
            </div>
          )}
        </Toolbar>
        {q.loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : q.rows.length === 0 ? (
          <Empty title="No proposals yet" text="Add eligible employees to start. Eligibility uses joining date, service length and probation rules of this cycle." />
        ) : (
          <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden', q.fetching && 'opacity-70')}>
            <table className="w-full min-w-[980px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className={th}>Employee</th>
                  <th className={th}>Current CTC</th>
                  <th className={cx(th, 'w-40')}>Rating</th>
                  <th className={cx(th, 'w-28')}>Increment %</th>
                  <th className={th}>New CTC</th>
                  <th className={cx(th, 'w-52')}>Promotion to</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {q.rows.map((r) => {
                  const d = drafts[r.id] || {};
                  const rowEditable = editable && ['draft', 'rejected'].includes(r.status);
                  const rating = d.rating ?? r.rating ?? '';
                  const guide = scale.find((x) => x.rating === rating)?.percent;
                  const percentValue = d.percent ?? (r.change_percent !== null ? String(r.change_percent) : '');
                  const livePercent = d.percent !== undefined && d.percent !== '' ? Number(d.percent) : r.change_percent ?? 0;
                  const liveCtc = r.previous_ctc ? Math.round(r.previous_ctc * (1 + livePercent / 100)) : r.new_ctc;
                  return (
                    <tr key={r.id} className={cx('hover:bg-bg-subtle/50', drafts[r.id] && 'bg-bg-subtle/40')}>
                      <td className={td}>
                        <button type="button" className="text-left" onClick={() => setHistoryId(r.employee.id)}>
                          <span className="block font-semibold hover:underline">{r.employee.name}</span>
                          <span className="block text-[11px] text-fg-muted">{[r.employee.employee_code, r.previous_designation].filter(Boolean).join(' · ')}</span>
                        </button>
                      </td>
                      <td className={td}>{inr(r.previous_ctc)}{r.market && <span className="block text-[11px] text-fg-muted" title={`Market median ${inr(r.market.p50)}`}>Compa {r.market.compa_before?.toFixed(2) ?? '—'}</span>}</td>
                      <td className={td}>
                        <select
                          className={cellInput}
                          disabled={!rowEditable}
                          value={rating}
                          onChange={(e) => {
                            const next = e.target.value;
                            const g = scale.find((x) => x.rating === next)?.percent;
                            setDraft(r.id, { rating: next, ...(g !== undefined ? { percent: String(g) } : {}) });
                          }}
                        >
                          <option value="">Not rated</option>
                          {scale.map((x) => <option key={x.rating} value={x.rating}>{x.rating} · {x.label}</option>)}
                        </select>
                        <RowFlags r={r} />
                        {source === 'manager' && review?.status !== 'not_started' && <ManagerNote r={r} />}
                        {perms.edit && reviewOpen && r.manager_review && r.manager_review.status !== 'submitted' && rowEditable && (
                          <button type="button" className="mt-1 text-[11px] font-semibold text-fg underline-offset-2 hover:underline" onClick={() => setRateRow(r)}>Rate for manager</button>
                        )}
                      </td>
                      <td className={td}>
                        <input className={cellInput} disabled={!rowEditable} inputMode="decimal" value={percentValue} placeholder={guide !== undefined ? String(guide) : '0'} onChange={(e) => setDraft(r.id, { percent: e.target.value.replace(/[^\d.-]/g, '') })} />
                      </td>
                      <td className={cx(td, 'font-semibold whitespace-nowrap')}>
                        {inr(liveCtc)} <span className="text-[11px] font-normal text-fg-muted">{pct(livePercent)}</span>
                        {r.market && liveCtc ? <span className="block text-[11px] font-normal text-fg-muted">Compa {(liveCtc / r.market.p50).toFixed(2)}</span> : null}
                      </td>
                      <td className={td}>
                        <input className={cellInput} disabled={!rowEditable} value={d.designation ?? r.new_designation ?? ''} placeholder="Same designation" onChange={(e) => setDraft(r.id, { designation: e.target.value.slice(0, 255) })} />
                      </td>
                      <td className={td}><StatusBadge status={r.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {q.total > 0 && (
          <div className="border-t border-line px-4 py-2.5">
            <Pagination currentPage={q.page} totalPages={q.pages} totalItems={q.total} pageSize={q.pageSize} onPageChange={(p) => { if (dirty) showError('Save changes before changing page'); else q.setPage(p); }} onPageSizeChange={q.setPageSize} />
          </div>
        )}
      </Panel>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <SubmitCycleDialog open={submitOpen} check={source === 'performance' ? check : undefined} managers={source === 'manager' ? cycle?.manager_review?.totals : undefined} onClose={() => setSubmitOpen(false)} onSubmit={(ack) => run('submit', () => api.submitCycle(cycleId, ack), 'Submitted for approval')} />
      <SalaryHistoryDrawer employeeId={historyId} onClose={() => setHistoryId(null)} />
      {uploadOpen && <RatingUploadDialog cycleId={cycleId} scale={scale} onClose={() => setUploadOpen(false)} onDone={reload} />}
      <RateForManagerDialog cycleId={cycleId} row={rateRow} scale={scale} commentRequired={needComment} onClose={() => setRateRow(null)} onSaved={reload} />
    </div>
  );
}

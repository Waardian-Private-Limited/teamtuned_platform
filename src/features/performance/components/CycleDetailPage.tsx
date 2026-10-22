'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Lock, LockOpen, Pencil, Plus, RefreshCw, Upload, Users } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Chip, TextField } from '@/components/ui/FormControls';
import { usePermission } from '@/lib/hooks/usePermission';
import * as api from '../api/perf.api';
import { DIMENSION_LABEL, ACK_LABEL, CHECK_IN_LABEL, FINAL_STATUS_LABEL, CYCLE_STAGES, CYCLE_STATUS_LABEL, CYCLE_TYPE_LABEL, PERF_PERMISSIONS, SCORE_BASIS_LABEL, SHEET_STATUS_LABEL } from '../constants/perf.constants';
import { daysBetween, shortRange } from '../breaks';
import { CycleForm, Timeline } from './CycleForm';
import { SpreadOverrideDialog, spreadBlockOf } from './SpreadOverride';
import { Btn, btnClass, Card, cycleTone, IconBtn, PageHead, SearchBox, StageStepper, Stat, Table, td } from './ui';
import { fmt, importRowsFromCsv } from '../lib';
import type { CalibrationSessionRow, Cycle, Dimensions, GenerateResult, RuleOptions, ImportResult, ReleaseResult, ScoreRow, SheetRow, SheetStatus, SpreadBlock } from '../types/perf.types';

const RUNNING = ['in_progress', 'review', 'calibration'];

type Filter = 'all' | SheetStatus;
const SHEET_STATUSES = Object.keys(SHEET_STATUS_LABEL) as SheetStatus[];
const sheetTone = (s: SheetStatus) => (s === 'approved' ? 'active' : s === 'revision_requested' ? 'inactive' : 'neutral');

export function CycleDetailPage({ id, basePath }: { id: number; basePath: string }) {
  const router = useRouter();
  const { can } = usePermission();
  const canRun = can(PERF_PERMISSIONS.CYCLES);
  const [cycle, setCycle] = React.useState<Cycle | null>(null);
  const [sheets, setSheets] = React.useState<SheetRow[] | null>(null);
  const [filter, setFilter] = React.useState<Filter>('all');
  const [q, setQ] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [generated, setGenerated] = React.useState<GenerateResult | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const [scores, setScores] = React.useState<ScoreRow[] | null>(null);
  const [sessions, setSessions] = React.useState<CalibrationSessionRow[]>([]);
  const [sessionDraft, setSessionDraft] = React.useState<{ name: string; scope: Dimensions } | null>(null);
  const [sessionError, setSessionError] = React.useState('');
  const [groups, setGroups] = React.useState<RuleOptions | null>(null);
  const [released, setReleased] = React.useState<ReleaseResult | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [fileError, setFileError] = React.useState('');
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [spread, setSpread] = React.useState<SpreadBlock | null>(null);

  const loadCycle = React.useCallback(() => api.getCycle(id).then(setCycle).catch((e) => setError(messageOf(e))), [id]);
  const loadSheets = React.useCallback(() => api.cycleSheets(id, filter, q.trim()).then((d) => setSheets(d.items)).catch((e) => setError(messageOf(e))), [id, filter, q]);
  React.useEffect(() => { loadCycle(); }, [loadCycle]);
  React.useEffect(() => { const t = setTimeout(loadSheets, q ? 250 : 0); return () => clearTimeout(t); }, [loadSheets, q]);

  const status = cycle?.status;
  const loadScores = React.useCallback(() => {
    if (status && ['in_progress', 'review', 'calibration', 'released', 'closed'].includes(status)) api.cycleScores(id).then((d) => setScores(d.items)).catch((e) => setError(messageOf(e)));
  }, [id, status]);
  React.useEffect(() => { loadScores(); }, [loadScores]);

  const loadSessions = React.useCallback(() => {
    if (status === 'review' || status === 'calibration' || status === 'released' || status === 'closed') api.calibrationSessions(id).then((d) => setSessions(d.items)).catch(() => setSessions([]));
  }, [id, status]);
  React.useEffect(() => { loadSessions(); }, [loadSessions]);

  const newSession = () => {
    setSessionError(''); setSessionDraft({ name: '', scope: {} });
    if (!groups) api.ruleOptions().then(setGroups).catch(() => undefined);
  };
  const toggleGroup = (key: keyof typeof DIMENSION_LABEL, groupId: number) => {
    if (!sessionDraft) return;
    const cur = sessionDraft.scope[key] || [];
    setSessionDraft({ ...sessionDraft, scope: { ...sessionDraft.scope, [key]: cur.includes(groupId) ? cur.filter((x) => x !== groupId) : [...cur, groupId] } });
  };
  const createSession = async () => {
    if (!sessionDraft) return;
    setBusy(true); setSessionError('');
    try { await api.createCalibration(id, sessionDraft.name, sessionDraft.scope); setSessionDraft(null); loadSessions(); } catch (e) { setSessionError(messageOf(e)); } finally { setBusy(false); }
  };

  const refresh = () => { loadCycle(); loadSheets(); loadScores(); loadSessions(); };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setFileError(''); setImportResult(null);
    const { rows, error: bad } = importRowsFromCsv(await file.text());
    if (bad) { setFileError(bad); return; }
    setBusy(true);
    try { setImportResult(await api.importActuals(id, rows)); loadScores(); } catch (e) { setFileError(messageOf(e)); } finally { setBusy(false); }
  };
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true); setError('');
    try { await fn(); showSuccess(done); refresh(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };

  const generate = async () => {
    setBusy(true); setError('');
    try { setGenerated(await api.generateSheets(id)); refresh(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };

  const releaseWith = async (reason?: string) => {
    setBusy(true); setError('');
    try { setReleased(await api.releaseRatings(id, reason)); setSpread(null); refresh(); } catch (e) { const b = spreadBlockOf(e); if (b) setSpread(b); else { setSpread(null); setError(messageOf(e)); } } finally { setBusy(false); }
  };

  if (!cycle) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;
  const counts = cycle.sheets;
  const today = new Date().toISOString().slice(0, 10);
  const canGenerate = canRun && (cycle.status === 'draft' || cycle.status === 'goal_setting');

  const breakAction = (p: NonNullable<Cycle['periods']>[number]) => (p.closed_at
    ? <IconBtn label={`Reopen ${p.label}`} onClick={() => setConfirm({ title: `Reopen ${p.label}?`, body: <p className="text-sm text-fg">Its values can change again: the system recomputes them and people can type or load new ones.</p>, cta: 'Reopen', run: () => run(() => api.breakAction(id, p.id, 'reopen'), `${p.label} reopened`) })}><LockOpen className="h-4 w-4" /></IconBtn>
    : p.period_end < today && <IconBtn label={`Close ${p.label}`} onClick={() => setConfirm({ title: `Close ${p.label}?`, body: <p className="text-sm text-fg">Its values are frozen. Nothing is recomputed, typed in or loaded for {p.label} until you reopen it.</p>, cta: 'Close break', run: () => run(() => api.breakAction(id, p.id, 'close'), `${p.label} closed`) })}><Lock className="h-4 w-4" /></IconBtn>);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        help={HELP.cycle}
        title={<><Link href={`${basePath}/cycles`} aria-label="All cycles" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>{cycle.name}<StatusPill label={CYCLE_STATUS_LABEL[cycle.status]} tone={cycleTone(cycle.status)} /></>}
        subtitle={`${CYCLE_TYPE_LABEL[cycle.cycle_type]} · ${cycle.period_start} to ${cycle.period_end} · ${CHECK_IN_LABEL[cycle.check_in]}${cycle.check_in !== 'none' ? ` · Year-end score: ${SCORE_BASIS_LABEL[cycle.score_basis]}` : ''} · ${cycle.template_name ? `Template: ${cycle.template_name}` : 'Template by Who gets what rules'}`}
        actions={<>
          {canRun && cycle.status === 'draft' && <Btn variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Btn>}
          {(canRun || can(PERF_PERMISSIONS.VIEW)) && cycle.status !== 'draft' && <Link href={`${basePath}/cycles/${id}/report`} className={btnClass('secondary')}><BarChart3 className="h-3.5 w-3.5" />Reports</Link>}
          {canRun && RUNNING.includes(cycle.status) && <Btn variant="secondary" icon={RefreshCw} loading={busy} onClick={() => run(() => api.computeActuals(id), 'Values recalculated')}>Recalculate</Btn>}
          {canRun && RUNNING.includes(cycle.status) && <Btn variant="secondary" icon={Upload} onClick={() => { setImportResult(null); setFileError(''); setImporting(true); }}>Load from file</Btn>}
        </>}
      >
        <StageStepper status={cycle.status} />
        <div className="flex flex-col gap-2.5 border-t border-line/60 pt-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs text-fg-muted"><span className="font-semibold text-fg">Now: </span>{CYCLE_STAGES.find((x) => x.status === cycle.status)?.hint}</p>
          {canRun && (
            <div className="flex flex-wrap gap-2">
              {canGenerate && <Btn variant="secondary" icon={Users} loading={busy} onClick={generate}>Create goal sheets</Btn>}
              {cycle.status === 'draft' && (
                <Btn disabled={!counts?.total} onClick={() => setConfirm({ title: 'Open goal setting?', body: <p className="text-sm text-fg">Every employee with a goal sheet is told to set their goals. You can still create sheets for late joiners afterwards.</p>, cta: 'Open goal setting', run: () => run(() => api.cycleAction(id, 'open-goals'), 'Goal setting opened') })}>Open goal setting</Btn>
              )}
              {cycle.status === 'goal_setting' && (
                <Btn onClick={() => setConfirm({
                  title: 'Start the cycle?',
                  body: <p className="text-sm text-fg">{counts && counts.approved < counts.total ? `${counts.total - counts.approved} of ${counts.total} goal sheets are not approved yet. Approved sheets are locked; the others stay open for editing.` : 'All goal sheets are approved and will be locked.'}</p>,
                  cta: 'Start cycle', run: () => run(() => api.cycleAction(id, 'start'), 'Cycle started'),
                })}>Start cycle</Btn>
              )}
              {cycle.status === 'in_progress' && (
                <Btn onClick={() => setConfirm({ title: 'Open reviews?', body: <p className="text-sm text-fg">Employees write their own review and reviewers write the final review. Goals stay locked.</p>, cta: 'Open reviews', run: () => run(() => api.openReviews(id), 'Reviews opened') })}>Open reviews</Btn>
              )}
              {cycle.status === 'review' && (
                <Btn variant="secondary" onClick={() => setConfirm({ title: 'Start calibration?', body: <p className="text-sm text-fg">Reviews stay as they are. People with the calibrate permission can compare ratings across groups and change them, with a reason, before you release.</p>, cta: 'Start calibration', run: () => run(() => api.startCalibration(id), 'Calibration started') })}>Start calibration</Btn>
              )}
              {(cycle.status === 'review' || cycle.status === 'calibration') && (
                <Btn onClick={() => setConfirm({
                  title: 'Release ratings?',
                  body: <p className="text-sm text-fg">Ratings of every sheet with an approved review are frozen and shown to employees (as your settings allow). Sheets still being reviewed can be released later.</p>,
                  cta: 'Release ratings', run: () => releaseWith(),
                })}>Release ratings</Btn>
              )}
              {cycle.status !== 'closed' && (
                <Btn variant="secondary" onClick={() => setConfirm({ title: 'Close this cycle?', body: <p className="text-sm text-fg">Nobody can change goal sheets after this.</p>, cta: 'Close cycle', danger: true, run: () => run(() => api.cycleAction(id, 'close'), 'Cycle closed') })}>Close cycle</Btn>
              )}
            </div>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      </PageHead>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto tt-scroll-hidden">
        {released && (
          <div className="rounded-xl border border-line bg-surface p-3 text-sm text-fg">
            <p>Released {released.released} rating{released.released === 1 ? '' : 's'}.{released.cycle_released ? ' The cycle is now released.' : ''}</p>
            {released.not_ready.length > 0 && <p className="mt-1 text-[var(--tt-danger)]">{released.not_ready.length} not ready: {released.not_ready.slice(0, 8).map((p) => `${p.employee_name} (${FINAL_STATUS_LABEL[p.final_status]})`).join(', ')}{released.not_ready.length > 8 ? '…' : ''}. Release again once they are approved.</p>}
          </div>
        )}
        {generated && (
          <div className="rounded-xl border border-line bg-surface p-3 text-sm text-fg">
            <p>Created {generated.created} goal sheet{generated.created === 1 ? '' : 's'} from {generated.eligible} invited employees ({generated.already_had_sheet} already had one).</p>
            {generated.without_template.length > 0 && (
              <p className="mt-1 text-[var(--tt-danger)]">{generated.without_template.length} {generated.without_template.length === 1 ? 'person has' : 'people have'} no template, so no sheet: {generated.without_template.slice(0, 8).map((p) => p.name).join(', ')}{generated.without_template.length > 8 ? '…' : ''}. Add a rule in Who gets what, then create sheets again.</p>
            )}
          </div>
        )}
        {counts && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Stat label="Goal sheets" value={counts.total} />
            <Stat label="Approved" value={counts.approved} />
            <Stat label="Waiting for approval" value={counts.submitted} />
            <Stat label="Need changes" value={counts.revision_requested} />
            <Stat label="Not submitted" value={counts.draft} />
          </div>
        )}
        {cycle.periods && cycle.periods.length > 0 && (
          <Card title="Breaks" note={`${cycle.periods.length} parts${cycle.periods.some((p) => p.weight !== null && p.weight !== undefined) ? ', weighted' : ''}`} right={canRun && RUNNING.includes(cycle.status) ? <p className="text-[11px] text-fg-muted">Close a break after it ends to freeze its values.</p> : undefined}>
            <Timeline breaks={cycle.periods} total={daysBetween(cycle.period_start, cycle.period_end) + 1} today={today} />
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {cycle.periods.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-line/70 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-fg">{p.label}{p.weight !== null && p.weight !== undefined ? <span className="ml-1 font-normal text-fg-muted">{p.weight}%</span> : null}</p>
                    <p className="text-[11px] text-fg-muted">{shortRange(p.period_start, p.period_end)} · {p.closed_at ? 'Closed' : p.period_start > today ? 'Not started' : p.period_end < today ? 'Ended' : 'Running'}</p>
                  </div>
                  {canRun && RUNNING.includes(cycle.status) && breakAction(p)}
                </li>
              ))}
            </ul>
          </Card>
        )}
        {(sessions.length > 0 || cycle.status === 'review' || cycle.status === 'calibration') && (
          <Card title="Calibration sessions" right={(cycle.status === 'review' || cycle.status === 'calibration') && can(PERF_PERMISSIONS.CALIBRATE) ? <Btn variant="secondary" size="sm" icon={Plus} onClick={newSession}>New session</Btn> : undefined}>
            {sessions.length === 0 && <p className="text-xs text-fg-muted">No sessions yet. A session compares the ratings of a group of people, for example one department.</p>}
            <div className="divide-y divide-line/60">
              {sessions.map((x) => (
                <Link key={x.id} href={`${basePath}/calibration/${x.id}`} className="flex items-center justify-between gap-2 py-2 hover:bg-bg-subtle/50">
                  <span className="text-sm font-semibold text-fg">{x.name}</span>
                  <StatusPill label={x.status === 'open' ? 'Open' : 'Closed'} tone={x.status === 'open' ? 'active' : 'terminated'} />
                </Link>
              ))}
            </div>
          </Card>
        )}
        {scores && scores.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <p className="border-b border-line px-4 py-3 text-xs font-semibold text-fg sm:text-[13px]">Scores so far <span className="font-normal text-fg-muted">· approved goal sheets, goals only</span></p>
            <div className="max-h-96 overflow-auto tt-scroll-hidden">
              <Table minWidth={680} head={[{ label: 'Employee' }, { label: 'Score', className: 'w-24' }, { label: 'Filled', className: 'w-24' }, { label: 'Review', className: 'w-40' }, { label: 'Final', className: 'w-44' }]}>
                {scores.map((r) => (
                  <tr key={r.sheet_id} onClick={() => router.push(`${basePath}/sheets/${r.sheet_id}`)} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                    <td className={td}><span className="font-semibold">{r.employee_name}</span>{r.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{r.employee_code}</span>}</td>
                    <td className={td}><span className="font-semibold">{fmt(r.score)}</span>{r.band && <span className="ml-1.5 text-[11px] text-fg-muted">{r.band.label}</span>}</td>
                    <td className={`${td} text-fg-muted`}>{r.coverage}%</td>
                    <td className={`${td} text-fg-muted`}>{FINAL_STATUS_LABEL[r.final_status]}</td>
                    <td className={`${td} text-fg-muted`}>{r.released ? `${r.final_band || '—'}${r.ack_status !== 'none' ? ` · ${ACK_LABEL[r.ack_status]}` : ''}` : 'Not released'}</td>
                  </tr>
                ))}
              </Table>
            </div>
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex flex-col gap-2.5 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-fg sm:text-[13px]">Goal sheets {sheets && <span className="ml-1 rounded-md border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-muted">{sheets.length}</span>}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchBox value={q} onChange={setQ} placeholder="Search name or code…" />
              <SearchableFilterDropdown label="Status" allLabel="Any status" value={filter === 'all' ? null : SHEET_STATUSES.indexOf(filter)} options={SHEET_STATUSES.map((x, i) => ({ value: i, label: SHEET_STATUS_LABEL[x] }))} onChange={(v) => setFilter(v === null ? 'all' : SHEET_STATUSES[v])} />
            </div>
          </div>
          {sheets === null && <TableSkeleton rows={4} columns={5} />}
          {sheets?.length === 0 && (
            <EmptyState compact={Boolean(counts?.total)} illustration={{ src: '/vectors/employees.svg', width: 220, height: 160, alt: '' }}
              title={counts?.total ? 'No goal sheets match' : 'No goal sheets yet'}
              description={counts?.total ? 'Try another name or status.' : canRun ? 'Create goal sheets to invite everyone the cycle covers. Each person gets the template the rules give them.' : 'Goal sheets appear here once HR creates them.'}
              action={counts?.total ? (q || filter !== 'all' ? { label: 'Clear filters', onClick: () => { setQ(''); setFilter('all'); } } : undefined) : canGenerate ? { label: 'Create goal sheets', onClick: generate } : undefined} />
          )}
          {sheets && sheets.length > 0 && (
            <Table minWidth={680} head={[{ label: 'Employee' }, { label: 'Template', className: 'w-48' }, { label: 'Reviewer', className: 'w-44' }, { label: 'Goal sheet', className: 'w-40' }, { label: 'Actions', className: 'w-24 text-right' }]}>
              {sheets.map((s) => (
                <tr key={s.id} onClick={() => router.push(`${basePath}/sheets/${s.id}`)} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
                  <td className={td}><span className="font-semibold">{s.employee_name}</span>{s.employee_code && <span className="ml-2 text-[11px] text-fg-muted">{s.employee_code}</span>}</td>
                  <td className={`${td} text-fg-muted`}>{s.template_name || 'No template'}</td>
                  <td className={`${td} text-fg-muted`}>{s.reviewer_name || 'None'}</td>
                  <td className={td}><StatusPill label={SHEET_STATUS_LABEL[s.status]} tone={sheetTone(s.status)} /></td>
                  <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}><Link href={`${basePath}/sheets/${s.id}`} className={btnClass('secondary', 'sm')}>Open</Link></td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </div>
      <Dialog open={importing} onClose={() => setImporting(false)} title="Load values from a file" footer={<Btn type="button" variant="secondary" onClick={() => setImporting(false)}>Close</Btn>}>
        <div className="space-y-3">
          <p className="text-sm text-fg">Upload a CSV file with a header row and these columns:</p>
          <p className="rounded-lg bg-bg-subtle p-2 font-mono text-xs text-fg">employee_code, kpi, value, period, note</p>
          <p className="text-xs text-fg-muted">kpi is the goal&apos;s name on the sheet. period is the break number (1 for the first break, 2 for the next, …); leave it empty for the whole cycle. Closed breaks are skipped. Only goals whose value is typed in or loaded from a file can be loaded; computed goals are skipped with a message.</p>
          <input type="file" accept=".csv,text/csv" onChange={(e) => upload(e.target.files?.[0])} className="block w-full text-sm text-fg" />
          {fileError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{fileError}</p>}
          {importResult && (
            <div className="space-y-1 text-sm text-fg">
              <p>Saved {importResult.saved} value{importResult.saved === 1 ? '' : 's'}.{importResult.error_count > 0 ? ` ${importResult.error_count} row${importResult.error_count === 1 ? '' : 's'} not loaded:` : ''}</p>
              <ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs text-fg-muted">{importResult.errors.map((e) => <li key={e.row}>Row {e.row + 1}: {e.message}</li>)}</ul>
            </div>
          )}
        </div>
      </Dialog>
      <Dialog open={Boolean(sessionDraft)} onClose={() => setSessionDraft(null)} title="New calibration session" maxWidthClassName="max-w-2xl"
        footer={<><Btn type="button" variant="secondary" onClick={() => setSessionDraft(null)}>Cancel</Btn><Btn type="button" loading={busy} onClick={createSession}>Create session</Btn></>}>
        {sessionDraft && (
          <div className="space-y-3">
            <TextField label="Name" required value={sessionDraft.name} onChange={(v) => setSessionDraft({ ...sessionDraft, name: v })} maxLength={150} placeholder="Sales department" autoFocus />
            <p className="text-xs text-fg-muted">Who is compared. Leave every group empty to compare everyone in the cycle.</p>
            {(Object.keys(DIMENSION_LABEL) as (keyof typeof DIMENSION_LABEL)[]).map((k) => {
              const source = { site_ids: 'sites', department_ids: 'departments', role_ids: 'roles', grade_ids: 'grades', employment_type_ids: 'employment_types', cost_centre_ids: 'cost_centres' }[k] as keyof RuleOptions;
              const list = (groups?.[source] as { id: number; name: string }[] | undefined) || [];
              if (!list.length) return null;
              return (
                <div key={k}>
                  <p className="mb-1.5 text-xs font-semibold text-fg">{DIMENSION_LABEL[k]}</p>
                  <div className="flex flex-wrap gap-1.5">{list.map((o) => <Chip key={o.id} active={Boolean(sessionDraft.scope[k]?.includes(o.id))} onClick={() => toggleGroup(k, o.id)}>{o.name}</Chip>)}</div>
                </div>
              );
            })}
            {sessionError && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{sessionError}</p>}
          </div>
        )}
      </Dialog>
      {editing && <CycleForm open cycle={cycle} subOrgId={cycle.sub_organization_id} onClose={() => setEditing(false)} onSaved={(c) => { setEditing(false); setCycle(c); }} />}
      <SpreadOverrideDialog block={spread} action="Release" bandName={(c) => c} onClose={() => setSpread(null)} onConfirm={(r) => releaseWith(r)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

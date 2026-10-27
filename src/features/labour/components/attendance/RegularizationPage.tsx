'use client';

import { LABOUR_ILLUSTRATIONS as ILL, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import React, { useState } from 'react';
import { Clock, Pencil, Plus } from 'lucide-react';
import { cx } from '@/theme/tokens';
import * as api from '../../api/labour.api';
import { LP, REG_LOG_ACTIONS } from '../../constants/labour.constants';
import { useCatalog, useContractorOptions, useLabourSettings, useLabourSites } from '../../hooks/useLabourLists';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import { usePagedList } from '../../hooks/usePagedList';
import type { AttendanceDay, RegularizationLog, RemovedPunch } from '../../types/labour.types';
import { daysAgo, fmtDate, fmtDateTime, fmtTime, titleCase, today } from '../../utils/format';
import { hajriLabel } from '../../utils/pay';
import { DateFilter, FilterBar, FilterGrid, FilterSelect, Gate, ListShell, PageHeader, Pill, Tabs, primaryBtn, secondaryBtn, td, th, trCls } from '../shared/Primitives';
import { RegularizeDialog, allowedActions, hhmm, type RegPrefill } from './RegularizeDialog';

export function RegularizationPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="regularization"><Regularization /></Gate>;
}

const brief = (v: unknown): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v !== 'object') return String(v);
  const o = v as Record<string, unknown>;
  const t = (x: unknown) => (typeof x === 'string' && x.includes('T') ? fmtTime(x) : x ? String(x) : '—');
  const inV = o.firstIn ?? o.inTime ?? o.in;
  const outV = o.lastOut ?? o.outTime ?? o.out;
  if (inV !== undefined || outV !== undefined) return `${t(inV)} – ${t(outV)}`;
  return JSON.stringify(v).slice(0, 80);
};

const ACTION_LABEL: Record<string, string> = Object.fromEntries(REG_LOG_ACTIONS.map((a) => [a.value, a.label]));
type Names = (kind: 'site' | 'contractor' | 'category', id: unknown) => string;

/** Before / after cells: times for corrections, the punch for a removal, where the labourer went for a move. */
function cells(r: RegularizationLog, name: Names): [string, string] {
  const before = (r.before || {}) as Record<string, unknown>;
  const after = (r.after || {}) as Record<string, unknown>;
  if (r.action === 'remove_punch' && before.removedPunch) {
    const p = before.removedPunch as RemovedPunch;
    return [`${p.type === 'in' ? 'IN' : 'OUT'} ${fmtTime(p.punchedAt)} removed${p.source ? ` (${titleCase(p.source)})` : ''}`, brief(r.after)];
  }
  if (r.action === 'set_hajri') {
    const h = (o: Record<string, unknown>) => {
      const units = o.hajri === null || o.hajri === undefined ? null : Number(o.hajri);
      const set = o.hajriOverride !== null && o.hajriOverride !== undefined;
      return units === null ? '—' : `${hajriLabel(units)} H ${set ? '(set by hand)' : '(slab table)'}`;
    };
    return [h(before), h(after)];
  }
  if (r.action === 'move') {
    const where = (o: Record<string, unknown>) => [name('site', o.siteId), name('contractor', o.contractorId), name('category', o.categoryId)].filter(Boolean).join(' · ') || '—';
    const days = typeof after.days === 'number' ? ` · ${after.days} day${after.days === 1 ? '' : 's'} moved` : '';
    return [where(before), `${where(after)}${days}`];
  }
  return [brief(r.before), brief(r.after)];
}

function Regularization() {
  const { can } = useLabourAccess();
  const settings = useLabourSettings();
  const allowed = allowedActions(settings);
  const canDo = can(LP.REGULARIZE) && allowed.length > 0;
  const [tab, setTab] = useState<'open' | 'audit'>('open');
  const [dialog, setDialog] = useState<RegPrefill | null>(null);
  const [version, setVersion] = useState(0);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Regularization" description="Fix days left open or missing, with a reason on record.">
        {canDo && allowed.includes('add_attendance') && <button type="button" className={primaryBtn} onClick={() => setDialog({ action: 'add_attendance', lockAction: true })}><Plus className="h-3.5 w-3.5" aria-hidden />Add attendance</button>}
        {canDo && allowed.includes('adjust_times') && <button type="button" className={secondaryBtn} onClick={() => setDialog({ action: 'adjust_times', lockAction: true })}><Pencil className="h-3.5 w-3.5" aria-hidden />Adjust times</button>}
      </PageHeader>
      {settings && !settings.regularization.enabled && <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg-muted">Regularization is switched off in labour settings, so days can be reviewed here but not changed.</p>}
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'open', label: 'Missing OUT' }, { value: 'audit', label: 'Audit log' }]} />
      {tab === 'open' ? <OpenQueue key={version} canMarkOut={can(LP.REGULARIZE) && allowed.includes('mark_out')} canAdjust={can(LP.REGULARIZE) && allowed.includes('adjust_times')} onAct={setDialog} /> : <AuditLog key={version} />}
      {dialog && settings && <RegularizeDialog settings={settings} prefill={dialog} onClose={() => setDialog(null)} onDone={() => { setDialog(null); setVersion((v) => v + 1); }} />}
    </div>
  );
}

function OpenQueue({ canMarkOut, canAdjust, onAct }: { canMarkOut: boolean; canAdjust: boolean; onAct: (p: RegPrefill) => void }) {
  const list = usePagedList<AttendanceDay, { search?: string }>((_f, page, pageSize) => api.listOpenDays({ page, pageSize }), {});
  const act = (d: AttendanceDay, action: 'mark_out' | 'adjust_times'): RegPrefill => ({ action, lockAction: true, labourer: { id: d.labourerId, code: d.code, name: d.name }, workDate: d.workDate, inTime: hhmm(d.firstIn), outTime: action === 'adjust_times' ? hhmm(d.lastOut) : '' });
  const buttons = (d: AttendanceDay) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      {canMarkOut && <button type="button" className={cx(primaryBtn, 'h-8')} onClick={() => onAct(act(d, 'mark_out'))}><Clock className="h-3.5 w-3.5" aria-hidden />Mark out</button>}
      {canAdjust && <button type="button" className={cx(secondaryBtn, 'h-8')} onClick={() => onAct(act(d, 'adjust_times'))}>Adjust</button>}
    </div>
  );
  return (
    <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={false} onClear={list.clear}
      emptyIllustration={ILL.regularization} emptyTitle="Nothing to fix" emptyText="Every past day has both IN and OUT." page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
      <table className="hidden w-full border-separate border-spacing-0 md:table">
        <thead className="sticky top-0 z-10"><tr><th className={th}>Date</th><th className={th}>Labourer</th><th className={th}>Site</th><th className={th}>IN</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{list.rows.map((d) => (
          <tr key={d.id} className={trCls}><td className={td}>{fmtDate(d.workDate)}</td><td className={td}><div className="font-semibold text-fg">{d.name}</div><div className="text-[11px] text-fg-muted">{d.code}</div></td><td className={td}>{d.siteName || '—'}</td><td className={td}>{fmtTime(d.firstIn)}</td><td className={td}>{buttons(d)}</td></tr>
        ))}</tbody>
      </table>
      <div className="grid gap-2 p-3 md:hidden">{list.rows.map((d) => (
        <div key={d.id} className="rounded-xl border border-line p-3"><div className="font-semibold text-fg">{d.name}</div><div className="mb-2 text-xs text-fg-muted">{fmtDate(d.workDate)} · IN {fmtTime(d.firstIn)} · {d.siteName || 'No site'}</div>{buttons(d)}</div>
      ))}</div>
    </ListShell>
  );
}

interface AuditFilters extends Record<string, unknown> { search?: string; from: string; to: string; action: string }
const AUDIT_INITIAL: AuditFilters = { from: daysAgo(30), to: today(), action: '' };

function AuditLog() {
  const { sites } = useLabourSites();
  const contractors = useContractorOptions();
  const { categories } = useCatalog(true);
  const name: Names = (kind, id) => {
    if (id === null || id === undefined) return '';
    const n = Number(id);
    if (kind === 'site') return sites.find((s) => s.value === n)?.label || `Site ${n}`;
    if (kind === 'contractor') return contractors.find((c) => c.value === n)?.label || `Contractor ${n}`;
    return categories.find((c) => c.id === n)?.name || `Category ${n}`;
  };
  const list = usePagedList<RegularizationLog, AuditFilters>((f, page, pageSize) => api.listRegularizations({ from: f.from || undefined, to: f.to || undefined, action: f.action || undefined, page, pageSize }), AUDIT_INITIAL);
  const f = list.filters;
  return (
    <>
      <FilterBar>
        <FilterGrid>
          <DateFilter label="From" value={f.from} onChange={(from) => list.update({ from })} />
          <DateFilter label="To" value={f.to} onChange={(to) => list.update({ to })} />
          <FilterSelect label="Action" value={f.action} onChange={(action) => list.update({ action })} anyLabel="Any action" options={REG_LOG_ACTIONS} />
        </FilterGrid>
      </FilterBar>
      <ListShell loading={list.initialLoading} fetching={list.fetching} error={list.error} empty={list.rows.length === 0} hasFilters={list.hasActiveFilters} onClear={list.clear}
        emptyIllustration={ILL.regularization} emptyTitle="No changes recorded" emptyText="Regularizations will appear here with who did them and why." page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-separate border-spacing-0">
            <thead><tr><th className={th}>Day</th><th className={th}>Labourer</th><th className={th}>Action</th><th className={th}>Before</th><th className={th}>After</th><th className={th}>Reason</th><th className={th}>Done</th></tr></thead>
            <tbody>{list.rows.map((r) => { const [beforeText, afterText] = cells(r, name); return (
              <tr key={r.id} className={trCls}>
                <td className={td}>{fmtDate(r.workDate)}</td>
                <td className={td}><div className="font-semibold text-fg">{r.name}</div><div className="text-[11px] text-fg-muted">{r.code}</div></td>
                <td className={td}><Pill>{ACTION_LABEL[r.action] || titleCase(r.action)}</Pill></td>
                <td className={`${td} tabular-nums`}>{beforeText}</td>
                <td className={`${td} tabular-nums`}>{afterText}</td>
                <td className={`${td} max-w-[16rem]`}>{r.reason}</td>
                <td className={td}><div>{r.doneBy ?? '—'}</div><div className="text-[11px] text-fg-muted">{fmtDateTime(r.doneAt)}</div></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      </ListShell>
    </>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useLabourSites } from '../../hooks/useLabourLists';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { messageOf } from '@/lib/api/errors';
import * as api from '../../api/labour.api';
import { LP, LABOUR_VIEW_PERMS } from '../../constants/labour.constants';
import { useLabourAccess } from '../../hooks/useLabourAccess';
import type { Dashboard, DashboardRow } from '../../types/labour.types';
import { fmtMinutes, today } from '../../utils/format';
import { Block, DateFilter, FilterBar, FormError, Gate, PageHeader, Stat, td, th, trCls } from '../shared/Primitives';

export function AttendanceDashboardPage() {
  const { enabled, canAny } = useLabourAccess();
  return <Gate enabled={enabled} allowed={canAny(LABOUR_VIEW_PERMS)} what="labour attendance"><DashboardBody /></Gate>;
}

function Breakdown({ title, rows }: { title: string; rows: DashboardRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.registered ?? r.present ?? 0));
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface">
      <h2 className="border-b border-line px-4 py-3 text-sm font-bold text-fg">{title}</h2>
      {rows.length === 0 ? <p className="p-4 text-sm text-fg-muted">Nothing recorded for this day.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead><tr><th className={th}>Name</th><th className={`${th} text-right`}>Present</th><th className={`${th} text-right`}>Inside</th><th className={`${th} text-right`}>Hours</th><th className={`${th} hidden w-32 sm:table-cell`}>Share</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? i} className={trCls}>
                  <td className={td}>{r.name || 'Unassigned'}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.present ?? '—'}{r.registered !== undefined ? <span className="text-fg-muted"> / {r.registered}</span> : null}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.inside ?? '—'}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.workedMinutes !== undefined ? fmtMinutes(r.workedMinutes) : '—'}</td>
                  <td className={`${td} hidden sm:table-cell`}><div className="h-1.5 rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-[var(--tt-primary)]" style={{ width: `${Math.round(((r.present ?? 0) / max) * 100)}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DashboardBody() {
  const [date, setDate] = useState(today());
  const [siteId, setSiteId] = useState<number | null>(null);
  const { sites } = useLabourSites();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let off = false;
    api.getDashboard({ date, siteId }).then((d) => { if (!off) { setData(d); setError(''); } }).catch((e) => { if (!off) setError(messageOf(e)); });
    return () => { off = true; };
  }, [date, siteId]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHeader title="Attendance dashboard" description="Who is on site today, by contractor and category." />
      <FilterBar>
        <DateFilter label="Date" value={date} onChange={(v) => v && setDate(v)} />
        <SearchableFilterDropdown label="Site" allLabel="All sites" value={siteId} options={sites} onChange={setSiteId} className="md:w-48" />
      </FilterBar>
      <FormError message={error} />
      {!data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Block key={i} className="h-[88px] rounded-xl" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Registered" value={data.registered} note="Active labourers" />
            <Stat label="Present" value={data.present} note={data.registered ? `${Math.round((data.present / data.registered) * 100)}% of registered` : undefined} />
            <Stat label="Inside now" value={data.inside} note="Punched in, not out" />
            <Stat label="Completed" value={data.completed} note="IN and OUT done" />
            <Stat label="Hours worked" value={fmtMinutes(data.workedMinutes)} />
          </div>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <Breakdown title="By contractor" rows={data.byContractor || []} />
            <Breakdown title="By category" rows={data.byCategory || []} />
          </div>
        </>
      )}
    </div>
  );
}

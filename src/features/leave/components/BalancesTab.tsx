'use client';

import React from 'react';
import { Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Pagination } from '@/components/ui/Pagination';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { messageOf } from '@/lib/api/errors';
import * as api from '../api/leave.api';
import type { BalanceGrid } from '../types/leave';
import { LeaveEmptyState } from './LeaveEmptyState';
import { days } from '../utils/format';

interface Props {
  refreshKey: number;
  canAdjust: boolean;
  onOpen: (e: { id: number; name: string }) => void;
  onBulk: (ids: number[]) => void;
}

export function BalancesTab({ refreshKey, canAdjust, onOpen, onBulk }: Props) {
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [subOrgId, setSubOrgId] = React.useState<number | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [data, setData] = React.useState<BalanceGrid | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [error, setError] = React.useState('');

  React.useEffect(() => { const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400); return () => clearTimeout(t); }, [searchInput]);
  React.useEffect(() => {
    api.balanceGrid({ search: search || undefined, subOrgId: subOrgId ?? undefined, page, pageSize }).then((r) => { setData(r); setError(''); }).catch((e) => setError(messageOf(e)));
  }, [search, subOrgId, page, pageSize, refreshKey]);

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="flex h-9 w-full items-center rounded-lg border border-line px-2.5 focus-within:border-[var(--tt-primary)] sm:w-60">
          <Search className="h-3.5 w-3.5 text-fg-subtle" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search employee…" className="ml-2 w-full bg-transparent text-sm outline-none placeholder:text-fg-subtle" />
        </div>
        <SubOrgFilter value={subOrgId} onChange={(v) => { setSubOrgId(v); setPage(1); }} />
        {canAdjust && selected.size > 0 && (
          <button type="button" onClick={() => onBulk([...selected])} className="ml-auto h-9 rounded-lg bg-[var(--tt-primary)] px-3 text-sm font-semibold text-[var(--tt-on-primary)]">Adjust {selected.size} selected</button>
        )}
      </div>
      {error && <div className="p-3"><Alert message={error} tone="error" /></div>}
      {!data ? <div className="h-40 animate-pulse bg-bg-subtle/60" />
        : data.rows.length === 0 ? <LeaveEmptyState title="No employees found" text="Balances appear once employees have a leave policy." />
        : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="sticky top-0 z-10 bg-bg-subtle text-left text-xs font-semibold text-fg-muted">
                <tr>
                  {canAdjust && <th className="w-10 px-3 py-2.5" />}
                  <th className="px-3 py-2.5">Employee</th>
                  {data.types.map((t) => <th key={t.id} className="px-3 py-2.5 text-right">{t.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((r) => (
                  <tr key={r.employee.id} className="cursor-pointer hover:bg-bg-subtle" onClick={() => onOpen({ id: r.employee.id, name: r.employee.name })}>
                    {canAdjust && <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.employee.name}`} checked={selected.has(r.employee.id)} onChange={() => toggle(r.employee.id)} className="h-4 w-4 accent-[var(--tt-primary)]" /></td>}
                    <td className="px-3 py-2.5"><p className="font-semibold text-fg">{r.employee.name}</p><p className="text-xs text-fg-muted">{r.employee.code ?? ''}</p></td>
                    {data.types.map((t) => {
                      const b = r.balances[t.id];
                      return (
                        <td key={t.id} className="px-3 py-2.5 text-right">
                          {b ? <><span className="font-semibold text-fg">{days(b.available).replace(' d', '')}</span>{b.pending > 0 && <span className="ml-1 text-[11px] text-fg-muted">({b.pending} pending)</span>}</> : <span className="text-fg-subtle">–</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {data && data.total > 0 && (
        <div className="border-t border-line px-4 py-2.5">
          <Pagination currentPage={page} totalPages={data.pages} totalItems={data.total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
        </div>
      )}
    </div>
  );
}

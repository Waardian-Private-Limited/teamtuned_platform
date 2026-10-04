'use client';

import { Plus } from 'lucide-react';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { STATUS_LABELS } from '../../../constants/roster.constants';
import type { RosterUnit } from '../../../types/roster.types';
import type { RosterStatusFilter } from '../../../hooks/useRosters';

const selectClass =
  'h-9 w-full appearance-none rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm';
const STATUSES: RosterStatusFilter[] = ['all', 'draft', 'generating', 'review', 'published', 'failed', 'archived'];

interface Props {
  total: number;
  units: RosterUnit[];
  unitId: number | null;
  onUnitChange: (v: number | null) => void;
  status: RosterStatusFilter;
  onStatusChange: (v: RosterStatusFilter) => void;
  subOrgId: number | null;
  onSubOrgChange: (v: number | null) => void;
  fromMonth: string;
  toMonth: string;
  onFromMonth: (v: string) => void;
  onToMonth: (v: string) => void;
  hasFilters: boolean;
  onClear: () => void;
  canAdd: boolean;
  onAdd: () => void;
}

export function RostersToolbar(p: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg">Rosters</h1>
          <span className="inline-flex items-center rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">{p.total}</span>
        </div>
        {p.canAdd && (
          <button
            type="button"
            onClick={p.onAdd}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New roster
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-center">
        <select aria-label="Team" value={p.unitId ?? ''} onChange={(e) => p.onUnitChange(e.target.value === '' ? null : Number(e.target.value))} className={`${selectClass} lg:w-44`}>
          <option value="">All teams</option>
          {p.units.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select aria-label="Status" value={p.status} onChange={(e) => p.onStatusChange(e.target.value as RosterStatusFilter)} className={`${selectClass} lg:w-36`}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : STATUS_LABELS[s]}</option>
          ))}
        </select>
        <input aria-label="From month" type="month" value={p.fromMonth} onChange={(e) => p.onFromMonth(e.target.value)} className={`${selectClass} lg:w-40`} />
        <input aria-label="To month" type="month" value={p.toMonth} onChange={(e) => p.onToMonth(e.target.value)} className={`${selectClass} lg:w-40`} />
        <SubOrgFilter value={p.subOrgId} onChange={p.onSubOrgChange} className="col-span-2 lg:col-span-1 lg:w-44" />
        {p.hasFilters && (
          <button type="button" onClick={p.onClear} className="col-span-2 h-9 text-xs font-semibold text-fg-muted underline-offset-4 hover:text-fg hover:underline lg:col-span-1">
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

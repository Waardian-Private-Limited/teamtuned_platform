'use client';

import { RotateCcw, Search } from 'lucide-react';
import { controlClass } from '@/features/detailed-attendance/components/components/controls';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { REVIEW_STATUS_OPTIONS, SORT_OPTIONS } from '../constants/review.constants';
import type { ReviewFilters } from '../types/review.model';

interface Props {
  filters: ReviewFilters;
  update: <K extends keyof ReviewFilters>(key: K, value: ReviewFilters[K]) => void;
  searchInput: string;
  onSearch: (v: string) => void;
  options: FilterOptionsDto | null;
  filtered: boolean;
  onClear: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

const num = (v: string) => (v === '' ? null : Number(v));

/** Status, place, team, attendance dates, name and order: everything a reviewer narrows a queue by. */
export function RequestFilters({ filters, update, searchInput, onSearch, options, filtered, onClear }: Props) {
  const roles = options ? options.roles.filter((r) => !filters.departmentId || r.department_id === filters.departmentId) : [];
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-wrap xl:items-end">
      <Field label="Employee">
        <span className="relative flex items-center">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-fg-subtle" />
          <input value={searchInput} onChange={(e) => onSearch(e.target.value)} placeholder="Name or code" className={`${controlClass} pl-8 font-medium xl:w-48`} />
        </span>
      </Field>
      <Field label="Status">
        <select className={`${controlClass} xl:w-40`} value={filters.status} onChange={(e) => update('status', e.target.value as ReviewFilters['status'])}>
          {REVIEW_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      {options && (
        <>
          <Field label="Site">
            <select className={`${controlClass} xl:w-44`} value={filters.siteId ?? ''} onChange={(e) => update('siteId', num(e.target.value))}>
              <option value="">{options.access.all_sites ? 'All sites' : 'All my sites'}</option>
              {options.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select className={`${controlClass} xl:w-44`} value={filters.departmentId ?? ''} onChange={(e) => update('departmentId', num(e.target.value))}>
              <option value="">All departments</option>
              {options.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Role">
            <select className={`${controlClass} xl:w-40`} value={filters.roleId ?? ''} onChange={(e) => update('roleId', num(e.target.value))}>
              <option value="">All roles</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
        </>
      )}
      <Field label="From">
        <input type="date" className={`${controlClass} xl:w-40`} value={filters.from} max={filters.to || undefined} onChange={(e) => update('from', e.target.value)} />
      </Field>
      <Field label="To">
        <input type="date" className={`${controlClass} xl:w-40`} value={filters.to} min={filters.from || undefined} onChange={(e) => update('to', e.target.value)} />
      </Field>
      <Field label="Sort by">
        <select className={`${controlClass} xl:w-48`} value={filters.sort} onChange={(e) => update('sort', e.target.value as ReviewFilters['sort'])}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      {filtered && (
        <button type="button" onClick={onClear} className="inline-flex h-9 items-center justify-center gap-1.5 self-end rounded-lg border border-line px-3 text-xs font-semibold text-fg-muted hover:bg-bg-subtle hover:text-fg">
          <RotateCcw className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
}

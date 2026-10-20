'use client';

import { Search } from 'lucide-react';
import { inputCls } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import * as api from '../api/tm.api';
import { PRIORITIES, PRIORITY_LABEL, STATUS_LABEL } from '../constants/tm.constants';
import type { Filters, Priority } from '../types/tm.types';

const select = `${inputCls()} !w-auto min-w-[8rem]`;

/** Search and filters shared by the board and the list. Site and department lists need task-create rights, so they quietly hide without them. */
export function FilterBar({ value, onChange, withStatus = false }: { value: Filters; onChange: (f: Filters) => void; withStatus?: boolean }) {
  const options = useAsync(() => api.getOptions().catch(() => null), []);
  const o = options.data;
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
        <input className={`${inputCls()} pl-9`} placeholder="Search tasks" aria-label="Search tasks" value={value.q || ''} onChange={(e) => set({ q: e.target.value })} />
      </div>
      {withStatus && (
        <select aria-label="Status" className={select} value={value.status || ''} onChange={(e) => set({ status: e.target.value })}>
          <option value="">Any status</option>{(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      )}
      <select aria-label="Priority" className={select} value={value.priority || ''} onChange={(e) => set({ priority: e.target.value as Priority | '' })}>
        <option value="">Any priority</option>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
      </select>
      <select aria-label="Due" className={select} value={value.due || ''} onChange={(e) => set({ due: e.target.value as Filters['due'] })}>
        <option value="">Any due date</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="week">Due this week</option><option value="none">No due date</option>
      </select>
      {o && o.sites.length > 0 && <select aria-label="Site" className={select} value={value.site_id ?? ''} onChange={(e) => set({ site_id: e.target.value ? Number(e.target.value) : null })}><option value="">All sites</option>{o.sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>}
      {o && o.departments.length > 0 && <select aria-label="Department" className={select} value={value.department_id ?? ''} onChange={(e) => set({ department_id: e.target.value ? Number(e.target.value) : null })}><option value="">All departments</option>{o.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
      <input className={`${inputCls()} !w-32`} placeholder="Label" aria-label="Label" value={value.label || ''} onChange={(e) => set({ label: e.target.value })} />
    </div>
  );
}

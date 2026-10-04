'use client';

import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { InsightEmployee } from '../../../types/roster.types';
import type { InsightSortKey } from '../../../hooks/useInsights';

interface Props {
  rows: InsightEmployee[];
  all: InsightEmployee[];
  search: string;
  onSearch: (v: string) => void;
  sortKey: InsightSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: InsightSortKey) => void;
  onExport: () => void;
}

type BarKey = 'shifts' | 'nights' | 'weekends' | 'holidays' | 'overtime_minutes';

const BAR_COLUMNS: { key: BarKey; label: string }[] = [
  { key: 'shifts', label: 'Shifts' },
  { key: 'nights', label: 'Nights' },
  { key: 'weekends', label: 'Weekends' },
  { key: 'holidays', label: 'Holidays' },
  { key: 'overtime_minutes', label: 'Overtime' },
];

const PLAIN_COLUMNS: { key: InsightSortKey; label: string; show: (e: InsightEmployee) => string }[] = [
  { key: 'hours', label: 'Hours', show: (e) => String(e.hours) },
  { key: 'off_days', label: 'Days off', show: (e) => String(e.off_days) },
  { key: 'leave_days', label: 'Leave', show: (e) => String(e.leave_days) },
  { key: 'comp_off_days', label: 'Comp off', show: (e) => String(e.comp_off_days) },
];

const display = (key: BarKey, e: InsightEmployee) => (key === 'overtime_minutes' ? `${Math.round((e.overtime_minutes / 60) * 10) / 10}h` : String(e[key]));

export function EmployeeTable({ rows, all, search, onSearch, sortKey, sortDir, onSort, onExport }: Props) {
  const stats = BAR_COLUMNS.reduce((acc, c) => {
    const values = all.map((e) => e[c.key]);
    acc[c.key] = { max: Math.max(1, ...values), avg: values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0 };
    return acc;
  }, {} as Record<BarKey, { max: number; avg: number }>);

  const isOutlier = (key: BarKey, e: InsightEmployee) => stats[key].avg > 0 && e[key] > stats[key].avg * 1.5;

  const Bar = ({ k, e }: { k: BarKey; e: InsightEmployee }) => {
    const out = isOutlier(k, e);
    return (
      <div className="flex items-center gap-2" title={out ? 'Well above the team average' : undefined}>
        <span className={cx('w-10 shrink-0 rounded px-1 text-right text-xs font-semibold tabular-nums text-fg', out && 'outline outline-1 outline-offset-1 outline-fg')}>{display(k, e)}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-subtle">
          <span className="block h-full rounded-full bg-fg" style={{ width: `${(e[k] / stats[k].max) * 100}%`, opacity: out ? 1 : 0.55 }} />
        </span>
      </div>
    );
  };

  const Th = ({ k, label, className }: { k: InsightSortKey; label: string; className?: string }) => (
    <th scope="col" className={cx('px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted', className)}>
      <button type="button" onClick={() => onSort(k)} className="inline-flex items-center gap-1 hover:text-fg">
        {label}
        {sortKey === k && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-fg">People</h3>
          <p className="text-xs text-fg-muted">An outlined number means well above the team average.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 sm:w-60 sm:flex-none">
            <Search className="h-4 w-4 text-fg-subtle" />
            <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search people" aria-label="Search people" className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle" />
          </div>
          <Button variant="secondary" className="!h-9 !w-auto shrink-0 !px-3 !text-[13px]" onClick={onExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> CSV
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState compact title={all.length === 0 ? 'No one in this team yet' : 'No one matches your search'} />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-line bg-surface md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line bg-bg-subtle">
                <tr>
                  <Th k="name" label="Name" />
                  {BAR_COLUMNS.map((c) => <Th key={c.key} k={c.key} label={c.label} className="min-w-32" />)}
                  {PLAIN_COLUMNS.map((c) => <Th key={c.key} k={c.key} label={c.label} />)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => (
                  <tr key={e.employee_id}>
                    <td className="px-3 py-2 font-semibold text-fg">{e.name}</td>
                    {BAR_COLUMNS.map((c) => <td key={c.key} className="px-3 py-2"><Bar k={c.key} e={e} /></td>)}
                    {PLAIN_COLUMNS.map((c) => <td key={c.key} className="px-3 py-2 tabular-nums text-fg-muted">{c.show(e)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {rows.map((e) => (
              <article key={e.employee_id} className="space-y-2 rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-bold text-fg">{e.name}</p>
                {BAR_COLUMNS.map((c) => (
                  <div key={c.key} className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-2">
                    <span className="text-xs text-fg-muted">{c.label}</span>
                    <Bar k={c.key} e={e} />
                  </div>
                ))}
                <p className="text-xs text-fg-muted">
                  {e.hours}h worked · {e.off_days} days off · {e.leave_days} leave · {e.comp_off_days} comp off
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

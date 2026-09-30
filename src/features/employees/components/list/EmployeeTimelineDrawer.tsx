'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Pagination } from '@/components/ui/Pagination';
import { messageOf } from '@/lib/api/errors';
import { SalaryHistoryPanel } from '@/features/compensation/components/SalaryHistoryDrawer';
import { getAuditLog, getJobHistory } from '../../api/employees.api';
import { AUDIT_ACTION_LABELS, JOB_EVENT_LABELS, type TimelineTab } from '../../constants/employees.constants';
import type { AuditEntryDto, HistoryChangeDto, HistoryPageDto, JobEventDto } from '../../types/employees.dto';

const PAGE_SIZE = 20;

const TAB_LABELS: Record<TimelineTab, string> = { job: 'Job history', salary: 'Salary', audit: 'Change log' };

function formatDate(value: string) {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatValue(value: string | number | null) {
  if (value === null || value === '') return '—';
  return typeof value === 'number' ? value.toLocaleString('en-IN') : value;
}

function ChangeRows({ changes }: { changes: HistoryChangeDto[] }) {
  if (!changes.length) return null;
  return (
    <dl className="mt-2 space-y-1.5">
      {changes.map((c) => (
        <div key={c.field} className="grid grid-cols-[minmax(0,7rem)_1fr] gap-2 text-xs">
          <dt className="truncate text-fg-muted">{c.label}</dt>
          <dd className="min-w-0 break-words text-fg">
            <span className="text-fg-muted line-through decoration-line">{formatValue(c.from)}</span>
            <span className="px-1.5 text-fg-muted">to</span>
            <span className="font-medium">{formatValue(c.to)}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Entry({ title, meta, reason, changes }: { title: string; meta: string; reason?: string | null; changes: HistoryChangeDto[] }) {
  return (
    <li className="relative">
      <span className="absolute -left-[16.5px] top-1.5 h-2 w-2 rounded-full bg-fg ring-4 ring-surface" />
      <p className="text-sm font-semibold text-fg">{title}</p>
      <p className="text-xs text-fg-muted">{meta}</p>
      {reason && <p className="mt-1 text-xs text-fg">{reason}</p>}
      <ChangeRows changes={changes} />
    </li>
  );
}

function usePaged<T>(employeeId: number, enabled: boolean, load: (id: number, page: number, size: number) => Promise<HistoryPageDto<T>>) {
  const [page, setPage] = React.useState(1);
  const [data, setData] = React.useState<HistoryPageDto<T> | null>(null);
  const [error, setError] = React.useState('');
  const loadRef = React.useRef(load);
  loadRef.current = load;

  React.useEffect(() => { setPage(1); setData(null); }, [employeeId]);

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    setError('');
    loadRef.current(employeeId, page, PAGE_SIZE)
      .then((d) => active && setData(d))
      .catch((e) => active && setError(messageOf(e)));
    return () => { active = false; };
  }, [employeeId, page, enabled]);

  return { page, setPage, data, error };
}

function PagedList<T>({ state, empty, render }: {
  state: ReturnType<typeof usePaged<T>>;
  empty: string;
  render: (item: T) => React.ReactNode;
}) {
  const { data, error, page, setPage } = state;
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;
  if (!data) return <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-bg-subtle" />)}</div>;
  if (!data.items.length) return <p className="py-8 text-center text-sm text-fg-muted">{empty}</p>;
  return (
    <div className="space-y-4">
      <ol className="ml-1 space-y-5 border-l border-line pl-3">{data.items.map(render)}</ol>
      {data.pages > 1 && (
        <Pagination currentPage={page} totalPages={data.pages} totalItems={data.total} pageSize={data.pageSize} onPageChange={setPage} />
      )}
    </div>
  );
}

interface EmployeeTimelineDrawerProps {
  employee: { id: number; name: string } | null;
  tabs: TimelineTab[];
  onClose: () => void;
}

export function EmployeeTimelineDrawer({ employee, tabs, onClose }: EmployeeTimelineDrawerProps) {
  const [tab, setTab] = React.useState<TimelineTab>(tabs[0] ?? 'job');
  const employeeId = employee?.id ?? 0;

  React.useEffect(() => { if (employee) setTab(tabs[0] ?? 'job'); }, [employee, tabs]);

  const job = usePaged<JobEventDto>(employeeId, Boolean(employee) && tab === 'job', getJobHistory);
  const audit = usePaged<AuditEntryDto>(employeeId, Boolean(employee) && tab === 'audit', getAuditLog);
  const options = tabs.map((value) => ({ value, label: TAB_LABELS[value] }));

  return (
    <Drawer open={employee !== null} onClose={onClose} title={employee ? `${employee.name} · History` : 'History'}>
      {employee && (
        <div className="space-y-4">
          {options.length > 1 && <SegmentedControl options={options} value={tab} onChange={setTab} fitText />}
          {tab === 'job' && (
            <PagedList
              state={job}
              empty="No job changes recorded yet."
              render={(e) => (
                <Entry
                  key={e.id}
                  title={JOB_EVENT_LABELS[e.event_type] || e.event_type}
                  meta={`Effective ${formatDate(e.effective_date)}${e.by ? ` · by ${e.by}` : ''}`}
                  reason={e.reason}
                  changes={e.changes}
                />
              )}
            />
          )}
          {tab === 'salary' && <SalaryHistoryPanel employeeId={employee.id} />}
          {tab === 'audit' && (
            <PagedList
              state={audit}
              empty="No changes logged yet."
              render={(a) => (
                <Entry
                  key={a.id}
                  title={AUDIT_ACTION_LABELS[a.action] || a.action}
                  meta={`${formatDateTime(a.at)}${a.by ? ` · ${a.by}` : ''}${a.ip ? ` · ${a.ip}` : ''}`}
                  changes={a.changes}
                />
              )}
            />
          )}
        </div>
      )}
    </Drawer>
  );
}

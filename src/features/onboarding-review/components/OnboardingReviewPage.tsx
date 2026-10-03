'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { useSubmissionList } from '../hooks/useSubmissionList';
import { OnboardingReviewEmptyState } from './components/OnboardingReviewEmptyState';
import { DownloadProfilesDialog } from './components/DownloadProfilesDialog';

const TABS = [
  { value: '', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'changes_requested', label: 'Changes requested' },
  { value: 'approved', label: 'Approved' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  changes_requested: 'Changes requested',
  approved: 'Approved',
};

export function OnboardingReviewPage() {
  const list = useSubmissionList('submitted');
  const router = useRouter();
  const open = (employeeId: number) => router.push(`/org-admin/employee-onboarding/${employeeId}`);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [downloadIds, setDownloadIds] = useState<number[] | null>(null);
  const pageIds = list.rows.map((r) => r.employee_id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((s) => {
      const next = new Set(s);
      for (const id of pageIds) {
        if (allOnPage) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div>
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Employee Onboarding</h1>
            <p className="mt-0.5 text-xs text-fg-muted">Review and approve what invited employees have submitted.</p>
          </div>
          <div className="w-full lg:w-auto lg:min-w-[460px]">
            <SegmentedControl options={TABS} value={list.status} onChange={(v) => list.setStatus(v)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-80 2xl:h-10 2xl:w-96">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle 2xl:h-4 2xl:w-4" />
          <input
            value={list.searchInput}
            onChange={(e) => list.setSearchInput(e.target.value)}
            placeholder="Search by name, email, phone or code…"
            className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm 2xl:text-base"
          />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-muted">{selected.size} selected</span>
            <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-medium text-fg-muted underline">
              Clear
            </button>
            <Button className="!h-9 !w-auto !px-3 !text-xs" onClick={() => setDownloadIds([...selected])}>
              <Download className="h-3.5 w-3.5" /> Download ({selected.size})
            </Button>
          </div>
        )}
        </div>
      </div>

      {list.loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-bg-subtle" />
      ) : list.rows.length === 0 ? (
        <div className="flex flex-1 rounded-xl border border-line bg-surface">
          <OnboardingReviewEmptyState status={list.status} searchTerm={list.search} onClear={list.clearFilters} />
        </div>
      ) : (
        <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface transition-opacity ${list.isFetching ? 'opacity-70' : 'opacity-100'}`}>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-bg-subtle">
                <tr className="text-xs font-semibold text-fg-muted">
                  <th className="w-10 px-4 py-2.5">
                    <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={togglePage} className="h-4 w-4 accent-[var(--tt-primary)]" />
                  </th>
                  <th className="px-4 py-2.5">Employee</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Department</th>
                  <th className="px-4 py-2.5">Progress</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Submitted</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {list.rows.map((row) => (
                  <tr
                    key={row.employee_id}
                    className="cursor-pointer border-t border-line hover:bg-bg-subtle"
                    onClick={() => open(row.employee_id)}
                  >
                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name}`}
                        checked={selected.has(row.employee_id)}
                        onChange={() => toggle(row.employee_id)}
                        className="h-4 w-4 accent-[var(--tt-primary)]"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-medium text-fg">{row.name}</p>
                      <p className="text-xs text-fg-muted">{row.employee_code}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm text-fg">{row.email || '—'}</p>
                      <p className="text-xs text-fg-muted">{row.phone || ''}</p>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-fg-muted">{row.department_name || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-fg-muted">{row.progress}%</td>
                    <td className="px-4 py-2.5 text-sm text-fg">{STATUS_LABEL[row.status] || row.status}</td>
                    <td className="px-4 py-2.5 text-sm text-fg-muted">
                      {row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        title="Download PDF"
                        aria-label={`Download ${row.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadIds([row.employee_id]);
                        }}
                        className="rounded-md border border-line p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <Button
                        variant={row.status === 'submitted' ? 'primary' : 'secondary'}
                        className="!h-8 !w-auto !px-3 !text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          open(row.employee_id);
                        }}
                      >
                        {row.status === 'submitted' ? 'Review' : 'View'}
                      </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line bg-surface px-4 py-2.5">
            <Pagination
              currentPage={list.page}
              totalPages={list.totalPages}
              totalItems={list.total}
              pageSize={list.pageSize}
              onPageChange={list.setPage}
              onPageSizeChange={list.setPageSize}
            />
          </div>
        </div>
      )}

      <DownloadProfilesDialog
        open={downloadIds !== null}
        onClose={() => setDownloadIds(null)}
        employeeIds={downloadIds ?? []}
        onQueued={() => setSelected(new Set())}
      />
    </div>
  );
}

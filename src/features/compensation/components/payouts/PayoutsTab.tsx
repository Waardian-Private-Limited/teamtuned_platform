'use client';

import React from 'react';
import { Check, Plus, RotateCcw, X } from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Alert } from '@/components/ui/Alert';
import { showError, showSuccess } from '@/lib/toast';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import { PAYOUT_FILTERS } from '../../constants/compensation.constants';
import { usePagedQuery } from '../../hooks/usePagedQuery';
import type { PayoutDto } from '../../types/compensation.dto';
import { date, inr, month } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { FilterTabs } from '../shared/FilterTabs';
import { Empty, Panel, Toolbar, td, th } from '../shared/Panel';
import { SearchBox } from '../shared/SearchBox';
import { StatusBadge } from '../shared/StatusBadge';
import { ConfirmDialog, type ConfirmState } from '../shared/ConfirmDialog';
import { PayoutDialog } from './PayoutDialog';

interface Props {
  perms: { add: boolean; approve: boolean; remove: boolean };
  payoutTypes: { value: string; label: string; taxable: boolean }[];
  allTypes: { value: string; label: string }[];
  onOpenHistory: (employeeId: number) => void;
}

export function PayoutsTab({ perms, payoutTypes, allTypes, onOpenHistory }: Props) {
  const [status, setStatus] = React.useState<string>('all');
  const [type, setType] = React.useState('');
  const [monthKey, setMonthKey] = React.useState('');
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  const q = usePagedQuery<PayoutDto>(async ({ page, pageSize, search }) => {
    const res = await api.listPayouts({ page, pageSize, search, status: status === 'all' ? undefined : status, type: type || undefined, month: monthKey || undefined });
    return { rows: res.payouts, total: res.total, pages: res.pages, counts: res.counts, extra: { open: res.open_amount } };
  }, [status, type, monthKey]);

  React.useEffect(() => setSelected(new Set()), [q.rows]);

  const act = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await fn();
      showSuccess(message);
      await q.reload();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const openSelected = q.rows.filter((r) => selected.has(r.id) && ['draft', 'pending'].includes(r.status)).map((r) => r.id);
  const cancellable = q.rows.filter((r) => selected.has(r.id) && !r.locked && ['draft', 'pending', 'approved'].includes(r.status)).map((r) => r.id);
  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allSelected = q.rows.length > 0 && q.rows.every((r) => selected.has(r.id));

  const clawback = (p: PayoutDto) => setConfirm({
    title: 'Recover payout',
    body: <>Schedules a prorated recovery of <b>{p.title}</b> ({inr(p.amount)}) from {p.employee.name} in the current payroll month, based on the unserved part of the clawback period.</>,
    cta: 'Schedule recovery',
    danger: true,
    run: () => act(() => api.clawbackPayout(p.id, { mode: 'prorated' }), 'Recovery scheduled'),
  });

  return (
    <Panel>
      <Toolbar>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchBox value={q.searchInput} onChange={q.setSearchInput} placeholder="Search employee or title…" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg sm:text-sm">
              <option value="">All types</option>
              {allTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg sm:text-sm" aria-label="Payroll month" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-fg-muted">Open: <b className="text-fg">{inr(Number(q.extra.open || 0))}</b></span>
            {perms.approve && openSelected.length > 0 && (
              <>
                <Btn icon={<X className="h-3.5 w-3.5" />} busy={busy} onClick={() => act(() => api.decidePayouts(openSelected, 'reject'), 'Rejected')}>Reject</Btn>
                <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} busy={busy} onClick={() => act(() => api.decidePayouts(openSelected, 'approve'), 'Approved')}>Approve {openSelected.length}</Btn>
              </>
            )}
            {perms.remove && cancellable.length > 0 && <Btn busy={busy} onClick={() => act(() => api.cancelPayouts(cancellable), 'Cancelled')}>Cancel {cancellable.length}</Btn>}
            {perms.add && <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>New payout</Btn>}
          </div>
        </div>
        <FilterTabs options={PAYOUT_FILTERS} value={status} onChange={setStatus} counts={q.counts} />
      </Toolbar>

      {q.error && <div className="p-3"><Alert message={q.error} tone="error" /></div>}
      {q.loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : q.rows.length === 0 ? (
        <Empty title="No payouts" text="Bonuses, incentives, awards, arrears and gratuity land here and flow into the chosen payroll month once approved." action={perms.add ? <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>New payout</Btn> : undefined} />
      ) : (
        <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden transition-opacity', q.fetching && 'opacity-70')}>
          <table className="w-full min-w-[820px] border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className={cx(th, 'w-10')}><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(q.rows.map((r) => r.id)))} /></th>
                <th className={th}>Employee</th>
                <th className={th}>Payout</th>
                <th className={th}>Month</th>
                <th className={cx(th, 'text-right')}>Amount</th>
                <th className={th}>Status</th>
                <th className={cx(th, 'text-right')}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {q.rows.map((p) => (
                <tr key={p.id} className="hover:bg-bg-subtle/50">
                  <td className={td}><input type="checkbox" aria-label={`Select ${p.title}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td className={td}>
                    <button type="button" onClick={() => onOpenHistory(p.employee.id)} className="text-left">
                      <span className="block font-semibold hover:underline">{p.employee.name}</span>
                      <span className="block text-[11px] text-fg-muted">{p.employee.employee_code}</span>
                    </button>
                  </td>
                  <td className={td}>
                    <span className="block">{p.title}</span>
                    <span className="block text-[11px] text-fg-muted">{p.payout_type_label}{p.taxable ? '' : ' · tax exempt'}{p.clawback_until ? ` · clawback till ${date(p.clawback_until)}` : ''}</span>
                  </td>
                  <td className={td}>{month(p.payout_month)}</td>
                  <td className={cx(td, 'text-right font-semibold', p.amount < 0 && 'text-[var(--tt-danger)]')}>{inr(p.amount)}</td>
                  <td className={td}><StatusBadge status={p.status} /></td>
                  <td className={cx(td, 'text-right')}>
                    {perms.add && p.clawback_until && p.amount > 0 && ['approved', 'paid'].includes(p.status) && (
                      <button type="button" onClick={() => clawback(p)} aria-label="Recover" title="Recover (prorated)" className="rounded p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg">
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {q.total > 0 && (
        <div className="border-t border-line px-4 py-2.5">
          <Pagination currentPage={q.page} totalPages={q.pages} totalItems={q.total} pageSize={q.pageSize} onPageChange={q.setPage} onPageSizeChange={q.setPageSize} />
        </div>
      )}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
      <PayoutDialog open={open} payoutTypes={payoutTypes} onClose={() => setOpen(false)} onSaved={q.reload} />
    </Panel>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextField } from '@/components/ui/FormControls';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { btn, countBadge, listCard, pageTitle, tdClass, thClass, toolbarCard } from '../../interviews/lib/ui';
import * as api from '../api/referrals.api';

type Status = api.ReferralRewardStatus;
const TABS: { value: Status | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'due', label: 'Due' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'scheduled', label: 'With payroll' },
  { value: 'paid', label: 'Paid' },
  { value: 'forfeited', label: 'Forfeited' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_TONE: Record<Status, 'active' | 'terminated' | 'neutral'> = {
  waiting: 'neutral',
  due: 'neutral',
  scheduled: 'neutral',
  paid: 'active',
  forfeited: 'terminated',
  cancelled: 'terminated',
};

const money = (n: number | null) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const what = (r: api.ReferralRewardRowDto) => (r.rewardType === 'cash' ? money(r.amount) : r.description || 'Reward');

function when(r: api.ReferralRewardRowDto) {
  if (r.status === 'paid') return `Paid ${r.paidOn ? formatDate(r.paidOn) : ''}${r.paidReference ? ` · ${r.paidReference}` : ''}`;
  if (r.status === 'scheduled') return `Payroll ${r.payoutMonth ?? ''}`;
  if (r.status === 'forfeited' || r.status === 'cancelled') return r.statusReason || '';
  if (!r.joinedOn) return 'Waiting for the joining date';
  return `${r.status === 'due' ? 'Due since' : 'Due on'} ${formatDate(r.eligibleOn)}`;
}

const how = (r: api.ReferralRewardRowDto) => (r.rewardType === 'cash' ? (r.payoutMode === 'payroll' ? 'With payroll' : 'By Accounts') : 'Gift');

/**
 * Recruitment → Referral rewards. Every reward a hire earned: who referred whom, what, when it is due,
 * and how it is paid. HR can adjust one before it is paid, cancel it with a reason, and record a gift
 * (or cash paid outside Payouts) as handed over. Cash paid by Accounts is also paid from the Payouts page.
 */
export function ReferralRewardsPage() {
  const [status, setStatus] = useState<Status | 'all'>('due');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<api.ReferralRewardPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<api.ReferralRewardRowDto | null>(null);
  const [cancelling, setCancelling] = useState<api.ReferralRewardRowDto | null>(null);
  const [paying, setPaying] = useState<api.ReferralRewardRowDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.listReferralRewards({ status: status === 'all' ? null : status, search: search.trim() || undefined, page }));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const done = (message: string) => {
    setEditing(null);
    setCancelling(null);
    setPaying(null);
    showSuccess(message);
    void load();
  };

  const total = Object.values(data?.counts || {}).reduce((a, b) => a + (b || 0), 0);
  const tabs = TABS.map((t) => {
    const n = t.value ? data?.counts?.[t.value] || 0 : total;
    return { value: (t.value ?? 'all') as Status | 'all', label: n ? `${t.label} ${n}` : t.label };
  });
  const filtered = status !== 'due' || Boolean(search.trim());
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className={pageTitle}>Referral rewards</h1>
          <span className={countBadge}>{total}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 xl:w-64">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search referrer or hire…"
              aria-label="Search referral rewards"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
            />
          </div>
          <div className="max-w-full overflow-x-auto tt-scroll-hidden">
            <SegmentedControl fitText options={tabs} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
          </div>
        </div>
      </div>

      <div className={listCard}>
        {loading && !data ? (
          <TableSkeleton rows={6} columns={6} />
        ) : !data?.items.length ? (
          <div className="flex flex-1 items-center justify-center p-6">
            {total === 0 && !search.trim() ? (
              <EmptyState
                illustration={{ src: '/vectors/credit.svg', width: 220, height: 160, alt: '' }}
                title="No referral rewards yet"
                description="A reward appears when a referred candidate is hired and the referral program is on."
              />
            ) : (
              <EmptyState
                compact
                title={filtered ? 'Nothing here' : 'Nothing due'}
                description={filtered ? 'Try another status or search.' : 'Rewards show here on their due date.'}
              />
            )}
          </div>
        ) : (
          <>
            <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden transition-opacity', loading && 'opacity-70')}>
              <table className="w-full min-w-[900px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={thClass}>Referrer</th>
                    <th className={thClass}>Hire</th>
                    <th className={cx(thClass, 'text-right')}>Reward</th>
                    <th className={thClass}>Paid</th>
                    <th className={thClass}>When</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.id} className="transition-colors hover:bg-bg-subtle/50">
                      <td className={tdClass}><p className="font-semibold text-fg">{r.referrer.name}</p></td>
                      <td className={tdClass}>
                        <p className="font-semibold text-fg">{r.hire.name}</p>
                        <p className="text-xs text-fg-muted">{r.positionTitle}</p>
                      </td>
                      <td className={cx(tdClass, 'text-right font-semibold tabular-nums')}>{what(r)}</td>
                      <td className={cx(tdClass, 'text-fg-muted')}>{how(r)}</td>
                      <td className={cx(tdClass, 'text-xs tabular-nums text-fg-muted')}>
                        <div>{when(r) || '—'}</div>
                        {r.note && <div className="max-w-[220px] truncate italic">{r.note}</div>}
                      </td>
                      <td className={tdClass}><StatusPill label={TABS.find((t) => t.value === r.status)?.label || r.status} tone={STATUS_TONE[r.status]} /></td>
                      <td className={cx(tdClass, 'text-right')}>
                        <div className="flex justify-end gap-1.5">
                          {r.status === 'due' && <button type="button" className={btn.smallPrimary} onClick={() => setPaying(r)}>{r.rewardType === 'cash' ? 'Mark paid' : 'Mark given'}</button>}
                          {['waiting', 'due'].includes(r.status) && <button type="button" className={btn.small} onClick={() => setEditing(r)}>Edit</button>}
                          {['waiting', 'due'].includes(r.status) && <button type="button" className={btn.small} onClick={() => setCancelling(r)}>Cancel</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination currentPage={page} totalPages={data.pages} totalItems={data.total} pageSize={data.pageSize} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {editing && <EditDialog reward={editing} onClose={() => setEditing(null)} onDone={() => done('Reward updated')} />}
      {cancelling && <CancelDialog reward={cancelling} onClose={() => setCancelling(null)} onDone={() => done('Reward cancelled')} />}
      {paying && <PayDialog reward={paying} onClose={() => setPaying(null)} onDone={() => done(paying.rewardType === 'cash' ? 'Marked paid' : 'Marked given')} />}
    </div>
  );
}

function EditDialog({ reward, onClose, onDone }: { reward: api.ReferralRewardRowDto; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(reward.amount ?? ''));
  const [description, setDescription] = useState(reward.description ?? '');
  const [note, setNote] = useState(reward.note ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api.updateReferralReward(reward.id, reward.rewardType === 'cash' ? { amount: Number(amount), note } : { description, note });
      onDone();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Edit reward" footer={<button type="button" className={btn.primary} disabled={busy} onClick={save}>Save</button>}>
      <div className="space-y-3">
        {reward.rewardType === 'cash'
          ? <TextField label="Amount" type="number" prefix="₹" value={amount} onChange={setAmount} />
          : <TextField label="Reward" value={description} onChange={setDescription} maxLength={300} />}
        <Textarea label="Note" rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} hint="Visible to HR only." />
      </div>
    </Dialog>
  );
}

function CancelDialog({ reward, onClose, onDone }: { reward: api.ReferralRewardRowDto; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!reason.trim()) return showError('Say why');
    setBusy(true);
    try {
      await api.cancelReferralReward(reward.id, reason.trim());
      onDone();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Cancel reward" footer={<button type="button" className={btn.danger} disabled={busy} onClick={go}>Cancel reward</button>}>
      <Textarea label="Reason" rows={3} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} hint={`${reward.referrer.name} will not get ${what(reward)}.`} />
    </Dialog>
  );
}

function PayDialog({ reward, onClose, onDone }: { reward: api.ReferralRewardRowDto; onClose: () => void; onDone: () => void }) {
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await api.payReferralReward(reward.id, { paid_on: paidOn, reference: reference.trim() || undefined });
      onDone();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={reward.rewardType === 'cash' ? 'Mark reward paid' : 'Mark reward given'} footer={<button type="button" className={btn.primary} disabled={busy} onClick={go}>Save</button>}>
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">{what(reward)} to {reward.referrer.name}</p>
        <TextField label="Date" type="date" value={paidOn} onChange={setPaidOn} />
        <TextField label={reward.rewardType === 'cash' ? 'Payment reference' : 'Note (optional)'} value={reference} maxLength={120} onChange={setReference} />
      </div>
    </Dialog>
  );
}

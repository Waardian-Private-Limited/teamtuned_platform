'use client';

import React from 'react';
import { Check, Plane } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Dialog } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { StatusPill } from '@/components/ui/StatusPill';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { usePermission } from '@/lib/hooks/usePermission';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../api/approvals.api';
import { STATUS_LABEL } from '../constants';
import { useCatalog } from '../hooks/useCatalog';
import type { InboxItem } from '../types/approvals';
import { RequestDrawer } from './RequestDrawer';
import { DelegationPanel } from './DelegationPanel';

type Tab = 'pending' | 'history' | 'mine' | 'all';

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function tone(status: string): 'active' | 'inactive' | 'neutral' {
  return status === 'approved' ? 'active' : status === 'rejected' ? 'inactive' : 'neutral';
}

function describe(item: InboxItem) {
  const s = item.summary;
  if (!s) return item.typeLabel;
  const range = s.start && s.end ? ` · ${fmt(s.start)}${s.end !== s.start ? ` to ${fmt(s.end)}` : ''}` : '';
  return `${s.title || item.typeLabel}${range}${s.days ? ` · ${s.days}d` : ''}`;
}

export function InboxPage() {
  const { isOrgAdmin, hasPerm } = usePermission();
  const isAdmin = isOrgAdmin || hasPerm('HR_MODE');
  const { catalog } = useCatalog();
  const [tab, setTab] = React.useState<Tab>('pending');
  const [type, setType] = React.useState('');
  const [items, setItems] = React.useState<InboxItem[] | null>(null);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [bulk, setBulk] = React.useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = React.useState('');
  const [noteError, setNoteError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [away, setAway] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const r = await api.getInbox({ tab, type: type || undefined, page });
      setItems(r.items); setHasMore(r.hasMore); setError(null);
    } catch (e) { setError(messageOf(e)); setItems([]); }
  }, [tab, type, page]);

  React.useEffect(() => { setItems(null); load(); }, [load]);
  React.useEffect(() => { setPage(1); setSelected(new Set()); }, [tab, type]);

  const toggle = (id: number) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const confirmBulk = async () => {
    if (!bulk) return;
    if (bulk === 'reject' && !note.trim()) { setNoteError('Add a reason for rejecting'); return; }
    setBusy(true);
    try {
      const r = await api.bulkDecide([...selected], bulk, note.trim() || undefined);
      if (r.succeeded) showSuccess(`${r.succeeded} ${bulk === 'approve' ? 'approved' : 'rejected'}`);
      if (r.failed) showError(`${r.failed} could not be decided: ${r.results.find((x) => !x.ok)?.message || ''}`);
      setBulk(null); setNote(''); setSelected(new Set()); load();
    } catch (e) { showError(messageOf(e)); } finally { setBusy(false); }
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: 'pending', label: 'Waiting for me' }, { value: 'history', label: 'I decided' }, { value: 'mine', label: 'My requests' },
    ...(isAdmin ? [{ value: 'all' as Tab, label: 'Everyone' }] : []),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 overflow-x-auto"><SegmentedControl fitText value={tab} onChange={setTab} options={tabs} /></div>
        <div className="flex items-center gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Request type" className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-fg">
            <option value="">All types</option>
            {catalog?.requestTypes.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          <Btn icon={<Plane className="h-4 w-4" />} onClick={() => setAway(true)}>Out of office</Btn>
        </div>
      </div>

      {error && <Alert message={error} />}

      {selected.size > 0 && tab === 'pending' && (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-bg-subtle px-3 py-2 text-sm">
          <span className="font-medium text-fg">{selected.size} selected</span>
          <Btn variant="primary" className="ml-auto" icon={<Check className="h-4 w-4" />} onClick={() => setBulk('approve')}>Approve</Btn>
          <Btn variant="danger" onClick={() => setBulk('reject')}>Reject</Btn>
        </div>
      )}

      {items === null ? <TableSkeleton rows={6} columns={4} /> : items.length === 0 ? (
        <EmptyState compact title={tab === 'pending' ? 'Nothing is waiting for you' : 'No requests here'} description={tab === 'pending' ? 'New approvals will show up here and send you a notification.' : undefined} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-3">
              {tab === 'pending' && <input type="checkbox" aria-label={`Select request ${r.id}`} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[var(--tt-primary)]" />}
              <button type="button" onClick={() => setOpenId(r.id)} className="flex min-w-0 flex-1 flex-col text-left sm:flex-row sm:items-center sm:gap-4">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-fg">{r.requester.name || 'Employee'}<span className="ml-2 text-xs font-normal text-fg-muted">{r.requester.code}</span></span>
                  <span className="block truncate text-xs text-fg-muted">{describe(r)}</span>
                </span>
                <span className={cx('mt-1 flex items-center gap-2 text-xs text-fg-muted sm:mt-0')}>
                  {r.status === 'pending' && r.stepName && <span>Step {r.stepNumber} of {r.stepCount}: {r.stepName}</span>}
                  <StatusPill label={STATUS_LABEL[r.status]} tone={tone(r.status)} />
                  <span>{fmt(r.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <div className="flex justify-end gap-2">
          <Btn disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Btn>
          <Btn disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</Btn>
        </div>
      )}

      <RequestDrawer id={openId} onClose={() => setOpenId(null)} onChanged={load} />
      <DelegationPanel open={away} onClose={() => setAway(false)} />
      <Dialog open={Boolean(bulk)} onClose={() => setBulk(null)} title={`${bulk === 'approve' ? 'Approve' : 'Reject'} ${selected.size} requests`}
        footer={<div className="flex justify-end gap-2"><Btn onClick={() => setBulk(null)}>Cancel</Btn><Btn variant={bulk === 'reject' ? 'danger' : 'primary'} busy={busy} onClick={confirmBulk}>Confirm</Btn></div>}>
        <Textarea label={bulk === 'reject' ? 'Reason' : 'Note (optional)'} required={bulk === 'reject'} value={note} error={noteError} onChange={(e) => { setNote(e.target.value); setNoteError(''); }} />
      </Dialog>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { ExternalLink, Send } from 'lucide-react';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Drawer } from '@/components/ui/Drawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, Panel } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { Item, ItemKind } from '../api/dpr.api';
import { ITEM_LABEL, ITEM_ONE, Tag } from './parts';

const KINDS: ItemKind[] = ['breakdown', 'material', 'issue', 'action'];

/** One item: what it is, who owns it, its conversation (kept on the MOM action) and close / reopen. */
export function ItemDrawer({ item, basePath, canManage, onClose, onChanged }: { item: Item; basePath: string; canManage: boolean; onClose: () => void; onChanged: () => void }) {
  const talk = useAsync(() => api.discussion(item.id), [item.id]);
  const [text, setText] = React.useState('');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState('');
  const momBase = basePath.replace(/\/dpr$/, '');
  const send = async () => {
    setBusy('remark');
    try { const r = await api.remark(item.id, text); talk.setData(r); setText(''); } catch (e) { showError(messageOf(e)); } finally { setBusy(''); }
  };
  const move = async (action: 'close' | 'reopen') => {
    setBusy(action);
    try { await api.moveItem(item.id, action, note || undefined); showSuccess(action === 'close' ? 'Closed' : 'Reopened'); onChanged(); } catch (e) { showError(messageOf(e)); } finally { setBusy(''); }
  };
  const d = item.detail;
  return (
    <Drawer open onClose={onClose} title={ITEM_ONE[item.kind]} maxWidthClassName="max-w-md"
      footer={canManage ? (
        <div className="space-y-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={item.status === 'open' ? 'How it was resolved (optional)' : 'Why it is back (optional)'} aria-label="Note" className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
          {item.status === 'open' ? <Btn className="w-full" loading={busy === 'close'} onClick={() => move('close')}>Mark resolved</Btn> : <Btn variant="secondary" className="w-full" loading={busy === 'reopen'} onClick={() => move('reopen')}>Reopen</Btn>}
        </div>
      ) : undefined}>
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-base font-semibold text-fg">{item.title}</p>
          <div className="flex flex-wrap items-center gap-2"><Tag tone={item.status === 'open' ? 'wait' : 'done'}>{item.status === 'open' ? 'Open' : 'Closed'}</Tag>{item.location_name && <span className="text-xs text-fg-muted">{item.location_name}</span>}</div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div><dt className="text-fg-muted">Owner</dt><dd className="font-medium text-fg">{item.owner_name || 'No owner'}</dd></div>
          <div><dt className="text-fg-muted">Due</dt><dd className="font-medium text-fg">{item.due_on ? formatDate(item.due_on) : '—'}</dd></div>
          <div><dt className="text-fg-muted">Raised</dt><dd className="font-medium text-fg">{formatDate(item.opened_on)} · {item.days_open ?? 0} d</dd></div>
          {item.closed_on && <div><dt className="text-fg-muted">Closed</dt><dd className="font-medium text-fg">{formatDate(item.closed_on)}</dd></div>}
          {item.kind === 'material' && d.quantity && <div><dt className="text-fg-muted">Quantity</dt><dd className="font-medium text-fg">{d.quantity}</dd></div>}
          {item.kind === 'issue' && d.category && <div><dt className="text-fg-muted">Kind</dt><dd className="font-medium capitalize text-fg">{d.category}</dd></div>}
          {item.kind === 'action' && d.department && <div><dt className="text-fg-muted">Department</dt><dd className="font-medium text-fg">{d.department}</dd></div>}
        </dl>
        {item.close_note && <p className="rounded-lg bg-bg-subtle p-2.5 text-xs text-fg"><b>Resolution:</b> {item.close_note}</p>}
        {item.mom ? (
          <Link href={`${momBase}/mom/meetings/${item.mom.meeting_id}?point=${item.mom.point_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">Open the action in MOM <ExternalLink className="h-3 w-3" /></Link>
        ) : <p className="text-xs text-fg-muted">Not in MOM: it has no owner. Pick one when raising it to make it an action in this month&apos;s site meeting.</p>}
        {item.mom && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-fg">Conversation</p>
            {talk.error && <p className="text-xs text-[var(--tt-danger)]">{talk.error}</p>}
            {talk.data && !talk.data.items.length && <p className="text-xs text-fg-muted">No remarks yet.</p>}
            <ul className="space-y-2">{talk.data?.items.map((c) => <li key={c.id} className="rounded-lg border border-line p-2.5"><p className="whitespace-pre-line text-sm text-fg">{c.body}</p><p className="mt-1 text-[11px] text-fg-muted">{c.name} · {formatDayTime(c.created_at)}</p></li>)}</ul>
            <div className="flex items-end gap-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Add a remark" aria-label="Remark" className="min-h-[2.5rem] w-full flex-1 resize-y rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
              <Btn icon={Send} disabled={!text.trim()} loading={busy === 'remark'} onClick={send} aria-label="Send" />
            </div>
          </section>
        )}
      </div>
    </Drawer>
  );
}

/** Breakdowns, materials, site issues and actions raised from reports: open now, or closed. */
export function ItemsTab({ siteId, basePath }: { siteId: number; basePath: string }) {
  const [status, setStatus] = React.useState<'open' | 'closed'>('open');
  const [kind, setKind] = React.useState<ItemKind | null>(null);
  const { data, error, refetch } = useAsync(() => api.items(siteId, { status }), [siteId, status]);
  const [open, setOpen] = React.useState<Item | null>(null);
  const rows = (data?.items || []).filter((i) => !kind || i.kind === kind);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl fitText value={status} onChange={setStatus} options={[{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }]} />
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!kind} onClick={() => setKind(null)}>All · {data?.items.length ?? 0}</Chip>
          {KINDS.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(kind === k ? null : k)}>{ITEM_LABEL[k]} · {data?.counts[k] ?? 0}</Chip>)}
        </div>
      </div>
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      <Panel>
        {!data ? <div className="p-4"><TableSkeleton rows={5} columns={4} /></div> : !rows.length ? (
          <div className="p-6"><EmptyState compact title={status === 'open' ? 'Nothing open' : 'Nothing closed yet'} description={status === 'open' ? 'Breakdowns, material requests, site issues and actions appear here when a report raises them.' : undefined} /></div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => setOpen(i)} className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left transition-colors hover:bg-bg-subtle/60 sm:px-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{ITEM_ONE[i.kind]}{i.location_name ? ` · ${i.location_name}` : ''}{i.kind === 'issue' && i.detail.category && i.detail.category !== 'site' ? ` · ${i.detail.category}` : ''}</p>
                    <p className="font-medium text-fg">{i.title}</p>
                    <p className="text-xs text-fg-muted">{i.owner_name || 'No owner'} · raised {formatDate(i.opened_on, 'short')}{i.closed_on ? ` · closed ${formatDate(i.closed_on, 'short')}` : ` · ${i.days_open ?? 0} d open`}{i.due_on ? ` · due ${formatDate(i.due_on, 'short')}` : ''}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {i.status === 'open' && i.due_on && i.due_on < data.today ? <Tag tone="late">Late</Tag> : i.status === 'open' && (i.days_open ?? 0) >= 7 ? <Tag tone="late">{i.days_open} d</Tag> : null}
                    {i.mom && <span className="text-[11px] text-fg-muted">In MOM</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {open && <ItemDrawer item={open} basePath={basePath} canManage={Boolean(data?.access.manage)} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); void refetch(); }} />}
    </div>
  );
}

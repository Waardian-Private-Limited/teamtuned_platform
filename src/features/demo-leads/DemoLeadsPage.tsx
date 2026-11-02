'use client';

import React from 'react';
import { Mail, Phone, Search, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Drawer } from '@/components/ui/Drawer';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { formatDateTime } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { DEMO_LEAD_STATUSES, STATUS_LABEL, listDemoLeads, updateDemoLead, type DemoLeadDto, type DemoLeadListDto, type DemoLeadStatus } from './demoLeads.api';

const PILL: Record<DemoLeadStatus, string> = {
  new: 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]',
  contacted: 'border border-line bg-bg-subtle text-fg',
  demo_booked: 'border border-line bg-surface text-fg',
  won: 'bg-[var(--tt-success-soft)] text-[var(--tt-success)]',
  lost: 'bg-bg-subtle text-fg-muted line-through',
};

function StatusPill({ status }: { status: DemoLeadStatus }) {
  return <span className={cx('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', PILL[status])}>{STATUS_LABEL[status]}</span>;
}

/** "Meta / paid / proof-ad" or the website button that opened the form. */
function origin(l: DemoLeadDto) {
  const ad = [l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(' / ');
  return ad || (l.source ? `Website · ${l.source.replace(/_/g, ' ')}` : 'Website');
}

function useDemoLeads() {
  const [status, setStatus] = React.useState<DemoLeadStatus | null>(null);
  const [searchInput, setSearchInput] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [data, setData] = React.useState<DemoLeadListDto | null>(null);
  const [error, setError] = React.useState('');
  const [fetching, setFetching] = React.useState(false);
  const request = React.useRef(0);

  const load = React.useCallback(async () => {
    const id = ++request.current;
    setFetching(true);
    setError('');
    try {
      const dto = await listDemoLeads({ status, search, page, pageSize });
      if (id === request.current) setData(dto);
    } catch (err) {
      if (id === request.current) setError(messageOf(err));
    } finally {
      if (id === request.current) setFetching(false);
    }
  }, [status, search, page, pageSize]);

  React.useEffect(() => { void load(); }, [load]);
  React.useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return {
    status, setStatus: (s: DemoLeadStatus | null) => { setStatus(s); setPage(1); },
    searchInput, setSearchInput, page, setPage, pageSize, setPageSize: (n: number) => { setPageSize(n); setPage(1); },
    data, error, fetching, reload: load,
  };
}

export function DemoLeadsPage() {
  const list = useDemoLeads();
  const [openId, setOpenId] = React.useState<number | null>(null);
  const items = list.data?.items ?? [];
  const open = items.find((l) => l.id === openId) ?? null;
  const counts = list.data?.counts;
  const tabs: Array<{ value: DemoLeadStatus | null; label: string; n?: number }> = [
    { value: null, label: 'All', n: counts?.all },
    ...DEMO_LEAD_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], n: counts?.[s] })),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-fg">Demo requests</h1>
            <p className="text-sm text-fg-muted">Leads from the website demo form. Call new ones within the hour, then move them along.</p>
          </div>
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 focus-within:border-[var(--tt-primary)] sm:w-72">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} placeholder="Search name, company, email, phone…" aria-label="Search demo requests" className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0" />
            {list.searchInput && (
              <button type="button" aria-label="Clear search" onClick={() => list.setSearchInput('')} className="text-fg-subtle hover:text-fg"><X className="h-3.5 w-3.5" /></button>
            )}
          </div>
        </div>
        <div role="tablist" className="-mx-1 flex gap-1 overflow-x-auto px-1">
          {tabs.map((t) => {
            const active = list.status === t.value;
            return (
              <button key={t.label} type="button" role="tab" aria-selected={active} onClick={() => list.setStatus(t.value)}
                className={cx('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors',
                  active ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg-muted hover:bg-bg-subtle hover:text-fg')}>
                {t.label}
                <span className={cx('rounded px-1 text-[10px]', active ? 'bg-[var(--tt-on-primary)]/20' : 'bg-bg-subtle')}>{t.n ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        {list.error && <p role="alert" className="border-b border-line px-4 py-3 text-sm text-[var(--tt-danger)]">{list.error}</p>}
        {!list.data && !list.error ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="text-base font-bold text-fg">{list.searchInput || list.status ? 'No matching requests' : 'No demo requests yet'}</p>
            <p className="mt-1 max-w-sm text-sm text-fg-muted">Requests from the website demo form show up here, newest first.</p>
          </div>
        ) : (
          <>
            <div className={cx('min-h-0 flex-1 overflow-auto transition-opacity', list.fetching && 'opacity-70')}>
              <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {['Received', 'Name', 'Company', 'Team size', 'Contact', 'Came from', 'Status'].map((h) => (
                      <th key={h} className="border-b border-line bg-bg-subtle px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((l) => (
                    <tr key={l.id} onClick={() => setOpenId(l.id)} className={cx('cursor-pointer hover:bg-bg-subtle', l.status === 'new' && 'font-semibold')}>
                      <td className="whitespace-nowrap border-b border-line/60 px-4 py-3 text-fg-muted">{formatDateTime(l.created_at)}</td>
                      <td className="border-b border-line/60 px-4 py-3 text-fg">{l.full_name}</td>
                      <td className="border-b border-line/60 px-4 py-3 text-fg">{l.company_name}</td>
                      <td className="whitespace-nowrap border-b border-line/60 px-4 py-3 text-fg-muted">{l.company_size || '—'}</td>
                      <td className="border-b border-line/60 px-4 py-3">
                        <span className="block text-fg">{l.email}</span>
                        {l.phone && <span className="block text-xs text-fg-muted">{l.phone}</span>}
                      </td>
                      <td className="border-b border-line/60 px-4 py-3 text-fg-muted">{origin(l)}</td>
                      <td className="border-b border-line/60 px-4 py-3"><StatusPill status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <Pagination currentPage={list.page} totalPages={Math.max(1, Math.ceil((list.data?.total ?? 0) / list.pageSize))} totalItems={list.data?.total ?? 0} pageSize={list.pageSize}
                onPageChange={list.setPage} onPageSizeChange={list.setPageSize} pageSizeOptions={[25, 50, 100]} />
            </div>
          </>
        )}
      </div>

      <LeadDrawer lead={open} onClose={() => setOpenId(null)} onSaved={() => void list.reload()} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-b border-line/60 py-2.5 text-sm">
      <span className="text-fg-muted">{label}</span>
      <span className="min-w-0 break-words text-fg">{children}</span>
    </div>
  );
}

function LeadDrawer({ lead, onClose, onSaved }: { lead: DemoLeadDto | null; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = React.useState<DemoLeadStatus>('new');
  const [notes, setNotes] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!lead) return;
    setStatus(lead.status);
    setNotes(lead.notes || '');
  }, [lead]);

  if (!lead) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>;
  const dirty = status !== lead.status || notes !== (lead.notes || '');

  const save = async () => {
    setBusy(true);
    try {
      await updateDemoLead(lead.id, { status, notes });
      showSuccess('Saved');
      onSaved();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open onClose={onClose} title={lead.full_name} maxWidthClassName="sm:max-w-lg">
      <div className="flex min-h-full flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-fg">{lead.company_name}</p>
          <p className="text-xs text-fg-muted">Received {formatDateTime(lead.created_at)}{lead.contacted_at ? ` · first contacted ${formatDateTime(lead.contacted_at)}` : ''}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`mailto:${lead.email}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-sm font-semibold text-[var(--tt-on-primary)]"><Mail className="h-4 w-4" /> Email</a>
            {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-fg"><Phone className="h-4 w-4" /> Call</a>}
          </div>
        </div>

        <div>
          <Row label="Email">{lead.email}</Row>
          <Row label="Phone">{lead.phone || '—'}</Row>
          <Row label="Team size">{lead.company_size || '—'}</Row>
          <Row label="Wants to fix"><span className="whitespace-pre-wrap">{lead.message || '—'}</span></Row>
          <Row label="Came from">{origin(lead)}</Row>
          {lead.page_url && <Row label="Page">{lead.page_url}</Row>}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Follow-up</p>
          <div className="flex flex-wrap gap-1.5">
            {DEMO_LEAD_STATUSES.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s}
                className={cx('h-8 rounded-lg border px-3 text-xs font-semibold transition-colors',
                  status === s ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg')}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="text-sm font-medium text-fg">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} maxLength={5000} placeholder="Called on Tue, demo booked for Thu 3 pm…"
              className="mt-1.5 w-full resize-y rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tt-primary)]" />
          </label>
        </div>

        <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex justify-end gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:-mb-5 sm:px-6">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-fg">Close</button>
          <button type="button" onClick={save} disabled={!dirty || busy} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] disabled:opacity-50">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

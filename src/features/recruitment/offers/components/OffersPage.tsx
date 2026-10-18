'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { formatDate, formatDayTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { countBadge, formatInr, listCard, pageTitle, tdClass, thClass, toolbarCard } from '../../interviews/lib/ui';
import { CandidateDrawerHost } from '../../interviews/components/CandidateDrawerHost';
import { useOfferList } from '../hooks/useOfferList';
import { OFFER_STATUS_FILTER, OFFER_STATUS_LABEL, offerTone } from '../constants/offers.constants';
import type { OfferDetailDto, OfferListItemDto } from '../types/offers.dto';
import { OfferDrawer } from './OfferDrawer';
import { OfferDialog } from './OfferDialog';
import { HireDialog } from './HireDialog';

export function OffersPage() {
  const list = useOfferList();
  const [open, setOpen] = useState<OfferListItemDto | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [edit, setEdit] = useState<{ offer: OfferDetailDto; applicationId: number; candidateName: string } | null>(null);
  const [hire, setHire] = useState<{ offerId: number; candidateName: string } | null>(null);
  const [candidateAppId, setCandidateAppId] = useState<number | null>(null);

  const refresh = () => { list.refetch(); setReloadKey((k) => k + 1); };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className={pageTitle}>Offers</h1>
          <span className={countBadge}>{list.total}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <div className="relative flex h-9 w-full items-center rounded-lg border border-line bg-surface px-2.5 transition-colors focus-within:border-[var(--tt-primary)] focus-within:ring-1 focus-within:ring-[var(--tt-primary)] sm:w-56 xl:w-64">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" />
            <input
              value={list.searchInput}
              onChange={(e) => list.setSearchInput(e.target.value)}
              placeholder="Search candidate or position…"
              aria-label="Search offers"
              className="ml-2 w-full min-w-0 border-none bg-transparent text-xs text-fg placeholder:text-fg-subtle outline-none focus:ring-0 sm:text-sm"
            />
          </div>
          <div className="max-w-full overflow-x-auto tt-scroll-hidden">
            <SegmentedControl fitText options={OFFER_STATUS_FILTER} value={list.status} onChange={list.setStatus} />
          </div>
        </div>
      </div>

      <div className={listCard}>
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.isInitialLoading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : list.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            {list.hasFilters ? (
              <EmptyState compact title="No matching offers" description="Try another status or search." action={{ label: 'Clear filters', onClick: list.clearFilters, variant: 'link' }} />
            ) : (
              <EmptyState
                illustration={{ src: '/vectors/approvals.svg', width: 220, height: 160, alt: '' }}
                title="No offers yet"
                description="Draft an offer from a candidate in the Offer stage. It shows up here for approval, sending and hiring."
              />
            )}
          </div>
        ) : (
          <>
            <div className={cx('min-h-0 flex-1 overflow-auto tt-scroll-hidden transition-opacity', list.isFetching && 'opacity-70')}>
              <table className="w-full min-w-[820px] border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={thClass}>Candidate</th>
                    <th className={thClass}>Designation</th>
                    <th className={cx(thClass, 'text-right')}>Annual CTC</th>
                    <th className={thClass}>Joining</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}>Sent / responded</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((o) => (
                    <tr
                      key={o.id}
                      tabIndex={0}
                      onClick={() => setOpen(o)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o); } }}
                      className="cursor-pointer transition-colors hover:bg-bg-subtle/50 focus-visible:bg-bg-subtle focus-visible:outline-none"
                    >
                      <td className={tdClass}>
                        <p className="font-semibold text-fg">{o.application.candidateName}</p>
                        <p className="text-xs text-fg-muted">{o.application.positionTitle}</p>
                      </td>
                      <td className={tdClass}>{o.designation || '—'}</td>
                      <td className={cx(tdClass, 'text-right font-semibold tabular-nums')}>{formatInr(o.annualCtc)}</td>
                      <td className={cx(tdClass, 'tabular-nums')}>{formatDate(o.joiningDate)}</td>
                      <td className={tdClass}><StatusPill label={OFFER_STATUS_LABEL[o.status] || o.status} tone={offerTone(o.status)} /></td>
                      <td className={cx(tdClass, 'text-xs tabular-nums text-fg-muted')}>
                        <div>{o.sentAt ? `Sent ${formatDayTime(o.sentAt)}` : '—'}</div>
                        {o.respondedAt && <div>Responded {formatDayTime(o.respondedAt)}</div>}
                        {!o.respondedAt && o.status === 'sent' && o.expiresOn && <div>Expires {formatDate(o.expiresOn, 'short')}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line bg-surface px-4 py-2.5">
              <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} />
            </div>
          </>
        )}
      </div>

      <OfferDrawer
        item={open}
        reloadKey={reloadKey}
        onClose={() => setOpen(null)}
        onChanged={list.refetch}
        onEdit={(offer, applicationId, candidateName) => setEdit({ offer, applicationId, candidateName })}
        onHire={(offer, candidateName) => setHire({ offerId: offer.id, candidateName })}
        onOpenCandidate={(id) => { setOpen(null); setCandidateAppId(id); }}
      />

      <OfferDialog
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        applicationId={edit?.applicationId ?? 0}
        offer={edit?.offer ?? null}
        candidateName={edit?.candidateName}
        onDone={refresh}
      />

      <HireDialog offerId={hire?.offerId ?? null} candidateName={hire?.candidateName} onClose={() => setHire(null)} onHired={refresh} />

      <CandidateDrawerHost applicationId={candidateAppId} onClose={() => setCandidateAppId(null)} onChanged={list.refetch} initialTab="offer" />
    </div>
  );
}

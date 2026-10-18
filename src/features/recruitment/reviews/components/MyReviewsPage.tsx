'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { messageOf } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { btn, countBadge, pageTitle, toolbarCard } from '../../interviews/lib/ui';
import * as api from '../api/reviews.api';
import type { MyReviewDto } from '../types/reviews.dto';
import { DecisionBadge } from './DecisionBadge';

type Scope = 'pending' | 'done';
const PAGE_SIZE = 20;

/** Candidates the employee was asked to review before an offer: to do / done. */
export function MyReviewsPage() {
  const [scope, setScope] = useState<Scope>('pending');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MyReviewDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [counts, setCounts] = useState<{ pending: number; done: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.myReviews(scope, page, PAGE_SIZE);
      setItems(r.items || []);
      setTotal(r.total ?? 0);
      setPages(r.pages ?? 1);
      if (r.counts) setCounts(r.counts);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [scope, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className={pageTitle}>My reviews</h1>
          {counts && counts.pending > 0 && <span className={countBadge}>{counts.pending} to do</span>}
        </div>
        <div className="w-full sm:w-64">
          <SegmentedControl
            options={[{ value: 'pending', label: counts ? `To do (${counts.pending})` : 'To do' }, { value: 'done', label: counts ? `Done (${counts.done})` : 'Done' }] as const}
            value={scope}
            onChange={(v) => { setScope(v); setPage(1); }}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {error && <div className="mb-3"><Alert message={error} tone="error" /></div>}
        {loading && items.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl border border-line bg-surface" />)}</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6">
            <EmptyState
              illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }}
              title={scope === 'pending' ? 'Nothing to review' : 'No reviews yet'}
              description={scope === 'pending' ? 'When HR asks you to review a candidate before an offer, it shows up here.' : 'Candidates you have reviewed show up here.'}
            />
          </div>
        ) : (
          <div className={cx('grid gap-3 md:grid-cols-2 2xl:grid-cols-3', loading && 'opacity-70')}>
            {items.map((r) => (
              <article key={r.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fg">{r.candidateName}</p>
                    <p className="truncate text-xs text-fg-muted">{r.positionTitle}</p>
                  </div>
                  <DecisionBadge review={r} />
                </div>
                {r.message && <p className="line-clamp-2 text-xs text-fg-muted">“{r.message}”</p>}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-fg-muted">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {r.status === 'pending' && r.applicationStatus !== 'active' ? 'Candidate closed' : `Asked by ${r.requestedBy || 'HR'} · ${formatDateTime(r.createdAt)}`}
                  </span>
                  <Link href={`/employee/my-reviews/${r.id}`} className={(scope === 'pending' ? btn.smallPrimary : btn.small)}>
                    {scope === 'pending' ? 'Review' : 'Open'} <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        {pages > 1 && (
          <div className="mt-3 rounded-xl border border-line bg-surface px-4 py-2.5">
            <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}

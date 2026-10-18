'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ClipboardCheck, ExternalLink } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { useAuth } from '@/context/AuthContext';
import { messageOf } from '@/lib/api/errors';
import { formatTime, orgDateOf, orgToday, useOrgTimezone } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import * as api from '../api/interviews.api';
import type { InterviewListItemDto } from '../types/interviews.dto';
import { INTERVIEW_MODE_LABEL, INTERVIEW_STATUS_LABEL } from '../constants/interviews.constants';
import { btn, countBadge, pageTitle, toolbarCard } from '../lib/ui';
import { ModeIcon, dayLabel, statusTone } from './InterviewsPage';

// To do: my scorecard is still missing; it moves to Done once submitted (or when the interview is cancelled / no-show).
type Scope = 'pending' | 'done';
const PAGE_SIZE = 20;

export function MyInterviewsPage() {
  const tz = useOrgTimezone();
  const today = orgToday(tz);
  const { employee } = useAuth();
  const [scope, setScope] = useState<Scope>('pending');
  const [counts, setCounts] = useState<{ pending: number; done: number } | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<InterviewListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setError('');
    try {
      const res = await api.listMyInterviews(scope, page, PAGE_SIZE);
      if (mine !== seq.current) return;
      const list = res.items || [];
      setItems(list);
      setTotal(res.total ?? list.length);
      setPages(res.pages ?? 1);
      if (res.counts) setCounts(res.counts);
    } catch (err) {
      if (mine === seq.current) setError(messageOf(err));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [scope, page]);

  useEffect(() => { load(); }, [load]);

  const myId = employee?.id ?? null;
  const groups = useMemo(() => {
    const map = new Map<string, InterviewListItemDto[]>();
    items.forEach((i) => {
      const d = orgDateOf(i.scheduledAt, tz);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(i);
    });
    return Array.from(map.entries());
  }, [items, tz]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className={pageTitle}>My interviews</h1>
          {counts && counts.pending > 0 && <span className={countBadge}>{counts.pending} to do</span>}
        </div>
        <div className="w-full sm:w-64">
          <SegmentedControl
            options={[
              { value: 'pending', label: counts ? `To do (${counts.pending})` : 'To do' },
              { value: 'done', label: counts ? `Done (${counts.done})` : 'Done' },
            ] as const}
            value={scope}
            onChange={(v) => { setScope(v); setPage(1); }}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto tt-scroll-hidden">
        {error && <div className="mb-3"><Alert message={error} tone="error" /></div>}
        {loading && items.length === 0 ? (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl border border-line bg-surface" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-6">
            <EmptyState
              illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }}
              title={scope === 'pending' ? 'Nothing to do' : 'No interviews yet'}
              description={scope === 'pending'
                ? 'Interviews waiting for your scorecard show up here. Once you submit it, the interview moves to Done.'
                : 'Interviews you have submitted a scorecard for, and cancelled ones, show up here.'}
            />
          </div>
        ) : (
          <div className={cx('space-y-5 transition-opacity', loading && 'opacity-70')}>
            {groups.map(([date, rows]) => (
              <section key={date}>
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">{dayLabel(date, today)}</h2>
                <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {rows.map((i) => {
                    const me = i.panel.find((p) => p.isMe || (myId !== null && p.employeeId === myId));
                    const submitted = Boolean(me?.submitted);
                    const end = Date.parse(i.scheduledAt) + i.durationMinutes * 60000;
                    return (
                      <article key={i.id} className={cx('flex flex-col gap-3 rounded-xl border border-line bg-surface p-4', i.status === 'cancelled' && 'opacity-60')}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="tabular-nums">
                            <p className="text-lg font-bold text-fg">{formatTime(i.scheduledAt)}</p>
                            <p className="text-[11px] text-fg-muted">to {formatTime(end)} · {i.durationMinutes} min</p>
                          </div>
                          <StatusPill label={INTERVIEW_STATUS_LABEL[i.status] || i.status} tone={statusTone(i.status)} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-fg">{i.application.candidateName}</p>
                          <p className="truncate text-xs text-fg-muted">{i.application.positionTitle} · {i.roundName}</p>
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
                          <ModeIcon mode={i.mode} className="h-3.5 w-3.5 shrink-0" />
                          <span className="shrink-0">{INTERVIEW_MODE_LABEL[i.mode] || i.mode}</span>
                          {i.mode === 'video' && i.meetingUrl && i.status === 'scheduled' && end >= Date.now() ? (
                            <a href={i.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1 font-semibold text-fg underline-offset-4 hover:underline">
                              <span className="truncate">Join</span><ExternalLink className="h-3 w-3 shrink-0" />
                            </a>
                          ) : i.location ? (
                            <span className="truncate">· {i.location}</span>
                          ) : null}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/60 pt-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg-muted">
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            {i.status === 'cancelled' ? 'Cancelled'
                              : submitted ? 'Scorecard submitted'
                              : i.status === 'no_show' ? 'No-show'
                              : end < Date.now() ? 'Scorecard overdue' : 'Scorecard due'}
                          </span>
                          <Link
                            href={`/employee/my-interviews/${i.id}`}
                            className={(scope === 'pending' ? btn.smallPrimary : btn.small)}
                          >
                            {scope === 'pending' ? 'Fill scorecard' : 'Open'} <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            {pages > 1 && (
              <div className="rounded-xl border border-line bg-surface px-4 py-2.5">
                <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

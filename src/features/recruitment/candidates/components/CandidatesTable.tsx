'use client';

import { CalendarClock, ClipboardCheck, FileSignature, MessageSquare } from 'lucide-react';
import { formatDate, formatDayTime, orgDateOf } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import {
  OFFER_STATUS_LABELS, RECOMMENDATION_LABELS, SOURCE_LABELS, TEST_RESULT_LABELS, TEST_STATUS_LABELS,
} from '../../shared/constants/recruitment.constants';
import { CandidateAvatar } from '../../shared/components/CandidateAvatar';
import { RatingStars } from '../../shared/components/RatingStars';
import { StageBadge } from '../../shared/components/StageBadge';
import type { ApplicationCard, Recommendation } from '../../shared/types/recruitment.model';

function Signals({ a }: { a: ApplicationCard }) {
  const parts: Array<{ icon: React.ComponentType<{ className?: string }>; text: string }> = [];
  if (a.nextInterview) parts.push({ icon: CalendarClock, text: formatDayTime(a.nextInterview.at) });
  if (a.test) parts.push({ icon: ClipboardCheck, text: `${a.test.result ? TEST_RESULT_LABELS[a.test.result] || a.test.result : TEST_STATUS_LABELS[a.test.status] || a.test.status}${a.test.scorePercent !== null ? ` ${a.test.scorePercent}%` : ''}` });
  if (a.offer) parts.push({ icon: FileSignature, text: OFFER_STATUS_LABELS[a.offer.status] || a.offer.status });
  if (a.feedback && a.feedback.total > 0) {
    parts.push({ icon: MessageSquare, text: `${a.feedback.submitted}/${a.feedback.total}${a.feedback.recommendation ? ` · ${RECOMMENDATION_LABELS[a.feedback.recommendation as Recommendation] || a.feedback.recommendation}` : ''}` });
  }
  if (!parts.length) return <span className="text-xs text-fg-subtle">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {parts.map((p, i) => (
        <span key={i} className="inline-flex h-5 items-center gap-1 rounded border border-line bg-bg-subtle px-1.5 text-[10px] font-semibold text-fg-muted">
          <p.icon className="h-3 w-3" />{p.text}
        </span>
      ))}
    </div>
  );
}

const th = 'px-3.5 py-2.5 sm:px-4 lg:px-5 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle whitespace-nowrap';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 lg:px-5 align-middle';
const applied = (a: ApplicationCard) => (a.appliedAt ? formatDate(orgDateOf(a.appliedAt)) : '—');

export function CandidatesTable({ items, onOpen }: { items: ApplicationCard[]; onOpen: (a: ApplicationCard) => void }) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[980px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={th}>Candidate</th>
            <th className={th}>Position</th>
            <th className={th}>Stage</th>
            <th className={th}>Signals</th>
            <th className={th}>Rating</th>
            <th className={th}>Source</th>
            <th className={th}>Applied</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr
              key={a.id}
              onClick={() => onOpen(a)}
              className="cursor-pointer transition-colors hover:bg-bg-subtle/50"
            >
              <td className={td}>
                <div className="flex items-center gap-2.5">
                  <CandidateAvatar name={a.candidate.name} size="sm" />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpen(a); }}
                      className="block max-w-[220px] truncate text-left text-sm font-semibold text-fg hover:underline"
                    >
                      {a.candidate.name}
                    </button>
                    <p className="max-w-[220px] truncate text-xs text-fg-muted">
                      {[a.candidate.currentTitle, a.candidate.currentCompany].filter(Boolean).join(' · ') || a.candidate.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className={cx(td, 'max-w-[220px] truncate text-sm text-fg')}>{a.position?.title || '—'}</td>
              <td className={td}><StageBadge stage={a.stage} status={a.status} /></td>
              <td className={td}><Signals a={a} /></td>
              <td className={td}><RatingStars value={a.rating} size="sm" /></td>
              <td className={cx(td, 'whitespace-nowrap text-xs text-fg-muted')}>{SOURCE_LABELS[a.source]}</td>
              <td className={cx(td, 'whitespace-nowrap text-xs text-fg-muted')}>{applied(a)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CandidatesCardList({ items, onOpen }: { items: ApplicationCard[]; onOpen: (a: ApplicationCard) => void }) {
  return (
    <>
      {items.map((a) => (
        <button key={a.id} type="button" onClick={() => onOpen(a)} className="block w-full space-y-2 p-4 text-left hover:bg-bg-subtle/40">
          <div className="flex items-start gap-2.5">
            <CandidateAvatar name={a.candidate.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{a.candidate.name}</p>
              <p className="truncate text-xs text-fg-muted">{a.position?.title || '—'}</p>
            </div>
            <StageBadge stage={a.stage} status={a.status} />
          </div>
          <Signals a={a} />
          <div className="flex items-center justify-between text-[11px] text-fg-muted">
            <RatingStars value={a.rating} size="sm" />
            <span>{SOURCE_LABELS[a.source]} · {applied(a)}</span>
          </div>
        </button>
      ))}
    </>
  );
}

export function CandidatesSkeleton() {
  return (
    <div className="h-full animate-pulse overflow-hidden">
      <div className="hidden h-10 border-b border-line bg-bg-subtle/95 md:block" />
      {Array.from({ length: 7 }).map((_, r) => (
        <div key={r} className="flex h-16 items-center gap-6 border-b border-line/60 px-5">
          <div className="h-7 w-7 rounded-full bg-bg-subtle" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 rounded bg-bg-subtle" style={{ width: `${120 + (r % 3) * 40}px` }} />
            <div className="h-2.5 w-40 rounded bg-bg-subtle/70" />
          </div>
          <div className="hidden h-3 w-32 rounded bg-bg-subtle md:block" />
          <div className="h-6 w-20 rounded bg-bg-subtle" />
          <div className="hidden h-3 w-24 rounded bg-bg-subtle md:block" />
        </div>
      ))}
    </div>
  );
}

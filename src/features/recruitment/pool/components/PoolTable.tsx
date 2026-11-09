'use client';

import { Phone } from 'lucide-react';
import { formatDate, orgDateOf, orgToday } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { CandidateAvatar } from '../../shared/components/CandidateAvatar';
import { SOURCE_LABELS, STAGE_LABELS } from '../../shared/constants/recruitment.constants';
import { LEAD_STATUS_LABELS } from '../constants/pool.constants';
import type { LeadStatus, PoolItem } from '../types/pool.types';

const CLOSED: LeadStatus[] = ['moved', 'not_interested'];

/** A follow-up on or before today on a lead that is still open: the one thing shown in red. */
export function isDue(followUpOn: string | null, status: LeadStatus | null) {
  return Boolean(followUpOn && status && !CLOSED.includes(status) && followUpOn <= orgToday());
}

export function LeadStatusBadge({ status }: { status: LeadStatus | null }) {
  if (!status) return <span className="text-xs text-fg-subtle">Record</span>;
  const strong = status === 'interested' || status === 'call_back';
  return (
    <span className={cx(
      'inline-flex h-6 items-center whitespace-nowrap rounded-md border px-2 text-[11px] font-semibold',
      strong ? 'border-fg/30 bg-surface text-fg' : 'border-line bg-bg-subtle text-fg-muted',
      status === 'not_interested' && 'line-through decoration-fg-subtle/60'
    )}>
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function FollowUp({ item }: { item: Pick<PoolItem, 'followUpOn' | 'leadStatus'> }) {
  if (!item.followUpOn) return <span className="text-xs text-fg-subtle">—</span>;
  const due = isDue(item.followUpOn, item.leadStatus);
  return (
    <span className={cx('whitespace-nowrap text-xs font-semibold tabular-nums', due ? 'text-[var(--tt-danger)]' : 'text-fg')}>
      {item.followUpOn === orgToday() ? 'Today' : formatDate(item.followUpOn)}
      {due && item.followUpOn !== orgToday() && ' · overdue'}
    </span>
  );
}

const sourceText = (i: PoolItem) => i.leadSource || SOURCE_LABELS[i.source] || i.source;
const subtitle = (i: PoolItem) => [i.currentTitle, i.currentCompany].filter(Boolean).join(' · ')
  || [i.totalExperience !== null ? `${i.totalExperience} yrs` : null, i.city].filter(Boolean).join(' · ') || '—';

function LastApplication({ item }: { item: PoolItem }) {
  const a = item.lastApplication;
  if (!a) return <span className="text-xs text-fg-subtle">{item.applicationCount ? `${item.applicationCount} elsewhere` : 'None yet'}</span>;
  const state = a.status === 'active' ? STAGE_LABELS[a.stage] || a.stage : a.status;
  return (
    <span className="block max-w-[200px] truncate text-xs text-fg">
      {a.positionTitle} <span className="capitalize text-fg-muted">· {state}</span>
    </span>
  );
}

const th = 'px-3.5 py-2.5 sm:px-4 lg:px-5 text-left text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-fg-muted select-none border-b border-line bg-bg-subtle whitespace-nowrap';
const td = 'border-b border-line/60 px-3.5 py-2.5 sm:px-4 lg:px-5 align-middle';

export function PoolTable({ items, onOpen }: { items: PoolItem[]; onOpen: (i: PoolItem) => void }) {
  return (
    <div className="h-full overflow-auto tt-scroll-hidden">
      <table className="w-full min-w-[1000px] border-separate border-spacing-0">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className={th}>Person</th>
            <th className={th}>Contact</th>
            <th className={th}>Source</th>
            <th className={th}>Status</th>
            <th className={th}>Follow-up</th>
            <th className={th}>Last contact</th>
            <th className={th}>Latest application</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} onClick={() => onOpen(i)} className="cursor-pointer transition-colors hover:bg-bg-subtle/50">
              <td className={td}>
                <div className="flex items-center gap-2.5">
                  <CandidateAvatar name={i.name} size="sm" />
                  <div className="min-w-0">
                    <p className="max-w-[240px] truncate text-sm font-semibold text-fg">{i.name}</p>
                    <p className="max-w-[240px] truncate text-xs text-fg-muted">{subtitle(i)}</p>
                  </div>
                </div>
              </td>
              <td className={td}>
                {i.phone && (
                  <a href={`tel:${i.phone}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs font-semibold tabular-nums text-fg hover:underline">
                    <Phone className="h-3 w-3 text-fg-muted" />{i.phone}
                  </a>
                )}
                {i.email && <p className="max-w-[200px] truncate text-xs text-fg-muted">{i.email}</p>}
              </td>
              <td className={cx(td, 'max-w-[140px] truncate text-xs text-fg-muted')}>{sourceText(i)}</td>
              <td className={td}><LeadStatusBadge status={i.leadStatus} /></td>
              <td className={td}><FollowUp item={i} /></td>
              <td className={cx(td, 'whitespace-nowrap text-xs text-fg-muted')}>{i.lastContactedAt ? formatDate(orgDateOf(i.lastContactedAt)) : '—'}</td>
              <td className={td}><LastApplication item={i} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PoolCardList({ items, onOpen }: { items: PoolItem[]; onOpen: (i: PoolItem) => void }) {
  return (
    <>
      {items.map((i) => (
        <button key={i.id} type="button" onClick={() => onOpen(i)} className="block w-full space-y-2 p-4 text-left hover:bg-bg-subtle/40">
          <div className="flex items-start gap-2.5">
            <CandidateAvatar name={i.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-fg">{i.name}</p>
              <p className="truncate text-xs text-fg-muted">{subtitle(i)}</p>
            </div>
            <LeadStatusBadge status={i.leadStatus} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-fg-muted">
            <span className="truncate">{sourceText(i)}{i.phone ? ` · ${i.phone}` : ''}</span>
            <FollowUp item={i} />
          </div>
        </button>
      ))}
    </>
  );
}

export function PoolSkeleton() {
  return (
    <div className="h-full animate-pulse overflow-hidden">
      <div className="hidden h-10 border-b border-line bg-bg-subtle/95 md:block" />
      {Array.from({ length: 7 }).map((_, r) => (
        <div key={r} className="flex h-16 items-center gap-6 border-b border-line/60 px-5">
          <div className="h-7 w-7 rounded-full bg-bg-subtle" />
          <div className="h-3 w-40 rounded bg-bg-subtle" />
          <div className="h-3 w-24 rounded bg-bg-subtle/70" />
          <div className="h-3 w-20 rounded bg-bg-subtle/70" />
        </div>
      ))}
    </div>
  );
}

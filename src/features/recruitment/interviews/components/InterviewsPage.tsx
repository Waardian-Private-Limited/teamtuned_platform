'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, CheckCircle2, MapPin, MoreHorizontal, Phone, UserX, Video, XCircle } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableFilterDropdown } from '@/components/ui/SearchableFilterDropdown';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tooltip } from '@/components/ui/Tooltip';
import { messageOf } from '@/lib/api/errors';
import { addDays, formatDate, formatTime, orgDateOf, orgToday, useOrgTimezone } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { ActionMenu } from '../../shared/components/ActionMenu';
import { useRecruitmentAccess } from '../../shared/hooks/useRecruitmentAccess';
import * as api from '../api/interviews.api';
import type { InterviewListItemDto } from '../types/interviews.dto';
import { INTERVIEW_MODE_LABEL, INTERVIEW_STATUS_FILTER, INTERVIEW_STATUS_LABEL, RANGE_PRESETS } from '../constants/interviews.constants';
import { useInterviewList } from '../hooks/useInterviewList';
import { Avatar, EmployeeSelect } from '../lib/EmployeePickers';
import { btn, countBadge, listCard, nativeSelect, pageTitle, toolbarCard } from '../lib/ui';
import { ScheduleInterviewDialog } from './ScheduleInterviewDialog';
import { CancelInterviewDialog } from './CancelInterviewDialog';
import { CandidateDrawerHost } from './CandidateDrawerHost';

export function statusTone(status: string): 'active' | 'inactive' | 'terminated' | 'neutral' {
  if (status === 'scheduled') return 'active';
  if (status === 'no_show') return 'inactive';
  if (status === 'cancelled') return 'terminated';
  return 'neutral';
}

export function ModeIcon({ mode, className = 'h-3.5 w-3.5' }: { mode: string; className?: string }) {
  if (mode === 'in_person') return <MapPin className={className} aria-hidden />;
  if (mode === 'phone') return <Phone className={className} aria-hidden />;
  return <Video className={className} aria-hidden />;
}

export function dayLabel(date: string, today: string) {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatDate(date, 'long');
}

export function InterviewsPage() {
  const tz = useOrgTimezone();
  const today = orgToday(tz);
  const access = useRecruitmentAccess();
  const list = useInterviewList();
  const [positions, setPositions] = useState<{ value: number; label: string }[]>([]);
  const [reschedule, setReschedule] = useState<InterviewListItemDto | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InterviewListItemDto | null>(null);
  const [drawerAppId, setDrawerAppId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    api.listPositionOptions()
      .then((res) => setPositions((res.items || []).map((p) => ({ value: p.id, label: p.title }))))
      .catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, InterviewListItemDto[]>();
    [...list.items]
      .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))
      .forEach((i) => {
        const d = orgDateOf(i.scheduledAt, tz);
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(i);
      });
    return Array.from(map.entries());
  }, [list.items, tz]);

  async function complete(i: InterviewListItemDto, status: 'completed' | 'no_show') {
    setBusyId(i.id);
    try {
      await api.completeInterview(i.id, status);
      showSuccess(status === 'completed' ? 'Marked completed' : 'Marked no-show');
      list.refetch();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className={toolbarCard}>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <h1 className={pageTitle}>Interviews</h1>
          <span className={countBadge}>{list.total}</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
          <SegmentedControl fitText options={RANGE_PRESETS} value={list.preset} onChange={list.setPreset} />
          {list.preset === 'custom' && (
            <div className="flex items-center gap-1.5">
              <input type="date" aria-label="From" value={list.customFrom} onChange={(e) => list.setCustomFrom(e.target.value)} className={cx(nativeSelect, 'w-36 pr-2 tabular-nums')} />
              <span className="text-xs text-fg-muted">to</span>
              <input type="date" aria-label="To" value={list.customTo} onChange={(e) => list.setCustomTo(e.target.value)} className={cx(nativeSelect, 'w-36 pr-2 tabular-nums')} />
            </div>
          )}
          <select aria-label="Status" value={list.status} onChange={(e) => list.setStatus(e.target.value as typeof list.status)} className={cx(nativeSelect, 'sm:w-36')}>
            {INTERVIEW_STATUS_FILTER.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {positions.length > 0 && (
            <SearchableFilterDropdown label="Position" allLabel="All positions" value={list.positionId} options={positions} onChange={list.setPositionId} />
          )}
          <div className="w-full sm:w-52">
            <EmployeeSelect value={list.interviewer} onChange={list.setInterviewer} placeholder="Any interviewer" ariaLabel="Interviewer" />
          </div>
        </div>
      </div>

      <div className={listCard}>
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.isInitialLoading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-lg bg-bg-subtle" />)}
          </div>
        ) : list.items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              illustration={list.hasFilters ? undefined : { src: '/vectors/review.svg', width: 220, height: 160, alt: '' }}
              compact={list.hasFilters}
              title="No interviews in this range"
              description={`${formatDate(list.range.from, 'short')} – ${formatDate(list.range.to, 'short')}. Schedule interviews from a candidate's card.`}
              action={list.hasFilters ? { label: 'Clear filters', onClick: list.clearFilters, variant: 'link' } : undefined}
            />
          </div>
        ) : (
          <>
            <div className={cx('min-h-0 flex-1 overflow-y-auto tt-scroll-hidden transition-opacity', list.isFetching && 'opacity-70')}>
              {groups.map(([date, rows]) => (
                <section key={date}>
                  <h2 className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg-subtle px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-fg-muted sm:px-5">
                    <span>{dayLabel(date, today)}</span>
                    <span className="tabular-nums">{rows.length}</span>
                  </h2>
                  <ul className="divide-y divide-line/60">
                    {rows.map((i) => (
                      <InterviewRow
                        key={i.id}
                        item={i}
                        canManage={access.canManage}
                        busy={busyId === i.id}
                        onOpen={() => setDrawerAppId(i.application.id)}
                        onReschedule={() => setReschedule(i)}
                        onCancel={() => setCancelTarget(i)}
                        onComplete={(s) => complete(i, s)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            {list.totalPages > 1 && (
              <div className="border-t border-line bg-surface px-4 py-2.5">
                <Pagination currentPage={list.page} totalPages={list.totalPages} totalItems={list.total} pageSize={list.pageSize} onPageChange={list.setPage} onPageSizeChange={list.setPageSize} pageSizeOptions={[25, 50, 100]} />
              </div>
            )}
          </>
        )}
      </div>

      <ScheduleInterviewDialog
        open={Boolean(reschedule)}
        onClose={() => setReschedule(null)}
        applicationId={reschedule?.application.id ?? 0}
        interview={reschedule}
        candidateName={reschedule?.application.candidateName}
        onDone={list.refetch}
      />
      <CancelInterviewDialog
        interviewId={cancelTarget?.id ?? null}
        label={cancelTarget ? `${cancelTarget.roundName} with ${cancelTarget.application.candidateName}` : undefined}
        onClose={() => setCancelTarget(null)}
        onDone={list.refetch}
      />
      <CandidateDrawerHost applicationId={drawerAppId} onClose={() => setDrawerAppId(null)} onChanged={list.refetch} initialTab="interviews" />
    </div>
  );
}

function InterviewRow({
  item,
  canManage,
  busy,
  onOpen,
  onReschedule,
  onCancel,
  onComplete,
}: {
  item: InterviewListItemDto;
  canManage: boolean;
  busy: boolean;
  onOpen: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onComplete: (status: 'completed' | 'no_show') => void;
}) {
  const end = Date.parse(item.scheduledAt) + item.durationMinutes * 60000;
  const where = item.mode === 'video' ? item.meetingUrl : item.location;
  return (
    <li
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen(); } }}
      className={cx('flex cursor-pointer flex-col gap-2 px-4 py-3 transition-colors hover:bg-bg-subtle/50 focus-visible:bg-bg-subtle focus-visible:outline-none sm:px-5 md:flex-row md:items-center md:gap-4', item.status === 'cancelled' && 'opacity-60')}
    >
      <div className="w-28 shrink-0 tabular-nums">
        <p className="text-sm font-bold text-fg">{formatTime(item.scheduledAt)}</p>
        <p className="text-[11px] text-fg-muted">to {formatTime(end)} · {item.durationMinutes}m</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{item.application.candidateName}</p>
        <p className="truncate text-xs text-fg-muted">{item.application.positionTitle}</p>
      </div>
      <div className="min-w-0 md:w-44">
        <p className="truncate text-xs font-semibold text-fg sm:text-sm">{item.roundName}</p>
        <Tooltip content={where || INTERVIEW_MODE_LABEL[item.mode]}>
          <span className="inline-flex max-w-full items-center gap-1 text-[11px] text-fg-muted">
            <ModeIcon mode={item.mode} className="h-3 w-3 shrink-0" />
            <span className="truncate">{INTERVIEW_MODE_LABEL[item.mode] || item.mode}</span>
          </span>
        </Tooltip>
      </div>
      <div className="flex items-center md:w-36">
        <div className="flex -space-x-1.5">
          {item.panel.slice(0, 5).map((p) => (
            <Tooltip key={p.employeeId} content={`${p.name}${p.submitted ? ' · scorecard in' : ' · awaiting scorecard'}`}>
              <span className="relative">
                <Avatar name={p.name} className="ring-2 ring-surface" />
                {Boolean(p.submitted) && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-fg text-surface ring-2 ring-surface">
                    <Check className="h-2 w-2" strokeWidth={4} />
                  </span>
                )}
              </span>
            </Tooltip>
          ))}
          {item.panel.length > 5 && <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-bg-subtle text-[10px] font-bold text-fg-muted ring-2 ring-surface">+{item.panel.length - 5}</span>}
        </div>
        <span className="ml-2 text-[11px] tabular-nums text-fg-muted">{item.panel.filter((p) => p.submitted).length}/{item.panel.length}</span>
      </div>
      <div className="flex items-center justify-between gap-2 md:w-40 md:justify-end">
        <StatusPill label={INTERVIEW_STATUS_LABEL[item.status] || item.status} tone={statusTone(item.status)} />
        {canManage && item.status === 'scheduled' && (
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <ActionMenu
              label="Interview actions"
              disabled={busy}
              triggerClassName={btn.icon}
              items={[
                { key: 'reschedule', label: 'Reschedule', icon: CalendarClock, onSelect: onReschedule },
                { key: 'done', label: 'Mark completed', icon: CheckCircle2, onSelect: () => onComplete('completed') },
                { key: 'noshow', label: 'Mark no-show', icon: UserX, onSelect: () => onComplete('no_show') },
                { key: 'd', divider: true },
                { key: 'cancel', label: 'Cancel interview', icon: XCircle, danger: true, onSelect: onCancel },
              ]}
            >
              <MoreHorizontal className="h-4 w-4" />
            </ActionMenu>
          </span>
        )}
      </div>
    </li>
  );
}

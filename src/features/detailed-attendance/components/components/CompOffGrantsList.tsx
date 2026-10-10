'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Moon,
  User,
  X,
} from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { CompOffGrant } from '../../types/detailed.model';
import { daysText, minutesText } from '../../utils/format';

interface Props {
  grants: CompOffGrant[];
  title?: string;
  defaultExpandedFirst?: boolean;
}

const REASON_CONFIG: Record<string, { label: string; icon: React.ElementType; tone: string }> = {
  night_ot: { label: 'Night Overtime', icon: Moon, tone: 'text-[var(--tt-accent)] bg-[var(--tt-accent-soft)]' },
  night_ot_leftover: { label: 'Night OT', icon: Moon, tone: 'text-[var(--tt-accent)] bg-[var(--tt-accent-soft)]' },
  week_off_work: { label: 'Week-off Work', icon: CalendarDays, tone: 'text-[var(--tt-accent)] bg-[var(--tt-accent-soft)]' },
  holiday_work: { label: 'Holiday Work', icon: CalendarDays, tone: 'text-[var(--tt-accent)] bg-[var(--tt-accent-soft)]' },
  overtime: { label: 'Overtime', icon: Clock, tone: 'text-[var(--tt-accent)] bg-[var(--tt-accent-soft)]' },
};

function stateBadge(state: string) {
  if (state === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        <Clock className="h-3 w-3 shrink-0" />
        Pending approval
      </span>
    );
  }
  if (state === 'approved' || state === 'credited') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3 shrink-0" />
        {state === 'credited' ? 'Credited' : 'Approved'}
      </span>
    );
  }
  if (state === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
        <X className="h-3 w-3 shrink-0" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle px-2 py-0.5 text-[11px] font-medium text-fg-muted">
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function formatDate(isoOrDate: string | null) {
  if (!isoOrDate) return '';
  try {
    const d = isoOrDate.includes('T') ? new Date(isoOrDate) : new Date(`${isoOrDate}T00:00:00`);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return isoOrDate;
  }
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getLevelInfo(grant: CompOffGrant) {
  if (grant.state === 'pending' && grant.approval) {
    const currentStep = grant.approval.steps[grant.approval.currentStep] || grant.approval.steps.find((s) => s.status === 'pending');
    const levelName = currentStep?.name || grant.approval.currentStepName || `Level ${grant.approval.currentStep + 1}`;
    const empName = currentStep?.assignee?.name || null;
    const empCode = currentStep?.assignee?.code ? ` (${currentStep.assignee.code})` : '';
    return {
      type: 'pending' as const,
      levelName,
      employeeName: empName ? `${empName}${empCode}` : null,
    };
  }
  if (grant.state === 'approved' || grant.state === 'credited') {
    const approvedStep = grant.approval?.steps?.filter((s) => s.status === 'approved').pop();
    const empName = approvedStep?.assignee?.name || null;
    const empCode = approvedStep?.assignee?.code ? ` (${approvedStep.assignee.code})` : '';
    return {
      type: 'approved' as const,
      levelName: approvedStep?.name || null,
      employeeName: empName ? `${empName}${empCode}` : null,
    };
  }
  if (grant.state === 'rejected') {
    const rejectedStep = grant.approval?.steps?.find((s) => s.status === 'rejected');
    const empName = rejectedStep?.assignee?.name || null;
    return {
      type: 'rejected' as const,
      levelName: rejectedStep?.name || null,
      employeeName: empName || null,
    };
  }
  return null;
}

export function CompOffGrantsList({
  grants,
  title = 'Comp-off & extra work',
  defaultExpandedFirst = false,
}: Props) {
  // Default collapsed as requested by user
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (defaultExpandedFirst && grants.length > 0) {
      const pendingOne = grants.find((g) => g.state === 'pending');
      initial.add((pendingOne || grants[0]).id);
    }
    return initial;
  });

  if (!grants || grants.length === 0) return null;

  const toggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2.5">
      {title && (
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-fg-muted">{title}</h4>
          <span className="text-[11px] font-medium text-fg-muted">
            {grants.length} {grants.length === 1 ? 'record' : 'records'}
          </span>
        </div>
      )}

      <div className="space-y-2">
        {grants.map((grant) => {
          const isExpanded = expandedIds.has(grant.id);
          const cfg = REASON_CONFIG[grant.reason] || { label: grant.reason.replace(/_/g, ' '), icon: Clock, tone: 'text-fg bg-bg-subtle' };
          const Icon = cfg.icon;
          const approval = grant.approval;
          const levelInfo = getLevelInfo(grant);
          const unitsLabel = grant.kind === 'paid'
            ? `${grant.minutes ? minutesText(grant.minutes) : 'Paid'} pay`
            : `+${daysText(grant.units)} day${grant.units === 1 ? '' : 's'}`;

          return (
            <div
              key={grant.id}
              className={cx(
                'rounded-xl border transition-all duration-150',
                isExpanded ? 'border-[var(--tt-primary)]/40 bg-surface shadow-sm' : 'border-line bg-surface/80 hover:border-line-strong'
              )}
            >
              {/* Card Header (clickable to expand/collapse) */}
              <button
                type="button"
                onClick={() => toggle(grant.id)}
                className="w-full text-left p-3 flex items-start gap-2.5 cursor-pointer select-none"
                aria-expanded={isExpanded}
              >
                <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5', cfg.tone)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0 flex-1">
                  {/* Row 1: Reason, Earned Date, and Amount */}
                  <div className="flex items-baseline justify-between gap-1.5">
                    <p className="truncate text-xs font-bold text-fg">
                      {cfg.label}
                      <span className="ml-1 text-[11px] font-medium text-fg-muted">
                        · {formatDate(grant.workDate)}
                      </span>
                    </p>
                    <span className="shrink-0 text-xs font-extrabold tabular-nums text-fg">{unitsLabel}</span>
                  </div>

                  {/* Row 2: For what (exact work details) */}
                  <p className="mt-1 text-xs text-fg-muted line-clamp-2 leading-relaxed">
                    {grant.description || `Extra work on ${formatDate(grant.workDate)}`}
                  </p>

                  {/* Row 3: Status badge & Current Level on which Employee Name */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {stateBadge(grant.state)}

                    {levelInfo && levelInfo.type === 'pending' && (
                      <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                        <User className="h-3 w-3 shrink-0 opacity-80" />
                        <span>
                          <span className="text-fg-muted">{levelInfo.levelName}: </span>
                          <span className="font-semibold text-fg">{levelInfo.employeeName || 'Awaiting'}</span>
                        </span>
                      </span>
                    )}

                    {levelInfo && levelInfo.type === 'approved' && levelInfo.employeeName && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-fg-muted">
                        <span>Approved by</span>
                        <strong className="font-semibold text-fg">{levelInfo.employeeName}</strong>
                      </span>
                    )}

                    {grant.expiresOn && (
                      <span className="text-[10px] text-fg-subtle">
                        Expires {formatDate(grant.expiresOn)}
                      </span>
                    )}
                  </div>
                </div>

                <span className="mt-0.5 shrink-0 text-fg-muted transition-transform">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>

              {/* Expanded Details & Approval Timeline */}
              {isExpanded && (
                <div className="border-t border-line/60 bg-bg-subtle/40 p-3.5 space-y-3.5">
                  {/* Detailed work reason breakdown */}
                  <div className="rounded-lg border border-line bg-surface/60 p-3 text-xs space-y-1.5">
                    <p className="font-bold text-fg">Work & Calculation Breakdown</p>
                    <div className="grid grid-cols-2 gap-2 text-fg-muted pt-1">
                      <div>
                        <span className="text-fg-subtle">Earned on date:</span> <span className="font-medium text-fg">{formatDate(grant.workDate)}</span>
                      </div>
                      <div>
                        <span className="text-fg-subtle">Compensation type:</span> <span className="font-medium text-fg">{grant.kind === 'paid' ? 'Paid in salary' : 'Comp-off leave'}</span>
                      </div>
                      {grant.details?.workedFrom && grant.details?.workedTo && (
                        <div className="col-span-2">
                          <span className="text-fg-subtle">Recorded hours:</span>{' '}
                          <span className="font-medium text-fg">{grant.details.workedFrom} – {grant.details.workedTo}</span>
                          {grant.details.durationText && <span className="font-semibold text-fg"> ({grant.details.durationText})</span>}
                        </div>
                      )}
                      {grant.details?.holidayName && (
                        <div className="col-span-2">
                          <span className="text-fg-subtle">Holiday name:</span>{' '}
                          <span className="font-medium text-fg">{grant.details.holidayName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Approval Timeline */}
                  <div>
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-fg-muted">
                      Approval Timeline & History
                    </h5>

                    {approval && approval.steps.length > 0 ? (
                      <ol className="relative ml-2 space-y-3 border-l border-line pl-4 text-xs">
                        {approval.steps.map((step) => {
                          const isDone = step.status === 'approved';
                          const isCurrent = step.status === 'pending';
                          const isRejected = step.status === 'rejected';

                          return (
                            <li key={step.index} className="relative">
                              {/* Step circle */}
                              <span
                                className={cx(
                                  'absolute -left-[25px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px]',
                                  isDone && 'bg-emerald-500 text-white',
                                  isCurrent && 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse',
                                  isRejected && 'bg-rose-500 text-white',
                                  !isDone && !isCurrent && !isRejected && 'border border-line bg-surface text-fg-muted'
                                )}
                              >
                                {isDone && <Check className="h-3 w-3" />}
                                {isCurrent && <Clock className="h-3 w-3" />}
                                {isRejected && <X className="h-3 w-3" />}
                                {!isDone && !isCurrent && !isRejected && step.index + 1}
                              </span>

                              <div>
                                <div className="flex flex-wrap items-baseline gap-1.5">
                                  <span className="font-bold text-fg">{step.name}</span>
                                  {isCurrent && (
                                    <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                      Current Step (Action required)
                                    </span>
                                  )}
                                  {isDone && (
                                    <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                      Approved
                                    </span>
                                  )}
                                  {isRejected && (
                                    <span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                      Rejected
                                    </span>
                                  )}
                                </div>

                                {step.assignee && (
                                  <p className="mt-0.5 text-fg-muted">
                                    {isDone ? 'Approved by' : isCurrent ? 'Waiting for approval from' : 'Assigned to'}:{' '}
                                    <span className="font-bold text-fg">{step.assignee.name}</span>
                                    {step.assignee.code && <span className="text-fg-subtle"> ({step.assignee.code})</span>}
                                  </p>
                                )}

                                {step.actedAt && (
                                  <p className="mt-0.5 text-[11px] text-fg-subtle">
                                    {formatDate(step.actedAt)} at {formatTime(step.actedAt)}
                                  </p>
                                )}

                                {step.note && (
                                  <p className="mt-1 rounded bg-surface border border-line p-1.5 text-xs text-fg-muted italic">
                                    &ldquo;{step.note}&rdquo;
                                  </p>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface/50 p-2.5 text-xs text-fg-muted">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Direct credit: granted automatically by attendance policy rules without manual approval.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { inr } from '@/features/compensation/utils/format';
import { formatDate } from '@/lib/datetime';
import * as api from '../api/exits.api';
import { REASON_LABEL, TYPE_LABEL } from '../constants/exits.constants';
import { useLoad } from '../hooks/useLoad';
import type { CareerStint, ReasonCategory } from '../types/exits';
import { Card, Fact, Skeleton, TonePill } from './parts';

function Stint({ s, currentId, href }: { s: CareerStint; currentId: number; href: (id: number) => string }) {
  const jobs = s.jobHistory ?? s.job_history ?? [];
  const sal = s.salary ?? s.salary_summary ?? null;
  const left = Boolean(s.left_on);
  return (
    <li className="relative">
      <span className="absolute -left-[1.4rem] top-4 h-2.5 w-2.5 rounded-full bg-[var(--tt-primary)] ring-4 ring-[var(--tt-bg)]" />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-fg">
            {formatDate(s.joined_on)} to {left ? formatDate(s.left_on) : 'present'}
            {s.employee_id === currentId && <span className="ml-2 text-xs font-medium text-fg-muted">this record</span>}
          </p>
          <TonePill label={left ? (s.exit_type ? TYPE_LABEL[s.exit_type] : s.status) : 'Current'} tone={left ? 'neutral' : 'success'} />
        </div>
        <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Fact label="Employee code" value={s.employee_id === currentId ? s.employee_code : <Link className="underline" href={href(s.employee_id)}>{s.employee_code || `#${s.employee_id}`}</Link>} />
          {left && <Fact label="Exit reason" value={s.exit_reason ? (REASON_LABEL[s.exit_reason as ReasonCategory] || s.exit_reason) : null} />}
          {sal && <Fact label="CTC" value={sal.first_ctc != null && sal.last_ctc != null && sal.first_ctc !== sal.last_ctc ? `${inr(sal.first_ctc)} to ${inr(sal.last_ctc)}` : inr(sal.last_ctc ?? sal.first_ctc)} />}
          {sal?.revisions != null && <Fact label="Salary revisions" value={String(sal.revisions)} />}
        </dl>
        {jobs.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
            {jobs.map((j, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                <span className="w-28 shrink-0 text-xs text-fg-muted">{formatDate(j.effective_on)}</span>
                <span className="min-w-0 break-words text-fg">{j.summary || [j.event_type?.replace(/_/g, ' '), j.designation, j.department].filter(Boolean).join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </li>
  );
}

/** Every stint of one person across rejoins, oldest first, each with a job and salary summary. */
export function CareerTab({ employeeId, detailHref }: { employeeId: number; detailHref: (id: number) => string }) {
  const q = useLoad(() => api.career(employeeId), [employeeId]);
  if (q.error) return <Alert message={q.error} />;
  if (q.loading && !q.data) return <div className="space-y-3"><Skeleton className="h-28" /><Skeleton className="h-28" /></div>;
  const stints = [...(q.data ?? [])].sort((a, b) => (a.joined_on || '').localeCompare(b.joined_on || ''));
  if (stints.length === 0) return <Card><EmptyState compact title="No career history yet" description="Stints appear here once the employee has joined." /></Card>;
  return (
    <div className="mx-auto max-w-4xl">
      {stints.length > 1 && <p className="mb-3 text-sm text-fg-muted">{stints.length} stints, this person has rejoined {stints.length - 1} {stints.length === 2 ? 'time' : 'times'}.</p>}
      <ol className="space-y-3 border-l border-line pl-5">
        {stints.map((s) => <Stint key={s.employee_id} s={s} currentId={employeeId} href={detailHref} />)}
      </ol>
    </div>
  );
}

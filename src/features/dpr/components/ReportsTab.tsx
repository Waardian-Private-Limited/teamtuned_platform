'use client';

import React from 'react';
import Link from 'next/link';
import { cx } from '@/theme/tokens';
import { formatDate } from '@/lib/datetime';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Card } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { CalendarDay, ReportKind } from '../api/dpr.api';
import { DAYS, MonthNav, n1, Tag } from './parts';

const STATUS: Record<CalendarDay['status'], { label: string; tone: 'done' | 'wait' | 'late' | 'plain' }> = {
  submitted: { label: 'Filed', tone: 'done' }, draft: { label: 'Draft', tone: 'wait' }, missing: { label: 'Missing', tone: 'late' }, future: { label: '', tone: 'plain' }, none: { label: '', tone: 'plain' },
};

/** The month as a calendar: which days were filed, which are drafts and which are missing. A day opens its report. */
export function ReportsTab({ siteId, basePath, month, onMonth }: { siteId: number; basePath: string; month: string; onMonth: (m: string) => void }) {
  const [kind, setKind] = React.useState<ReportKind>('progress');
  const { data, error } = useAsync(() => api.calendar(siteId, month, kind), [siteId, month, kind]);
  if (error) return <p className="text-sm text-[var(--tt-danger)]">{error}</p>;
  if (!data) return <div className="rounded-xl border border-line bg-surface p-4"><TableSkeleton rows={5} columns={7} /></div>;
  const lead = (new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const link = (d: CalendarDay) => `${basePath}/daily/${siteId}/${d.date}?kind=${kind}`;
  const open = (d: CalendarDay) => d.can_write || Boolean(d.report_id);

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav month={data.month} onChange={onMonth} max={data.today.slice(0, 7)} />
          {data.billing_enabled && <SegmentedControl fitText value={kind} onChange={setKind} options={[{ value: 'progress', label: 'Progress' }, { value: 'billing', label: 'Billing' }]} />}
        </div>
        <p className="text-xs text-fg-muted"><b className="text-fg">{data.summary.filed}</b> of {data.summary.expected} expected days filed{data.summary.drafts ? ` · ${data.summary.drafts} draft` : ''}</p>
      </div>
      {!data.planned && <p className="rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-fg-muted">{data.label} has no plan. Reports open once the month is planned.</p>}
      <Card title={data.label} note={kind === 'progress' ? 'Progress report' : 'Billing report'}>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-fg-muted sm:gap-1.5 sm:text-[11px]">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: lead }).map((_, i) => <span key={`b${i}`} />)}
          {data.days.map((d) => {
            const s = STATUS[d.status];
            const body = (
              <>
                <span className={cx('text-xs font-bold sm:text-sm', d.date === data.today && 'underline underline-offset-2')}>{Number(d.date.slice(8))}</span>
                <span className="hidden sm:block">{s.label && <Tag tone={s.tone}>{s.label}</Tag>}</span>
                <span className={cx('mx-auto h-1.5 w-1.5 rounded-full sm:hidden', s.tone === 'done' ? 'bg-[var(--tt-primary)]' : s.tone === 'late' ? 'bg-[var(--tt-danger)]' : s.tone === 'wait' ? 'bg-fg-subtle' : 'bg-transparent')} />
                {kind === 'progress' && d.concrete_m3 ? <span className="hidden text-[11px] tabular-nums text-fg-muted sm:block">{n1(d.concrete_m3)} m³</span> : null}
              </>
            );
            const cls = cx('flex min-h-[3.25rem] flex-col items-center justify-start gap-1 rounded-lg border p-1 sm:min-h-[5.25rem] sm:items-start sm:p-2', d.expected ? 'border-line bg-surface' : 'border-line/50 bg-bg-subtle/60', open(d) && 'transition-colors hover:border-[var(--tt-primary)]');
            const title = `${formatDate(d.date, 'weekday')}${s.label ? ` · ${s.label}` : ''}${d.filled_by_name ? ` · ${d.filled_by_name}` : ''}${d.edit_count ? ` · corrected ${d.edit_count}×` : ''}`;
            return open(d) ? <Link key={d.date} href={link(d)} title={title} className={cls}>{body}</Link> : <div key={d.date} title={title} className={cx(cls, 'opacity-80')}>{body}</div>;
          })}
        </div>
        <p className="text-[11px] text-fg-muted">Shaded days are off days. A reporter fills today or yesterday; a filed report can be corrected until the end of the next day.</p>
      </Card>
    </div>
  );
}

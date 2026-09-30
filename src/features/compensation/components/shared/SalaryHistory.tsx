'use client';

import React from 'react';
import { ArrowRight, FileText, Gift, TrendingUp } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { HistoryDto } from '../../types/compensation.dto';
import { date, inr, month, pct } from '../../utils/format';
import { StatusBadge } from './StatusBadge';
import { Stat } from './Panel';

type Item =
  | { kind: 'revision'; key: string; on: string; data: HistoryDto['revisions'][number] }
  | { kind: 'payout'; key: string; on: string; data: HistoryDto['payouts'][number] };

export function SalaryHistory({ history, compact = false, onLetter }: { history: HistoryDto; compact?: boolean; onLetter?: (revisionId: number) => void }) {
  const items: Item[] = [
    ...history.revisions.map((r) => ({ kind: 'revision' as const, key: `r${r.id}`, on: r.effective_from, data: r })),
    ...history.payouts.map((p) => ({ kind: 'payout' as const, key: `p${p.id}`, on: `${p.payout_month}-01`, data: p })),
  ].sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));

  return (
    <div className="space-y-4">
      <div className={cx('grid gap-2.5', compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4')}>
        <Stat label="Current CTC" value={inr(history.current.ctc)} hint={`${inr(history.current.monthly_gross)} / month gross`} />
        <Stat label="Growth since first record" value={pct(history.stats.growth_percent)} hint={`${history.stats.revisions} revision${history.stats.revisions === 1 ? '' : 's'}`} />
        <Stat label="Last revision" value={date(history.stats.last_revision_on)} />
        <Stat label="One-time paid" value={inr(history.stats.one_time_total)} hint="Bonus, arrears, awards" />
      </div>

      {history.current.breakdown.length > 0 && (
        <div className="rounded-lg border border-line p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Current monthly structure</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
            {history.current.breakdown.map((b) => (
              <div key={b.component_id} className="flex justify-between gap-2 text-xs sm:text-sm">
                <span className="truncate text-fg-muted">{b.name}</span>
                <span className="font-semibold text-fg">{inr(b.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ol className="relative space-y-3 border-l border-line pl-5">
        {items.length === 0 && <li className="text-xs text-fg-muted">No salary changes recorded yet.</li>}
        {items.map((it) => (
          <li key={it.key} className="relative">
            <span className="absolute -left-[27px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-line bg-surface">
              <span className={cx('h-1.5 w-1.5 rounded-full', it.kind === 'revision' ? 'bg-[var(--tt-primary)]' : 'bg-fg-subtle')} />
            </span>
            {it.kind === 'revision' ? (
              <div className="rounded-lg border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {it.data.revision_type_label}
                    {it.data.change_percent !== null && <span className="text-xs font-semibold text-fg-muted">{pct(it.data.change_percent)}</span>}
                  </p>
                  <StatusBadge status={it.data.status} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
                  {it.data.previous_ctc !== null ? inr(it.data.previous_ctc) : 'New'}
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-semibold text-fg">{inr(it.data.new_ctc)}</span>
                  <span>CTC · effective {date(it.data.effective_from)}</span>
                </p>
                {(it.data.new_designation || it.data.new_role_name) && it.data.revision_type !== 'joining' && (
                  <p className="mt-1 text-xs text-fg-muted">
                    {it.data.previous_designation || '—'} <ArrowRight className="inline h-3 w-3" /> <span className="font-semibold text-fg">{it.data.new_designation || it.data.new_role_name}</span>
                  </p>
                )}
                {it.data.arrears_amount ? <p className="mt-1 text-xs text-fg-muted">Arrears {inr(it.data.arrears_amount)}</p> : null}
                {it.data.reason && <p className="mt-1 text-xs text-fg-muted">{it.data.reason}</p>}
                {onLetter && it.data.revision_type !== 'joining' && ['approved', 'applied'].includes(it.data.status) && (
                  <button type="button" onClick={() => onLetter(it.data.id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
                    <FileText className="h-3.5 w-3.5" /> View letter
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg">
                    <Gift className="h-3.5 w-3.5 shrink-0" />
                    {it.data.title}
                  </p>
                  <p className="text-xs text-fg-muted">{it.data.payout_type_label} · {month(it.data.payout_month)}</p>
                </div>
                <div className="text-right">
                  <p className={cx('text-sm font-bold', it.data.amount < 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{inr(it.data.amount)}</p>
                  <StatusBadge status={it.data.status} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

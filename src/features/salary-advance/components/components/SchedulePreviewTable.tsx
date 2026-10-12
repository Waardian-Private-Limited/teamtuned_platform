'use client';

import { cx } from '@/theme/tokens';
import type { SchedulePreview } from '../../types/salaryAdvance.model';
import { money, monthLabel } from '../../utils/format';
import { Block } from './StatusBadges';

export function SchedulePreviewTable({ preview, loading, note }: { preview: SchedulePreview | null; loading: boolean; note?: string }) {
  if (!preview && loading) {
    return (
      <div className="space-y-2 rounded-xl border border-line p-3.5">
        <Block className="h-4 w-1/3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Block key={i} className="h-7 w-full" />
        ))}
      </div>
    );
  }
  if (!preview || !preview.schedule.length) return null;
  const hasInterest = preview.interestAmount > 0;
  return (
    <div className={cx('overflow-hidden rounded-xl border border-line transition-opacity duration-200', loading ? 'opacity-60' : 'opacity-100')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line bg-bg-subtle/60 px-3.5 py-2.5">
        <span className="text-xs font-semibold text-fg sm:text-sm">Repayment schedule</span>
        <span className="text-[11px] text-fg-muted sm:text-xs">
          Total <strong className="font-semibold tabular-nums text-fg">{money(preview.totalRepayable)}</strong>
          {hasInterest && <> · interest {money(preview.interestAmount)}</>}
        </span>
      </div>
      <div className="max-h-56 overflow-y-auto tt-scroll-hidden">
        <table className="w-full text-xs sm:text-sm">
          <tbody>
            {preview.schedule.map((row) => (
              <tr key={row.key} className="border-b border-line/60 last:border-b-0">
                <td className="px-3.5 py-2 text-fg-muted tabular-nums">{row.seq}</td>
                <td className="py-2 text-fg">{monthLabel(row.month, 'short')}</td>
                {hasInterest && <td className="py-2 text-right text-[11px] tabular-nums text-fg-muted">{money(row.principal)} + {money(row.interest)}</td>}
                <td className="px-3.5 py-2 text-right font-semibold tabular-nums text-fg">{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(note || preview.errors.length > 0) && (
        <div className="border-t border-line px-3.5 py-2">
          {preview.errors.map((e) => (
            <p key={e} className="text-xs font-medium text-[var(--tt-danger)]">{e}</p>
          ))}
          {note && <p className="text-[11px] text-fg-muted">{note}</p>}
        </div>
      )}
    </div>
  );
}

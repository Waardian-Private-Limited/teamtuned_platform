'use client';

import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { cx } from '@/theme/tokens';
import { BOARDS, clockText, dayText, leaderValueText, minutesText, PAGE_SIZE, PERIOD_LABEL } from '../constants/dashboard.constants';
import type { LeaderBoardKey, LeaderBoardPageDto, LeaderPeriod } from '../types/dashboard.dto';
import { Avatar } from './Avatar';

const th = 'px-2 pb-2 whitespace-nowrap';
const td = 'px-2 py-2.5 text-right tabular-nums text-fg';

/** One leaderboard's full ranking as a table, a page at a time. */
export function LeaderboardDialog({ board, period, data, page, onPage, loading, onClose }: {
  board: LeaderBoardKey | null; period: LeaderPeriod; data: LeaderBoardPageDto | null; page: number; onPage: (p: number) => void; loading: boolean; onClose: () => void;
}) {
  if (!board) return null;
  const meta = BOARDS[board];
  const rows = data?.entries ?? [];
  const range = data ? (data.from === data.to ? dayText(data.to) : `${dayText(data.from)} – ${dayText(data.to)}`) : '';
  const single = period === 'day';

  return (
    <Dialog open onClose={onClose} maxWidthClassName="max-w-5xl" title={
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-fg">{meta.title} · {single ? 'Day' : PERIOD_LABEL[period]}</h2>
        <p className="text-xs text-fg-muted">{meta.measure(period)}{range ? ` · ${range}` : ''}{data ? ` · ${data.total} ranked` : ''}</p>
      </div>
    }>
      {loading && !data ? <TableSkeleton rows={8} columns={6} /> : rows.length === 0 ? (
        <EmptyState illustration={{ src: '/vectors/attendancedashboard.svg', width: 220, height: 160, alt: 'No one ranked' }}
          title="No one to rank yet" description="Pick another period or date, or widen the filters on the dashboard." />
      ) : (
        <div className={cx('transition-opacity', loading && 'opacity-60')}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wide text-fg-muted">
                  <th className={cx(th, 'w-10 text-center')}>#</th>
                  <th className={th}>Employee</th>
                  <th className={cx(th, 'text-right')}>{meta.measure(period)}</th>
                  {!single && <th className={cx(th, 'text-right')}>Present</th>}
                  {!single && <th className={cx(th, 'text-right')}>On time</th>}
                  <th className={cx(th, 'text-right')}>{single ? 'Late by' : 'Late days'}</th>
                  <th className={cx(th, 'text-right')}>{single ? 'Check-in' : 'Avg check-in'}</th>
                  <th className={cx(th, 'text-right')}>Worked</th>
                  <th className={cx(th, 'text-right')}>Overtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-bg-subtle/60">
                    <td className="px-2 py-2.5 text-center text-xs font-extrabold tabular-nums text-fg-muted">{e.rank}</td>
                    <td className="px-2 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar src={e.photo_url} />
                        <div className="min-w-0">
                          <p className="truncate font-bold text-fg">{e.name || '—'}</p>
                          <p className="truncate text-xs text-fg-muted">{[e.employee_code, e.department].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cx(td, 'font-bold')}>{leaderValueText(e)}</td>
                    {!single && <td className={td}>{e.stats.present_days}</td>}
                    {!single && <td className={td}>{e.stats.on_time_days}</td>}
                    <td className={cx(td, e.stats.late_days ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
                      {single ? (e.stats.late_days ? minutesText(e.stats.late_minutes) : '—') : e.stats.late_days}
                    </td>
                    <td className={td}>{clockText(e.stats.average_arrival)}</td>
                    <td className={td}>{e.stats.worked_minutes ? minutesText(e.stats.worked_minutes) : '—'}</td>
                    <td className={td}>{e.stats.overtime_minutes ? minutesText(e.stats.overtime_minutes) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE))} totalItems={data?.total ?? 0} pageSize={PAGE_SIZE} onPageChange={onPage} pageSizeOptions={[PAGE_SIZE]} />
          </div>
        </div>
      )}
    </Dialog>
  );
}

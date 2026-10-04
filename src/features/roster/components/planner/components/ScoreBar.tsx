'use client';

import { cx } from '@/theme/tokens';
import type { RosterSummary } from '../../../types/roster.types';
import { hoursLabel } from '../../../utils/rosterTime';

interface Tile {
  label: string;
  value: string;
  sub?: string;
  danger?: boolean;
  onClick?: () => void;
}

function TileView({ t }: { t: Tile }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{t.label}</p>
      <p className={cx('mt-0.5 text-xl font-bold leading-tight', t.danger ? 'text-[var(--tt-danger)]' : 'text-fg')}>{t.value}</p>
      {t.sub && <p className="truncate text-[11px] text-fg-muted">{t.sub}</p>}
    </>
  );
  const cls = 'min-w-0 rounded-xl border border-line bg-surface px-3 py-2 text-left';
  return t.onClick ? (
    <button type="button" onClick={t.onClick} className={cx(cls, 'transition-colors hover:bg-bg-subtle')}>{body}</button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function ScoreBar({ summary, issues, onIssues }: { summary: RosterSummary | null; issues: number; onIssues: () => void }) {
  const dash = '—';
  const tiles: Tile[] = [
    {
      label: 'Coverage',
      value: summary ? `${summary.coverage.percent}%` : dash,
      sub: summary ? `${summary.coverage.filled} of ${summary.coverage.required} slots filled` : 'Not scored yet',
      danger: Boolean(summary && summary.coverage.percent < 100 && summary.coverage.required > 0),
    },
    { label: 'Fairness', value: summary ? `${summary.fairness}` : dash, sub: summary ? 'out of 100' : undefined },
    { label: 'Overtime', value: summary ? hoursLabel(summary.overtimeMinutes) : dash, sub: summary ? 'planned this period' : undefined },
    {
      label: 'Preferences',
      value: summary && summary.preferenceHitRate !== null ? `${summary.preferenceHitRate}%` : dash,
      sub: summary && summary.preferenceHitRate !== null ? 'requests honoured' : 'No requests',
    },
    { label: 'Issues', value: summary || issues ? `${issues}` : dash, sub: issues ? 'tap to review' : 'All clear', danger: issues > 0, onClick: onIssues },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t, i) => (
        <div key={t.label} className={i === 4 ? 'col-span-2 sm:col-span-1' : ''}><TileView t={t} /></div>
      ))}
    </div>
  );
}

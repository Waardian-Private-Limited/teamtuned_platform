import { cx } from '@/theme/tokens';
import { POSITION_STATUS_LABELS } from '../constants/recruitment.constants';
import type { PositionStatus } from '../types/recruitment.model';

const TONES: Record<PositionStatus, string> = {
  open: 'border-fg bg-fg text-fg-inverted',
  draft: 'border-dashed border-line-strong bg-surface text-fg-muted',
  paused: 'border-line bg-bg-subtle text-fg',
  closed: 'border-line bg-bg-subtle text-fg-muted',
  filled: 'border-fg bg-surface text-fg',
};

export function PositionStatusPill({ status, className }: { status: PositionStatus; className?: string }) {
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center rounded-md border px-2 text-[11px] font-semibold', TONES[status], className)}>
      {POSITION_STATUS_LABELS[status]}
    </span>
  );
}

export function PublishedBadge({ published }: { published: boolean }) {
  if (!published) return null;
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-fg">
      <span className="h-1.5 w-1.5 rounded-full bg-fg" />
      On careers
    </span>
  );
}

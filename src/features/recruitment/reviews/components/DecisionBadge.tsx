import { cx } from '@/theme/tokens';
import type { ReviewDto } from '../types/reviews.dto';
import { DECISION_LABEL } from '../types/reviews.dto';

/** Monochrome: offer = filled, do not hire = outlined, hold / pending = muted. */
export function DecisionBadge({ review }: { review: Pick<ReviewDto, 'status' | 'decision' | 'hidden'> }) {
  const label = review.status === 'cancelled' ? 'Cancelled'
    : review.hidden ? 'Decided'
    : review.decision ? DECISION_LABEL[review.decision]
    : 'Waiting';
  return (
    <span className={cx(
      'shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-bold',
      review.decision === 'offer' && !review.hidden ? 'border-fg bg-fg text-[var(--tt-on-primary)]'
        : review.decision === 'reject' && !review.hidden ? 'border-fg text-fg'
        : 'border-line bg-bg-subtle text-fg-muted'
    )}>
      {label}
    </span>
  );
}

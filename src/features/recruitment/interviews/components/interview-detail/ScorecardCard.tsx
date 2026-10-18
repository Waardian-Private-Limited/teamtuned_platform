import { cx } from '@/theme/tokens';
import { RatingStars } from '../../../shared/components/RatingStars';
import { CriteriaRatingsList } from '../../../shared/components/CriteriaRatings';
import type { InterviewPanelistDto } from '../../types/interviews.dto';
import { RECOMMENDATION_LABEL } from '../../constants/interviews.constants';
import { Avatar } from '../../lib/EmployeePickers';

/** One panelist's scorecard: recommendation, stars, criteria and notes ("Awaiting" until submitted). */
export function ScorecardCard({ card, criteria, className }: { card: InterviewPanelistDto; criteria?: string[]; className?: string }) {
  const done = Boolean(card.submitted || card.submittedAt);
  const positive = card.recommendation === 'yes' || card.recommendation === 'strong_yes';
  return (
    <div className={cx('rounded-xl border border-line p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={card.name} />
          <span className="truncate text-sm font-semibold text-fg">{card.name}</span>
        </span>
        {done ? (
          <span className={cx('shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-bold', positive ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-fg text-fg')}>
            {RECOMMENDATION_LABEL[card.recommendation || ''] || '—'}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] text-fg-muted">Awaiting</span>
        )}
      </div>
      {done && (
        <div className="mt-2 space-y-1.5">
          <RatingStars value={card.rating ?? null} size="sm" />
          <CriteriaRatingsList ratings={card.criteriaRatings} criteria={criteria} className="pt-0.5" />
          {card.notes && <p className="whitespace-pre-wrap break-words pt-1 text-xs leading-relaxed text-fg-muted">{card.notes}</p>}
        </div>
      )}
    </div>
  );
}

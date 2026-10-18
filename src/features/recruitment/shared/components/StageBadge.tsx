import { cx } from '@/theme/tokens';
import { STAGES, STAGE_LABELS, APPLICATION_STATUS_LABELS } from '../constants/recruitment.constants';
import type { ApplicationStatus, Stage } from '../types/recruitment.model';

interface StageBadgeProps {
  stage: Stage;
  /** When rejected/withdrawn the outcome is shown instead of the stage. */
  status?: ApplicationStatus;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Monochrome stage pill. A five-step meter inside the pill shows how far along
 * the pipeline the stage is, so stages read apart without colour.
 */
export function StageBadge({ stage, status = 'active', size = 'sm', className }: StageBadgeProps) {
  const ended = status === 'rejected' || status === 'withdrawn';
  const hired = status === 'hired' || stage === 'hired';
  const label = ended ? APPLICATION_STATUS_LABELS[status] : hired ? STAGE_LABELS.hired : STAGE_LABELS[stage];
  const step = STAGES.indexOf(stage);

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border font-semibold',
        size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-xs',
        hired
          ? 'border-fg bg-fg text-fg-inverted'
          : ended
            ? 'border-line bg-bg-subtle text-fg-muted line-through decoration-fg-muted/60'
            : 'border-line bg-surface text-fg',
        className
      )}
      title={ended ? `${label} at ${STAGE_LABELS[stage]}` : label}
    >
      {!hired && !ended && (
        <span aria-hidden className="flex items-center gap-[2px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cx('h-2 w-[3px] rounded-[1px]', i <= step ? 'bg-fg' : 'bg-line-strong')} />
          ))}
        </span>
      )}
      {label}
    </span>
  );
}

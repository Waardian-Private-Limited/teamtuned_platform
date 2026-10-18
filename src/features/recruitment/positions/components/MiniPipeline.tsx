import { Tooltip } from '@/components/ui/Tooltip';
import { cx } from '@/theme/tokens';
import { MOVABLE_STAGES, STAGE_LABELS } from '../../shared/constants/recruitment.constants';
import type { StageCounts } from '../../shared/types/recruitment.model';

/** Five compact per-stage counts (applied → offer); zero counts fade. */
export function MiniPipeline({ counts }: { counts: StageCounts }) {
  const summary = MOVABLE_STAGES.map((s) => `${STAGE_LABELS[s]} ${counts[s]}`).join(' · ') + ` · Hired ${counts.hired} · Rejected ${counts.rejected}`;
  return (
    <Tooltip content={summary}>
      <span className="inline-flex items-center gap-0.5" aria-label={summary}>
        {MOVABLE_STAGES.map((s) => (
          <span
            key={s}
            className={cx(
              'inline-flex h-6 min-w-[26px] items-center justify-center rounded border px-1 text-[11px] font-semibold tabular-nums',
              counts[s] ? 'border-line-strong bg-surface text-fg' : 'border-line bg-bg-subtle text-fg-subtle'
            )}
          >
            {counts[s]}
          </span>
        ))}
      </span>
    </Tooltip>
  );
}

export function MiniPipelineLegend() {
  return (
    <span className="inline-flex gap-0.5">
      {MOVABLE_STAGES.map((s) => (
        <span key={s} className="inline-flex min-w-[26px] justify-center">{STAGE_LABELS[s].slice(0, s === 'assessment' ? 3 : 2)}</span>
      ))}
    </span>
  );
}

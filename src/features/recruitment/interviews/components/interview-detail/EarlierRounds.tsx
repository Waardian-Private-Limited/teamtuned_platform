import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { CriteriaAverages } from '../../../shared/components/CriteriaRatings';
import type { EarlierRoundDto } from '../../types/interviews.dto';
import { INTERVIEW_MODE_LABEL, INTERVIEW_STATUS_LABEL, RECOMMENDATION_LABEL } from '../../constants/interviews.constants';
import { ModeIcon } from '../InterviewsPage';
import { DetailEmpty } from './DetailEmpty';
import { ScorecardCard } from './ScorecardCard';

/** Earlier rounds of this application, newest first, each with its submitted scorecards. */
export function EarlierRounds({ rounds, hidden }: { rounds: EarlierRoundDto[]; hidden: string | null }) {
  if (hidden) return <DetailEmpty title="Earlier rounds are not shared" description={hidden} />;
  if (!rounds.length) {
    return <DetailEmpty title="No earlier rounds" description="This is the candidate's first interview for this position." />;
  }
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {rounds.map((r) => (
        <li key={r.id} className="relative">
          <span aria-hidden="true" className="absolute -left-[26px] top-4 h-2.5 w-2.5 rounded-full border-2 border-surface bg-fg" />
          <article className="rounded-xl border border-line bg-surface">
            <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-fg">{r.roundName}</h3>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs tabular-nums text-fg-muted">
                  <span>{formatDateTime(r.scheduledAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1"><ModeIcon mode={r.mode} className="h-3 w-3" />{INTERVIEW_MODE_LABEL[r.mode] || r.mode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{r.durationMinutes} min</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {r.feedback.recommendation && (
                  <span className={cx(
                    'rounded border px-1.5 py-0.5 text-[11px] font-bold',
                    r.feedback.recommendation === 'yes' || r.feedback.recommendation === 'strong_yes' ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-fg text-fg'
                  )}>
                    Panel: {RECOMMENDATION_LABEL[r.feedback.recommendation]}
                  </span>
                )}
                <span className="rounded border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] font-semibold text-fg-muted">
                  {INTERVIEW_STATUS_LABEL[r.status] || r.status}
                </span>
              </div>
            </header>
            <div className="space-y-3 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                {r.feedback.submitted} of {r.feedback.total} scorecard{r.feedback.total === 1 ? '' : 's'} submitted
              </p>
              <CriteriaAverages averages={r.feedback.criteria} />
              {r.scorecards.length === 0 ? (
                <p className="text-xs text-fg-muted">No feedback was submitted for this round.</p>
              ) : (
                <div className="grid gap-2.5 xl:grid-cols-2">
                  {r.scorecards.map((c) => <ScorecardCard key={c.employeeId} card={c} criteria={r.criteria} />)}
                </div>
              )}
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}

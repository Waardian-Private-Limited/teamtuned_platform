import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import { TEST_RESULT_LABELS } from '../../../shared/constants/recruitment.constants';
import type { SharedTestDto } from '../../types/interviews.dto';
import { DetailEmpty } from './DetailEmpty';

/**
 * The candidate's submitted tests: name, score %, result, when. Whether panelists see them comes
 * from the scorecard settings (`hidden` explains why not); the answers, integrity report and AI
 * review stay with HR.
 */
export function TestResults({ tests, hidden }: { tests: SharedTestDto[]; hidden: string | null }) {
  if (hidden) return <DetailEmpty title="Test results are not shared" description={hidden} />;
  if (!tests.length) {
    return <DetailEmpty title="No submitted tests" description="The candidate has not submitted any assessment for this position yet." />;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {tests.map((t) => {
        const pct = t.scorePercent === null ? null : Math.round(t.scorePercent);
        return (
          <li key={t.id} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-fg">{t.testName || 'Test'}</p>
                {t.submittedAt && <p className="mt-0.5 text-[11px] tabular-nums text-fg-muted">Submitted {formatDateTime(t.submittedAt)}</p>}
              </div>
              {t.result && (
                <span className={cx(
                  'shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-bold',
                  t.result === 'passed' ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : t.result === 'failed' ? 'border-fg text-fg' : 'border-line text-fg-muted'
                )}>
                  {TEST_RESULT_LABELS[t.result] || t.result}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-3xl font-bold tabular-nums tracking-tight text-fg">{pct === null ? '—' : `${pct}%`}</p>
              <span className="text-[11px] text-fg-muted">score</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-subtle" aria-hidden="true">
              <div className="h-full rounded-full bg-fg" style={{ width: `${pct ?? 0}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

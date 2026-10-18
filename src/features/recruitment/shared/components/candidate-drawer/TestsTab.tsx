import { Send } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';
import { TEST_RESULT_LABELS, TEST_STATUS_LABELS } from '../../constants/recruitment.constants';
import type { ApplicationTest } from '../../types/recruitment.model';
import { Chip, EmptyTab, SmallButton } from './parts';

const RISK: Record<'low' | 'medium' | 'high', { label: string; color: string }> = {
  low: { label: 'Low risk', color: 'var(--tt-success)' },
  medium: { label: 'Medium risk', color: 'var(--tt-warning)' },
  high: { label: 'High risk', color: 'var(--tt-danger)' },
};

/** Integrity risk (§9.3) as a small outlined chip with a tone dot. */
function RiskChip({ risk }: { risk: 'low' | 'medium' | 'high' }) {
  const r = RISK[risk];
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded border border-line px-1.5 text-[10px] font-semibold text-fg" title="Test integrity risk">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.color }} aria-hidden="true" />
      {r.label}
    </span>
  );
}

export function TestsTab({ tests, onSendTest, onOpenAttempt, onShareLink }: {
  tests: ApplicationTest[];
  onSendTest?: () => void;
  onOpenAttempt?: (attemptId: number) => void;
  /** An open test's link again (copy / QR / WhatsApp). */
  onShareLink?: (test: ApplicationTest) => void;
}) {
  const action = onSendTest ? <SmallButton primary icon={Send} onClick={onSendTest}>Send test</SmallButton> : undefined;
  if (!tests.length) return <EmptyTab title="No assessments sent" description="Send a test from the test bank; results land here." action={action} />;
  return (
    <div className="space-y-3">
      {action && <div className="flex justify-end">{action}</div>}
      <ul className="space-y-2.5">
        {tests.map((t) => (
          <li key={t.id} className="rounded-lg border border-line p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-fg">{t.testName}</p>
                <p className="mt-0.5 text-xs text-fg-muted">
                  Sent {formatDateTime(t.sentAt)}
                  {t.submittedAt ? ` · Submitted ${formatDateTime(t.submittedAt)}` : t.expiresAt && t.status !== 'cancelled' ? ` · Expires ${formatDateTime(t.expiresAt)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Chip>{TEST_STATUS_LABELS[t.status] || t.status}</Chip>
                {t.result && <Chip strong={t.result === 'passed'}>{TEST_RESULT_LABELS[t.result] || t.result}</Chip>}
                {(t.risk || t.aiScore !== null) && (
                  <span className="flex items-center gap-1">
                    {t.risk && <RiskChip risk={t.risk} />}
                    {t.aiScore !== null && <Chip>AI {Math.round(t.aiScore)}</Chip>}
                  </span>
                )}
              </div>
            </div>
            {(t.scorePercent !== null || onOpenAttempt) && (
              <div className="mt-2 flex items-center justify-between gap-3">
                {t.scorePercent !== null ? (
                  <div className="flex flex-1 items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-subtle">
                      <div className="h-full rounded-full bg-fg" style={{ width: `${Math.max(0, Math.min(100, t.scorePercent))}%` }} />
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-fg">{t.scorePercent}%</span>
                  </div>
                ) : <span />}
                <span className="flex items-center gap-3">
                  {onShareLink && (t.status === 'sent' || t.status === 'started') && (
                    <button type="button" onClick={() => onShareLink(t)} className="text-xs font-semibold text-fg underline-offset-4 hover:underline">Link &amp; QR</button>
                  )}
                  {onOpenAttempt && (
                    <button type="button" onClick={() => onOpenAttempt(t.id)} className="text-xs font-semibold text-fg underline-offset-4 hover:underline">
                      {t.result === 'pending' ? 'Review answers' : 'View answers'}
                    </button>
                  )}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

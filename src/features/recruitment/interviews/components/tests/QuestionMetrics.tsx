'use client';

import { Clock, Flag, Repeat } from 'lucide-react';
import type { IntegrityQuestionDto, QuestionType } from '../../types/interviews.dto';
import { clampPct, flagLabel, formatMs, toNum } from './attemptFormat';

const chip = 'inline-flex h-5 items-center gap-1 rounded border border-line px-1.5 text-[10px] font-semibold tabular-nums text-fg-muted';

/**
 * §9.3 per-question signals under an answer: time spent, answer changes (choice),
 * typed vs pasted share and typing speed (text), and the server's flags.
 */
export function QuestionMetrics({ type, m }: { type: QuestionType; m: IntegrityQuestionDto | null | undefined }) {
  if (!m) return null;
  const timeMs = toNum(m.timeMs);
  const visits = toNum(m.visits);
  const changes = toNum(m.answerChanges);
  const typed = toNum(m.typedChars) ?? 0;
  const pasted = toNum(m.pastedChars) ?? 0;
  const pastedPct = toNum(m.pastedPercent) ?? (typed + pasted > 0 ? Math.round((pasted / (typed + pasted)) * 100) : null);
  const cpm = toNum(m.typingCpm);
  const flags = (m.flags || []).filter((f) => typeof f === 'string' && f);

  const hasText = type === 'text' && (typed > 0 || pasted > 0);
  if (timeMs === null && changes === null && !hasText && flags.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Answer signals">
      {timeMs !== null && (
        <span className={chip} title={visits !== null ? `Opened ${visits} time${visits === 1 ? '' : 's'}` : undefined}>
          <Clock className="h-3 w-3" aria-hidden="true" />
          {formatMs(timeMs)}
          {visits !== null && visits > 1 && <span className="font-normal">· {visits} visits</span>}
        </span>
      )}
      {type !== 'text' && changes !== null && changes > 0 && (
        <span className={chip}>
          <Repeat className="h-3 w-3" aria-hidden="true" />
          {changes} change{changes === 1 ? '' : 's'}
        </span>
      )}
      {hasText && pastedPct !== null && (
        <span className="inline-flex h-5 items-center gap-1.5 rounded border border-line px-1.5 text-[10px] font-semibold tabular-nums text-fg-muted" title={`${typed} typed · ${pasted} pasted characters`}>
          <span className="relative h-1.5 w-14 overflow-hidden rounded-full bg-bg-subtle" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${100 - clampPct(pastedPct)}%` }} />
            <span className="absolute inset-y-0 right-0" style={{ width: `${clampPct(pastedPct)}%`, background: pastedPct >= 30 ? 'var(--tt-danger)' : 'var(--tt-warning)' }} />
          </span>
          <span className={pastedPct >= 30 ? 'text-[var(--tt-danger)]' : undefined}>{Math.round(pastedPct)}% pasted</span>
        </span>
      )}
      {type === 'text' && cpm !== null && cpm > 0 && (
        <span className={chip} title="Typing speed, characters per minute">{Math.round(cpm)} cpm</span>
      )}
      {flags.map((f) => (
        <span key={f} className="inline-flex h-5 items-center gap-1 rounded border border-[var(--tt-warning)] px-1.5 text-[10px] font-semibold text-fg">
          <Flag className="h-3 w-3" style={{ color: 'var(--tt-warning)' }} aria-hidden="true" />
          {flagLabel(f)}
        </span>
      ))}
    </div>
  );
}

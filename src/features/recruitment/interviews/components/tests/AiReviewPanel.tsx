'use client';

import { Check, Minus } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';
import { cx } from '@/theme/tokens';
import type { AiAnswerReviewDto, AiReviewDto, AiReviewStatus, TestQuestionDto } from '../../types/interviews.dto';
import { btn } from '../../lib/ui';
import { clampPct, toNum } from './attemptFormat';

export function aiStatusOf(review: AiReviewDto | null | undefined): AiReviewStatus {
  const s = review?.status;
  return s === 'pending' || s === 'done' || s === 'failed' ? s : review?.overall || review?.answers ? 'done' : 'none';
}

const likelihoodColor = (v: number) => (v >= 70 ? 'var(--tt-danger)' : v >= 40 ? 'var(--tt-warning)' : 'var(--tt-fg)');
const likelihoodWord = (v: number) => (v >= 70 ? 'Likely AI-written' : v >= 40 ? 'Possibly AI-assisted' : 'Likely own words');

function Meter({ label, value, color, hint }: { label: string; value: number | null; color?: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-fg-muted">{label}</span>
        <span className="text-lg font-bold tabular-nums text-fg">
          {value === null ? '—' : Math.round(value)}
          {value !== null && <span className="text-xs font-normal text-fg-muted">/100</span>}
        </span>
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(value)}
      >
        <div className="h-full rounded-full" style={{ width: `${clampPct(value)}%`, background: color ?? 'var(--tt-fg)' }} />
      </div>
      {hint && <p className="mt-1 text-[11px] text-fg-muted">{hint}</p>}
    </div>
  );
}

function TunerMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-subtle p-0.5 shadow-xs"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the same animated Tuner mark the assistant uses */}
      <img src="/chat-bot-animation.svg" alt="Tuner" className="pointer-events-none h-full w-full object-contain" />
    </span>
  );
}

export function AiReviewPanel({
  review,
  questions,
  qKey,
  submitted,
  canRun,
  running,
  polling,
  onRun,
  onApply,
  canApply,
}: {
  review: AiReviewDto | null | undefined;
  questions: TestQuestionDto[];
  qKey: (q: TestQuestionDto, i: number) => string;
  submitted: boolean;
  canRun: boolean;
  running: boolean;
  polling: boolean;
  onRun: () => void;
  onApply: () => void;
  canApply: boolean;
}) {
  const status = aiStatusOf(review);
  const busy = running || status === 'pending';
  const textQs = questions.map((q, i) => ({ q, i, k: qKey(q, i) })).filter((x) => x.q.type === 'text');
  const overallScore = toNum(review?.overall?.score);
  const overallAi = toNum(review?.overall?.aiLikelihood);
  const answers = review?.answers || {};
  const hasSuggestions = textQs.some(({ k }) => toNum(answers[k]?.suggestedMarks) !== null);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <TunerMark />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">AI review by Tuner</p>
              <p className="text-xs text-fg-muted">
                {status === 'done'
                  ? `Reviewed ${review?.ranAt ? formatDateTime(review.ranAt) : ''}`.trim()
                  : status === 'pending'
                    ? 'Tuner is reading the written answers…'
                    : status === 'failed'
                      ? 'The last review did not finish.'
                      : 'Accuracy, suggested marks and AI-writing signals for written answers.'}
              </p>
            </div>
          </div>
          {canRun && textQs.length > 0 && submitted && (
            <button type="button" onClick={onRun} disabled={busy} className={btn.secondary} aria-busy={busy || undefined}>
              {busy ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/chat-bot-animation.svg" alt="" aria-hidden className="pointer-events-none h-5 w-5 object-contain" />
              )}
              {busy ? 'Reviewing…' : status === 'none' ? 'Run AI review' : 'Re-run'}
            </button>
          )}
        </div>
        {busy && <p className="mt-3 text-xs text-fg-muted" role="status">This takes about 15–60 seconds{polling ? '; the page updates on its own' : ''}.</p>}
        {status === 'failed' && !busy && (
          <p className="mt-3 rounded-lg border border-[var(--tt-danger)]/40 px-3 py-2 text-xs text-[var(--tt-danger)]">
            {review?.error || 'Tuner could not finish the review. Try again in a moment.'}
          </p>
        )}
        {textQs.length === 0 && <p className="mt-3 text-xs text-fg-muted">This test has no written answers, so there is nothing for Tuner to review.</p>}
        {textQs.length > 0 && !submitted && <p className="mt-3 text-xs text-fg-muted">Available once the candidate submits.</p>}

        {status === 'done' && (overallScore !== null || overallAi !== null || review?.overall?.summary) && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <Meter label="AI score" value={overallScore} />
              <Meter
                label="AI-written likelihood"
                value={overallAi}
                color={overallAi !== null ? likelihoodColor(overallAi) : undefined}
                hint={overallAi !== null ? likelihoodWord(overallAi) : undefined}
              />
            </div>
            {review?.overall?.summary && <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{review.overall.summary}</p>}
          </div>
        )}
        {status === 'done' && hasSuggestions && canApply && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-xs text-fg-muted">AI never sets marks. Fill the suggestions in, check them, then save the review.</p>
            <button type="button" onClick={onApply} className={btn.primary}>Use AI suggested marks</button>
          </div>
        )}
      </section>

      {status === 'done' && textQs.length > 0 && (
        <ol className="space-y-3">
          {textQs.map(({ q, i, k }) => (
            <AnswerReview key={k} index={i} question={q} r={answers[k]} />
          ))}
        </ol>
      )}
    </div>
  );
}

function AnswerReview({ index, question, r }: { index: number; question: TestQuestionDto; r: AiAnswerReviewDto | undefined }) {
  const accuracy = toNum(r?.accuracy);
  const suggested = toNum(r?.suggestedMarks);
  const ai = toNum(r?.aiLikelihood);
  const signals = (r?.aiSignals || []).filter(Boolean);
  const covered = (r?.covered || []).filter(Boolean);
  const missing = (r?.missing || []).filter(Boolean);
  return (
    <li className="rounded-xl border border-line p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-fg">
          <span className="mr-1.5 tabular-nums text-fg-muted">{index + 1}.</span>
          <span className="whitespace-pre-wrap">{question.prompt}</span>
        </p>
        {suggested !== null && (
          <span className="shrink-0 rounded border border-fg px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-fg" title="Suggested marks">
            {suggested} / {question.marks}
          </span>
        )}
      </div>
      {!r ? (
        <p className="mt-2 text-xs text-fg-muted">No review for this answer.</p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Meter label="Accuracy" value={accuracy} />
            <Meter label="AI-written likelihood" value={ai} color={ai !== null ? likelihoodColor(ai) : undefined} />
          </div>
          {signals.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="AI-writing signals">
              {signals.map((s, si) => (
                <span key={si} className="inline-flex items-center rounded border border-line bg-bg-subtle px-1.5 py-0.5 text-[11px] text-fg-muted">{s}</span>
              ))}
            </div>
          )}
          {(covered.length > 0 || missing.length > 0) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <PointList title="Covered" items={covered} icon="check" />
              <PointList title="Missing" items={missing} icon="minus" />
            </div>
          )}
          {r.feedback && <p className="whitespace-pre-wrap rounded-lg bg-bg-subtle px-3 py-2 text-sm leading-relaxed text-fg">{r.feedback}</p>}
        </div>
      )}
    </li>
  );
}

function PointList({ title, items, icon }: { title: string; items: string[]; icon: 'check' | 'minus' }) {
  const Icon = icon === 'check' ? Check : Minus;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-fg-subtle">None</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {items.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-fg">
              <Icon className={cx('mt-0.5 h-3 w-3 shrink-0', icon === 'check' ? 'text-fg' : 'text-fg-muted')} aria-hidden="true" />
              <span className="min-w-0">{p}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

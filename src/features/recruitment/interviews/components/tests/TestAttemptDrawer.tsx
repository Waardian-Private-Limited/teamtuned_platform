'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { TestLinkDialog } from './TestLinkDialog';
import { StatusPill } from '@/components/ui/StatusPill';
import { messageOf } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/datetime';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/interviews.api';
import type { AiReviewDto, IntegrityQuestionDto, TestAttemptDetailDto, TestQuestionDto } from '../../types/interviews.dto';
import { Tabs } from '../../../shared/components/Tabs';
import { AiReviewPanel, aiStatusOf } from './AiReviewPanel';
import { IntegrityPanel } from './IntegrityPanel';
import { QuestionMetrics } from './QuestionMetrics';
import { RISK_META, riskOf, toNum } from './attemptFormat';
import { btn } from '../../lib/ui';

export interface TestAttemptDrawerProps {
  attemptId: number | null;
  onClose: () => void;
  /** Called after a review or cancel so the caller can refresh. */
  onChanged?: () => void;
  /** RECRUIT_MANAGE: may mark text answers and cancel. */
  canManage?: boolean;
}

const STATUS_LABEL: Record<string, string> = { sent: 'Sent', started: 'In progress', submitted: 'Submitted', expired: 'Expired', cancelled: 'Cancelled' };

const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

function qKey(q: TestQuestionDto, i: number) {
  return String(q.id ?? i);
}

type ViewTab = 'answers' | 'integrity' | 'ai';

const POLL_MS = 5000;
const POLL_MAX_MS = 120_000;

/** The ai-review POST may answer with the review itself or wrapped as `{ aiReview }`. */
function reviewFrom(res: unknown): AiReviewDto | null {
  if (!res || typeof res !== 'object') return null;
  const o = res as { aiReview?: AiReviewDto | null };
  if ('aiReview' in o) return o.aiReview ?? null;
  return res as AiReviewDto;
}

export function TestAttemptDrawer({ attemptId, onClose, onChanged, canManage }: TestAttemptDrawerProps) {
  const [attempt, setAttempt] = useState<TestAttemptDetailDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [markErrors, setMarkErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [tab, setTab] = useState<ViewTab>('answers');
  const [aiRunning, setAiRunning] = useState(false);
  const [polling, setPolling] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);
  const idRef = useRef<number | null>(attemptId);
  idRef.current = attemptId;

  /** `resetMarks` re-seeds the mark inputs from saved marks; refreshes (AI polling) keep what HR typed. */
  const load = useCallback(async (resetMarks = true) => {
    if (attemptId === null) return;
    if (resetMarks) setLoading(true);
    try {
      const a = await api.getTestAttempt(attemptId);
      if (idRef.current !== attemptId) return;
      setAttempt(a);
      if (resetMarks) {
        const init: Record<string, string> = {};
        (a.questions || []).forEach((q, i) => {
          if (q.type === 'text') {
            const m = a.marks?.[qKey(q, i)];
            init[qKey(q, i)] = m === null || m === undefined ? '' : String(m);
          }
        });
        setMarks(init);
        setMarkErrors({});
      }
    } catch (err) {
      if (resetMarks) showError(messageOf(err));
    } finally {
      if (resetMarks) setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    setTab('answers');
    setAiRunning(false);
    if (attemptId === null) { setAttempt(null); return; }
    load();
  }, [attemptId, load]);

  const aiStatus = aiStatusOf(attempt?.aiReview);

  // Poll every 5 s while Tuner's review is pending (background run after submit, or a slow re-run), for up to 2 min.
  useEffect(() => {
    if (attemptId === null || aiStatus !== 'pending' || aiRunning) { setPolling(false); return; }
    setPolling(true);
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - startedAt > POLL_MAX_MS) {
        window.clearInterval(id);
        setPolling(false);
        return;
      }
      void load(false);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [attemptId, aiStatus, aiRunning, load]);

  const questions = attempt?.questions || [];
  const textQuestions = questions.filter((q) => q.type === 'text');
  const canReview = Boolean(canManage && attempt?.status === 'submitted' && textQuestions.length > 0);
  const perQuestion = attempt?.integrity?.perQuestion || {};
  const aiAnswers = aiStatus === 'done' ? attempt?.aiReview?.answers || {} : {};

  const score = useMemo(() => {
    if (!attempt) return null;
    const auto = num(attempt.autoScore) ?? 0;
    const manual = num(attempt.manualScore);
    const max = num(attempt.maxScore) ?? 0;
    const total = auto + (manual ?? 0);
    const pct = attempt.scorePercent ?? (max > 0 ? Math.round((total / max) * 1000) / 10 : null);
    return { total, max, pct };
  }, [attempt]);

  async function review() {
    if (!attempt) return;
    const body: Record<string, number> = {};
    const errs: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (q.type !== 'text') return;
      const k = qKey(q, i);
      const raw = (marks[k] ?? '').trim();
      const v = Number(raw);
      if (raw === '' || !Number.isFinite(v)) errs[k] = 'Enter marks';
      else if (v < 0 || v > q.marks) errs[k] = `0 to ${q.marks}`;
      else body[k] = v;
    });
    setMarkErrors(errs);
    if (Object.keys(errs).length) { setTab('answers'); return; }
    setSaving(true);
    try {
      await api.reviewTestAttempt(attempt.id, body);
      showSuccess('Review saved');
      await load();
      onChanged?.();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (!attempt) return;
    setSaving(true);
    try {
      await api.cancelTestAttempt(attempt.id);
      showSuccess('Test cancelled');
      await load();
      onChanged?.();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function runAiReview() {
    if (!attempt) return;
    const id = attempt.id;
    setAiRunning(true);
    try {
      const res = reviewFrom(await api.runTestAiReview(id));
      if (idRef.current !== id) return;
      if (res) setAttempt((a) => (a && a.id === id ? { ...a, aiReview: res } : a));
      await load(false);
      onChanged?.();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setAiRunning(false);
    }
  }

  function applyAiMarks() {
    let filled = 0;
    const next: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (q.type !== 'text') return;
      const k = qKey(q, i);
      const s = toNum(aiAnswers[k]?.suggestedMarks);
      if (s === null) return;
      next[k] = trim(Math.max(0, Math.min(q.marks, s)));
      filled += 1;
    });
    if (!filled) return;
    setMarks((m) => ({ ...m, ...next }));
    setMarkErrors((e) => {
      const copy = { ...e };
      Object.keys(next).forEach((k) => { copy[k] = ''; });
      return copy;
    });
    setTab('answers');
    showSuccess(`Filled ${filled} suggested mark${filled === 1 ? '' : 's'}. Check them, then save the review.`);
  }

  const title = attempt?.testName || attempt?.test?.name || 'Test attempt';
  const risk = riskOf(attempt?.integrity?.risk);
  const tabs = [
    { value: 'answers' as const, label: 'Answers' },
    { value: 'integrity' as const, label: risk ? `Integrity · ${RISK_META[risk].label}` : 'Integrity' },
    { value: 'ai' as const, label: aiStatus === 'pending' || aiRunning ? 'AI review · running' : 'AI review' },
  ];

  return (
    <Drawer open={attemptId !== null} onClose={onClose} title={title} maxWidthClassName="sm:max-w-2xl">
      {loading && !attempt ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
      ) : !attempt ? null : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line p-4 sm:grid-cols-4">
            <Stat label="Status" value={<StatusPill label={STATUS_LABEL[attempt.status] || attempt.status} tone={attempt.status === 'submitted' ? 'active' : attempt.status === 'cancelled' || attempt.status === 'expired' ? 'terminated' : 'neutral'} />} />
            <Stat label="Score" value={score && attempt.status === 'submitted' ? `${trim(score.total)} / ${trim(score.max)}` : '—'} />
            <Stat label="Percent" value={score?.pct !== null && score?.pct !== undefined && attempt.status === 'submitted' ? `${score.pct}%` : '—'} />
            <Stat
              label="Result"
              value={
                attempt.result === 'passed' ? <StatusPill label="Passed" tone="active" />
                : attempt.result === 'failed' ? <StatusPill label="Failed" tone="inactive" />
                : attempt.result === 'pending' ? <StatusPill label="Needs review" tone="neutral" />
                : '—'
              }
            />
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-fg-muted sm:grid-cols-2">
            <Meta label="Sent" value={formatDateTime(attempt.sentAt || attempt.createdAt)} />
            <Meta label="Started" value={formatDateTime(attempt.startedAt)} />
            <Meta label="Submitted" value={formatDateTime(attempt.submittedAt)} />
            <Meta label="Link expires" value={formatDateTime(attempt.expiresAt)} />
            {attempt.passPercent !== null && attempt.passPercent !== undefined && <Meta label="Pass mark" value={`${attempt.passPercent}%`} />}
          </dl>

          <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix={`attempt-${attempt.id}`} ariaLabel="Attempt views" />

          <div role="tabpanel" id={`attempt-${attempt.id}-panel-${tab}`} aria-labelledby={`attempt-${attempt.id}-tab-${tab}`}>
            {tab === 'answers' && (
              questions.length === 0 ? (
                <p className="text-sm text-fg-muted">No answers yet.</p>
              ) : (
                <ol className="space-y-3">
                  {questions.map((q, i) => (
                    <QuestionResult
                      key={qKey(q, i)}
                      index={i}
                      question={q}
                      answer={attempt.answers?.[qKey(q, i)] ?? null}
                      awarded={attempt.marks?.[qKey(q, i)] ?? null}
                      editable={canReview && q.type === 'text'}
                      markValue={marks[qKey(q, i)] ?? ''}
                      markError={markErrors[qKey(q, i)]}
                      onMarkChange={(v) => { setMarks((m) => ({ ...m, [qKey(q, i)]: v })); setMarkErrors((e) => ({ ...e, [qKey(q, i)]: '' })); }}
                      metrics={perQuestion[qKey(q, i)]}
                      aiSuggested={toNum(aiAnswers[qKey(q, i)]?.suggestedMarks)}
                    />
                  ))}
                </ol>
              )
            )}
            {tab === 'integrity' && (
              <IntegrityPanel integrity={attempt.integrity} questions={questions} startedAt={attempt.startedAt} qKey={qKey} />
            )}
            {tab === 'ai' && (
              <AiReviewPanel
                review={attempt.aiReview}
                questions={questions}
                qKey={qKey}
                submitted={attempt.status === 'submitted'}
                canRun={Boolean(canManage)}
                running={aiRunning}
                polling={polling}
                onRun={runAiReview}
                onApply={applyAiMarks}
                canApply={canReview}
              />
            )}
          </div>

          {(canReview || (canManage && (attempt.status === 'sent' || attempt.status === 'started'))) && (
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-surface pt-3">
              {canManage && (attempt.status === 'sent' || attempt.status === 'started') && (
                <>
                  <button type="button" onClick={cancel} disabled={saving} className={btn.secondary}>Cancel test</button>
                  <button type="button" onClick={() => setShareOpen(true)} disabled={saving} className={btn.secondary}>Share link</button>
                </>
              )}
              {canReview && (
                <button type="button" onClick={review} disabled={saving} className={btn.primary}>
                  {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  Save review
                </button>
              )}
            </div>
          )}
        </div>
      )}
      <TestLinkDialog
        attemptId={shareOpen && attempt ? attempt.id : null}
        onClose={closeShare}
        onChanged={onChanged}
        candidateName={attempt?.candidateName}
        testName={attempt?.testName}
      />
    </Drawer>
  );
}

function trim(n: number) {
  return String(Math.round(n * 100) / 100);
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</p>
      <div className="mt-1 text-sm font-bold tabular-nums text-fg">{value}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <dt>{label}</dt>
      <dd className="tabular-nums text-fg">{value}</dd>
    </div>
  );
}

function QuestionResult({
  index,
  question,
  answer,
  awarded,
  editable,
  markValue,
  markError,
  onMarkChange,
  metrics,
  aiSuggested,
}: {
  index: number;
  question: TestQuestionDto;
  answer: number[] | string | null;
  awarded: number | null;
  editable: boolean;
  markValue: string;
  markError?: string;
  onMarkChange: (v: string) => void;
  metrics?: IntegrityQuestionDto;
  aiSuggested?: number | null;
}) {
  const picked = new Set(Array.isArray(answer) ? answer.map(Number) : []);
  const correct = new Set((question.answer || []).map(Number));
  return (
    <li className="rounded-xl border border-line p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-fg">
          <span className="mr-1.5 tabular-nums text-fg-muted">{index + 1}.</span>
          <span className="whitespace-pre-wrap">{question.prompt}</span>
        </p>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-fg-muted">
          {awarded !== null && awarded !== undefined ? `${awarded} / ${question.marks}` : `${question.marks} ${question.marks === 1 ? 'mark' : 'marks'}`}
        </span>
      </div>

      {question.type === 'text' ? (
        <div className="mt-2.5 space-y-2">
          <div className="whitespace-pre-wrap rounded-lg bg-bg-subtle px-3 py-2 text-sm text-fg">
            {typeof answer === 'string' && answer.trim() ? answer : <span className="text-fg-subtle">No answer</span>}
          </div>
          {question.answerGuide && (
            <div className="rounded-lg border border-dashed border-line px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">Answer guide</p>
              <p className="mt-0.5 whitespace-pre-wrap text-sm text-fg">{question.answerGuide}</p>
            </div>
          )}
          {editable && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-fg" htmlFor={`mark-${index}`}>Marks</label>
              <input
                id={`mark-${index}`}
                inputMode="decimal"
                value={markValue}
                onChange={(e) => onMarkChange(e.target.value)}
                aria-invalid={Boolean(markError) || undefined}
                className={cx(
                  'h-8 w-20 rounded-lg border bg-surface px-2 text-sm tabular-nums text-fg outline-none focus:ring-1',
                  markError ? 'border-[var(--tt-danger)] focus:ring-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]'
                )}
              />
              <span className="text-xs text-fg-muted tabular-nums">of {question.marks}</span>
              {markError && <span className="text-xs font-medium text-[var(--tt-danger)]">{markError}</span>}
              {aiSuggested !== null && aiSuggested !== undefined && !markError && (
                <span className="text-xs text-fg-muted">· AI suggests <span className="font-semibold tabular-nums text-fg">{trim(aiSuggested)}</span></span>
              )}
            </div>
          )}
        </div>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {(question.options || []).map((opt, oi) => {
            const isPicked = picked.has(oi);
            const isCorrect = correct.has(oi);
            return (
              <li
                key={oi}
                className={cx(
                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm',
                  isPicked ? 'border-fg' : 'border-line',
                  isPicked && !isCorrect && 'border-[var(--tt-danger)]'
                )}
              >
                <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded', question.type === 'single' && 'rounded-full', isPicked ? 'bg-fg text-surface' : 'border border-line-strong')}>
                  {isPicked && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1 text-fg">{opt}</span>
                {isCorrect && <span className="shrink-0 text-[11px] font-semibold text-fg">Correct</span>}
                {isPicked && !isCorrect && <X className="h-3.5 w-3.5 shrink-0 text-[var(--tt-danger)]" aria-label="Wrong" />}
              </li>
            );
          })}
          {picked.size === 0 && <li className="text-xs text-fg-subtle">No answer</li>}
        </ul>
      )}
      <QuestionMetrics type={question.type} m={metrics} />
    </li>
  );
}

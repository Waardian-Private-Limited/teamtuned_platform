'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { Switch } from '@/components/ui/Switch';
import { FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { invalidateRecruitmentOptions } from '../../../shared/hooks/useRecruitmentOptions';
import * as api from '../../../interviews/api/interviews.api';
import type { QuestionType, TestBody, TestDetailDto } from '../../../interviews/types/interviews.dto';
import { QUESTION_TYPE_OPTIONS } from '../../../interviews/constants/interviews.constants';
import { btn, fieldOf } from '../../../interviews/lib/ui';
import { ConfirmDialog } from '../../../interviews/lib/ConfirmDialog';
import type { SuggestedQuestionDto } from '../../../interviews/api/interviews.api';
import { TunerSuggestPanel } from './TunerSuggestPanel';

interface QState {
  uid: string;
  id?: number;
  type: QuestionType;
  prompt: string;
  options: string[];
  correct: number[];
  /** Descriptive questions: model answer / key points for whoever marks it. */
  guide: string;
  marks: string;
}

let uidSeq = 0;
const uid = () => `q${++uidSeq}`;
const newQuestion = (type: QuestionType = 'single'): QState => ({ uid: uid(), type, prompt: '', options: type === 'text' ? [] : ['', ''], correct: [], guide: '', marks: '1' });
const digits = (v: string) => v.replace(/[^\d]/g, '');

export function TestEditorDrawer({
  testId,
  open,
  onClose,
  onSaved,
}: {
  /** null = create */
  testId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [passPercent, setPassPercent] = useState('60');
  const [questionCount, setQuestionCount] = useState('');
  const [questions, setQuestions] = useState<QState[]>([newQuestion()]);
  // §9.1 proctoring — defaults match the server's.
  const [blockCopyPaste, setBlockCopyPaste] = useState(true);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [maxTabSwitches, setMaxTabSwitches] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (testId === null) {
      setStatus('active'); setName(''); setDescription(''); setDuration('30'); setPassPercent('60'); setQuestionCount(''); setQuestions([newQuestion()]);
      setBlockCopyPaste(true); setRequireFullscreen(false); setShuffleOptions(true); setMaxTabSwitches('');
      return;
    }
    let alive = true;
    setLoading(true);
    api.getTest(testId)
      .then((t: TestDetailDto) => {
        if (!alive) return;
        setStatus(t.status);
        setName(t.name);
        setDescription(t.description || '');
        setDuration(String(t.durationMinutes ?? 30));
        setPassPercent(String(t.passPercent ?? 60));
        setQuestionCount(t.questionCount ? String(t.questionCount) : '');
        const p = t.proctoring || {};
        setBlockCopyPaste(p.blockCopyPaste ?? true);
        setRequireFullscreen(p.requireFullscreen ?? false);
        setShuffleOptions(p.shuffleOptions ?? true);
        setMaxTabSwitches(p.maxTabSwitches ? String(p.maxTabSwitches) : '');
        setQuestions((t.questions || []).map((q) => ({
          uid: uid(),
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: q.type === 'text' ? [] : [...(q.options || [])],
          correct: (q.answer || []).map(Number).filter((n) => Number.isInteger(n)),
          guide: q.answerGuide || '',
          marks: String(q.marks ?? 1),
        })));
      })
      .catch((err) => showError(messageOf(err)))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, testId]);

  const clear = (k: string) => setErrors((e) => (e[k] ? { ...e, [k]: '' } : e));
  const updateQ = (u: string, patch: Partial<QState>) => setQuestions((qs) => qs.map((q) => (q.uid === u ? { ...q, ...patch } : q)));

  function changeType(q: QState, type: QuestionType) {
    if (type === 'text') updateQ(q.uid, { type, options: [], correct: [] });
    else updateQ(q.uid, { type, options: q.options.length >= 2 ? q.options : ['', ''], correct: type === 'single' ? q.correct.slice(0, 1) : q.correct });
    clear(`${q.uid}.options`);
  }

  function toggleCorrect(q: QState, i: number) {
    const next = q.type === 'single' ? [i] : q.correct.includes(i) ? q.correct.filter((c) => c !== i) : [...q.correct, i].sort((a, b) => a - b);
    updateQ(q.uid, { correct: next });
    clear(`${q.uid}.options`);
  }

  function removeOption(q: QState, i: number) {
    updateQ(q.uid, {
      options: q.options.filter((_, oi) => oi !== i),
      correct: q.correct.filter((c) => c !== i).map((c) => (c > i ? c - 1 : c)),
    });
  }

  function move(i: number, dir: -1 | 1) {
    setQuestions((qs) => {
      const j = i + dir;
      if (j < 0 || j >= qs.length) return qs;
      const next = [...qs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  // Tuner's picks join the test as normal questions; a blank starter question is replaced.
  function addSuggested(list: SuggestedQuestionDto[]) {
    const added: QState[] = list.map((q) => ({ uid: uid(), type: q.type, prompt: q.prompt, options: [...q.options], correct: [...q.answer], guide: q.answerGuide || '', marks: String(q.marks) }));
    setQuestions((qs) => {
      const blank = (q: QState) => !q.id && !q.prompt.trim() && q.options.every((o) => !o.trim());
      return [...qs.filter((q) => !blank(q)), ...added];
    });
    clear('questions');
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, newQuestion(qs[qs.length - 1]?.type === 'text' ? 'text' : 'single')]);
    clear('questions');
    requestAnimationFrame(() => listEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
  }

  function validate(): TestBody | null {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name the test';
    const dur = Number(duration);
    if (!dur || dur < 1 || dur > 600) e.duration = '1 to 600 minutes';
    const pass = Number(passPercent);
    if (passPercent === '' || pass < 0 || pass > 100) e.passPercent = '0 to 100';
    if (questions.length === 0) e.questions = 'Add at least one question';
    const qc = questionCount === '' ? null : Number(questionCount);
    if (qc !== null && (qc < 1 || qc > questions.length)) e.questionCount = `1 to ${questions.length}, or leave empty for all`;
    const maxSwitches = maxTabSwitches === '' ? null : Number(maxTabSwitches);
    if (maxSwitches !== null && (maxSwitches < 1 || maxSwitches > 20)) e.maxTabSwitches = '1 to 20, or leave empty for never';
    questions.forEach((q) => {
      if (!q.prompt.trim()) e[`${q.uid}.prompt`] = 'Enter the question';
      const m = Number(q.marks);
      if (!m || m < 1 || m > 100) e[`${q.uid}.marks`] = '1–100';
      if (q.type !== 'text') {
        const filled = q.options.map((o) => o.trim());
        if (filled.length < 2 || filled.some((o) => !o)) e[`${q.uid}.options`] = 'Fill in at least two options (remove empty ones)';
        else if (q.correct.length === 0) e[`${q.uid}.options`] = 'Mark the correct answer';
        else if (q.type === 'single' && q.correct.length !== 1) e[`${q.uid}.options`] = 'Single choice has exactly one correct answer';
      }
    });
    setErrors(e);
    if (Object.keys(e).length) return null;
    return {
      name: name.trim(),
      description: description.trim(),
      duration_minutes: dur,
      pass_percent: pass,
      question_count: qc,
      proctoring: {
        block_copy_paste: blockCopyPaste,
        require_fullscreen: requireFullscreen,
        max_tab_switches: maxSwitches,
        shuffle_options: shuffleOptions,
      },
      questions: questions.map((q) => ({
        ...(q.id ? { id: q.id } : {}),
        type: q.type,
        prompt: q.prompt.trim(),
        options: q.type === 'text' ? [] : q.options.map((o) => o.trim()),
        answer: q.type === 'text' ? [] : q.correct,
        ...(q.type === 'text' ? { answer_guide: q.guide.trim() || null } : {}),
        marks: Number(q.marks),
      })),
    };
  }

  async function save() {
    const body = validate();
    if (!body) return;
    setSaving(true);
    try {
      if (testId === null) await api.createTest(body);
      else await api.updateTest(testId, body);
      invalidateRecruitmentOptions();
      showSuccess(testId === null ? 'Test created' : 'Test saved');
      onSaved();
      onClose();
    } catch (err) {
      const f = fieldOf(err);
      const map: Record<string, string> = { name: 'name', duration_minutes: 'duration', pass_percent: 'passPercent', question_count: 'questionCount', questions: 'questions', max_tab_switches: 'maxTabSwitches', 'proctoring.max_tab_switches': 'maxTabSwitches' };
      if (f && map[f]) setErrors({ [map[f]]: messageOf(err) });
      else showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    if (testId === null) return;
    setSaving(true);
    try {
      await api.archiveTest(testId);
      invalidateRecruitmentOptions();
      showSuccess('Test archived');
      setArchiveOpen(false);
      onSaved();
      onClose();
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  const totalMarks = questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);
  const readOnly = status === 'archived';

  return (
    <Drawer open={open} onClose={onClose} title={testId === null ? 'New test' : readOnly ? 'Archived test' : 'Edit test'} maxWidthClassName="sm:max-w-2xl">
      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-bg-subtle" />)}</div>
      ) : (
        <fieldset disabled={readOnly} className="space-y-5">
          <div className="space-y-3">
            <TextField label="Name" required value={name} onChange={(v) => { setName(v); clear('name'); }} error={errors.name || undefined} maxLength={160} placeholder="e.g. Accounting basics" />
            <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to the candidate before they start" />
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField label="Duration" required inputMode="numeric" suffix={<span className="text-xs text-fg-muted">min</span>} value={duration} onChange={(v) => { setDuration(digits(v).slice(0, 3)); clear('duration'); }} error={errors.duration || undefined} />
              <TextField label="Pass mark" required inputMode="numeric" suffix={<span className="text-xs text-fg-muted">%</span>} value={passPercent} onChange={(v) => { setPassPercent(digits(v).slice(0, 3)); clear('passPercent'); }} error={errors.passPercent || undefined} />
              <TextField
                label="Questions to pick"
                inputMode="numeric"
                value={questionCount}
                onChange={(v) => { setQuestionCount(digits(v).slice(0, 3)); clear('questionCount'); }}
                error={errors.questionCount || undefined}
                placeholder={`All (${questions.length})`}
                hint="Random pick per candidate"
              />
            </div>
          </div>

          <section aria-labelledby="proctoring-heading" className="rounded-xl border border-line p-3.5">
            <h3 id="proctoring-heading" className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Proctoring</h3>
            <p className="mt-1 text-xs text-fg-muted">
              Candidates are told the test is monitored. Tab switches, copy and paste, full screen exits and time per question are always recorded for review.
            </p>
            <div className="mt-3 divide-y divide-line">
              <ProctorRow label="Block copy & paste" hint="Copy, cut, paste and right-click are blocked and recorded." checked={blockCopyPaste} onChange={setBlockCopyPaste} />
              <ProctorRow label="Require full screen" hint="The test runs in full screen; leaving it pauses the page until the candidate returns." checked={requireFullscreen} onChange={setRequireFullscreen} />
              <ProctorRow label="Shuffle options" hint="Each candidate sees choice options in a different order." checked={shuffleOptions} onChange={setShuffleOptions} />
              <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">Auto-submit after tab switches</p>
                  <p className="text-xs text-fg-muted">Submit the test automatically once the candidate leaves it more than this many times. Empty = never.</p>
                </div>
                <div className="w-full shrink-0 sm:w-32">
                  <TextField
                    label="Tab switches"
                    inputMode="numeric"
                    value={maxTabSwitches}
                    onChange={(v) => { setMaxTabSwitches(digits(v).slice(0, 2)); clear('maxTabSwitches'); }}
                    error={errors.maxTabSwitches || undefined}
                    placeholder="Never"
                  />
                </div>
              </div>
            </div>
          </section>

          {!readOnly && <TunerSuggestPanel existingPrompts={questions.map((q) => q.prompt)} onAdd={addSuggested} />}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Questions</h3>
              <span className="text-xs tabular-nums text-fg-muted">{questions.length} questions · {totalMarks} marks</span>
            </div>
            <FieldMessage error={errors.questions || undefined} />
            <ol className="space-y-3">
              {questions.map((q, i) => {
                const optErr = errors[`${q.uid}.options`];
                return (
                  <li key={q.uid} className="rounded-xl border border-line p-3.5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold tabular-nums text-fg">Q{i + 1}</span>
                      {!readOnly && (
                        <div className="flex items-center gap-0.5">
                          <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className={btn.icon}><ArrowUp className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="Move down" disabled={i === questions.length - 1} onClick={() => move(i, 1)} className={btn.icon}><ArrowDown className="h-3.5 w-3.5" /></button>
                          <button type="button" aria-label="Remove question" onClick={() => setQuestions((qs) => qs.filter((x) => x.uid !== q.uid))} className={btn.icon}><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                      <SelectField<QuestionType>
                        label="Type"
                        value={q.type}
                        options={QUESTION_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={(v) => v && changeType(q, v)}
                      />
                      <TextField label="Marks" inputMode="numeric" value={q.marks} onChange={(v) => { updateQ(q.uid, { marks: digits(v).slice(0, 3) }); clear(`${q.uid}.marks`); }} error={errors[`${q.uid}.marks`] || undefined} />
                    </div>
                    <div className="mt-3">
                      <Textarea label="Question" required rows={2} value={q.prompt} onChange={(e) => { updateQ(q.uid, { prompt: e.target.value }); clear(`${q.uid}.prompt`); }} error={errors[`${q.uid}.prompt`] || undefined} />
                    </div>
                    {q.type === 'text' ? (
                      <div className="mt-3">
                        <Textarea label="Answer guide (for reviewers)" rows={3} maxLength={4000} value={q.guide}
                          onChange={(e) => updateQ(q.uid, { guide: e.target.value })}
                          placeholder="Key points a good answer covers, and what earns full or partial marks. Candidates never see this." />
                        <p className="mt-1 text-xs text-fg-muted">The candidate types an answer; whoever reviews it sees this guide next to it.</p>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">Options <span className="font-normal text-fg-muted">— tick the correct {q.type === 'single' ? 'one' : 'ones'}</span></p>
                        <div className={cx('space-y-1.5 rounded-lg', optErr && 'ring-1 ring-[var(--tt-danger)] ring-offset-2 ring-offset-surface')}>
                          {q.options.map((o, oi) => {
                            const isCorrect = q.correct.includes(oi);
                            return (
                              <div key={oi} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  role={q.type === 'single' ? 'radio' : 'checkbox'}
                                  aria-checked={isCorrect}
                                  aria-label={`Mark option ${oi + 1} correct`}
                                  onClick={() => toggleCorrect(q, oi)}
                                  className={cx(
                                    'flex h-5 w-5 shrink-0 items-center justify-center border transition-colors',
                                    q.type === 'single' ? 'rounded-full' : 'rounded',
                                    isCorrect ? 'border-fg bg-fg text-surface' : 'border-line-strong bg-surface hover:border-fg'
                                  )}
                                >
                                  {isCorrect && <Check className="h-3 w-3" strokeWidth={3} />}
                                </button>
                                <input
                                  value={o}
                                  onChange={(e) => { updateQ(q.uid, { options: q.options.map((x, xi) => (xi === oi ? e.target.value : x)) }); clear(`${q.uid}.options`); }}
                                  placeholder={`Option ${oi + 1}`}
                                  className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-sm text-fg outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]"
                                />
                                {!readOnly && q.options.length > 2 && (
                                  <button type="button" aria-label={`Remove option ${oi + 1}`} onClick={() => removeOption(q, oi)} className={btn.icon}><X className="h-3.5 w-3.5" /></button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {!readOnly && q.options.length < 10 && (
                          <button type="button" onClick={() => updateQ(q.uid, { options: [...q.options, ''] })} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fg underline-offset-4 hover:underline">
                            <Plus className="h-3 w-3" /> Add option
                          </button>
                        )}
                        <FieldMessage error={optErr || undefined} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <div ref={listEnd} />
            {!readOnly && (
              <button type="button" onClick={addQuestion} className={cx(btn.secondary, 'mt-3 w-full border-dashed')}>
                <Plus className="h-3.5 w-3.5" /> Add question
              </button>
            )}
          </section>

          {!readOnly && (
            <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-line bg-surface pt-3">
              {testId !== null ? (
                <button type="button" onClick={() => setArchiveOpen(true)} className={btn.secondary}>Archive</button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
                <button type="button" onClick={save} disabled={saving} className={btn.primary}>
                  {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  {testId === null ? 'Create test' : 'Save test'}
                </button>
              </div>
            </div>
          )}
        </fieldset>
      )}
      <ConfirmDialog
        open={archiveOpen}
        title="Archive test"
        body="It can no longer be sent or picked for positions. Attempts already sent keep working."
        confirmLabel="Archive"
        danger
        busy={saving}
        onClose={() => setArchiveOpen(false)}
        onConfirm={archive}
      />
    </Drawer>
  );
}

function ProctorRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-fg">{label}</p>
        <p className="text-xs text-fg-muted">{hint}</p>
      </div>
      <div className="pt-0.5"><Switch checked={checked} onChange={onChange} label={label} /></div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FieldMessage, SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { getAssistantConfig } from '@/features/assistant/api/assistant.api';
import { messageOf } from '@/lib/api/errors';
import { cx } from '@/theme/tokens';
import * as api from '../../../interviews/api/interviews.api';
import type { SuggestedQuestionDto } from '../../../interviews/api/interviews.api';
import { QUESTION_TYPE_OPTIONS } from '../../../interviews/constants/interviews.constants';
import { btn, fieldOf, itemsOf } from '../../../interviews/lib/ui';

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
type Source = 'position' | 'jd';

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
] as const;

const SOURCES = [
  { value: 'position', label: 'From a position' },
  { value: 'jd', label: 'Paste a job description' },
] as const;

const typeLabel = (t: string) => QUESTION_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
const digits = (v: string) => v.replace(/[^\d]/g, '').slice(0, 2);

interface Suggestion extends SuggestedQuestionDto { key: string }
let keySeq = 0;

/**
 * Tuner drafts questions for the test from a position (title, skills, experience, description) or a
 * pasted job description. Suggestions stay here until the recruiter adds them; added ones become
 * normal, editable questions in the test. Hidden when Tuner is off for the organization.
 */
export function TunerSuggestPanel({ existingPrompts, onAdd }: { existingPrompts: string[]; onAdd: (q: SuggestedQuestionDto[]) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>('position');
  const [positions, setPositions] = useState<{ id: number; title: string }[]>([]);
  const [positionId, setPositionId] = useState<number | null>(null);
  const [jd, setJd] = useState('');
  const [topic, setTopic] = useState('');
  const [single, setSingle] = useState('5');
  const [multiple, setMultiple] = useState('2');
  const [text, setText] = useState('2');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    let alive = true;
    getAssistantConfig().then((c) => { if (alive) setEnabled(Boolean(c?.enabled)); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open || positions.length) return;
    let alive = true;
    api.listPositionOptions().then((res) => { if (alive) setPositions(itemsOf(res).map((p) => ({ id: p.id, title: p.title }))); }).catch(() => {});
    return () => { alive = false; };
  }, [open, positions.length]);

  if (!enabled) return null;

  async function suggest() {
    const e: Record<string, string> = {};
    if (source === 'position' && !positionId) e.position_id = 'Pick a position';
    if (source === 'jd' && !jd.trim()) e.job_description = 'Paste the job description';
    const total = (Number(single) || 0) + (Number(multiple) || 0) + (Number(text) || 0);
    if (total < 1) e.single = 'Ask for at least one question';
    else if (total > 25) e.single = 'Up to 25 at a time';
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    setFailure('');
    try {
      const res = await api.suggestQuestions({
        position_id: source === 'position' ? positionId : null,
        job_description: source === 'jd' ? jd.trim() : undefined,
        topic: topic.trim() || undefined,
        single: Number(single) || 0,
        multiple: Number(multiple) || 0,
        text: Number(text) || 0,
        difficulty,
        existing_prompts: [...existingPrompts, ...items.map((i) => i.prompt)].filter(Boolean).slice(0, 100),
      });
      setItems((prev) => [...prev, ...res.suggestions.map((s) => ({ ...s, key: `s${++keySeq}` }))]);
    } catch (err) {
      const f = fieldOf(err);
      if (f && ['position_id', 'job_description', 'single', 'multiple', 'text'].includes(f)) setErrors({ [f]: messageOf(err) });
      else setFailure(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const take = (list: Suggestion[]) => {
    if (!list.length) return;
    onAdd(list.map(({ key: _key, ...q }) => q));
    const taken = new Set(list.map((s) => s.key));
    setItems((prev) => prev.filter((s) => !taken.has(s.key)));
  };

  return (
    <section className="rounded-xl border border-line bg-bg-subtle/40">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left">
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- the same animated Tuner mark the assistant uses */}
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-subtle p-0.5 shadow-xs">
            <img src="/chat-bot-animation.svg" alt="Tuner" className="pointer-events-none h-full w-full object-contain" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-fg">Suggest questions with Tuner</span>
            <span className="block text-xs text-fg-muted">From a position or job description. You choose what goes into the test.</span>
          </span>
        </span>
        {items.length > 0 && <span className="rounded border border-fg px-1.5 text-[11px] font-bold tabular-nums text-fg">{items.length}</span>}
      </button>

      {open && (
        <div className="space-y-3 border-t border-line px-3.5 pb-3.5 pt-3">
          <SegmentedControl options={SOURCES} value={source} onChange={(v) => { setSource(v); setErrors({}); }} />
          {source === 'position' ? (
            <SelectField label="Position" required value={positionId}
              options={positions.map((p) => ({ value: p.id, label: p.title }))}
              onChange={(v) => { setPositionId(v ? Number(v) : null); setErrors({}); }}
              error={errors.position_id} placeholder="Select a position…" />
          ) : (
            <div>
              <Textarea label="Job description" rows={5} value={jd} maxLength={8000}
                onChange={(e) => { setJd(e.target.value); setErrors({}); }} placeholder="Paste the role, responsibilities and skills" />
              <FieldMessage error={errors.job_description} />
            </div>
          )}
          <TextField label="Focus (optional)" value={topic} onChange={setTopic} maxLength={300} placeholder="e.g. SQL joins, customer handling, GST basics" />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Single choice" inputMode="numeric" value={single} onChange={(v) => { setSingle(digits(v)); setErrors({}); }} error={errors.single} />
            <TextField label="Multiple choice" inputMode="numeric" value={multiple} onChange={(v) => { setMultiple(digits(v)); setErrors({}); }} />
            <TextField label="Descriptive" inputMode="numeric" value={text} onChange={(v) => { setText(digits(v)); setErrors({}); }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl options={DIFFICULTIES} value={difficulty} onChange={setDifficulty} />
            <button type="button" onClick={suggest} disabled={busy} className={btn.primary}>
              {busy
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src="/chat-bot-animation.svg" alt="" aria-hidden className="pointer-events-none h-5 w-5 object-contain" />}
              {busy ? 'Tuner is writing…' : items.length ? 'Suggest more' : 'Suggest'}
            </button>
          </div>
          {busy && <p className="text-xs text-fg-muted">This takes about 15–30 seconds.</p>}
          {failure && <p className="rounded-lg border border-[var(--tt-danger)]/40 px-3 py-2 text-xs text-[var(--tt-danger)]">{failure}</p>}

          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Suggestions</h4>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setItems([])} className={btn.secondary}>Clear</button>
                  <button type="button" onClick={() => take(items)} className={btn.primary}><Plus className="h-4 w-4" /> Add all</button>
                </div>
              </div>
              <ul className="space-y-2">
                {items.map((s) => (
                  <li key={s.key} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">{typeLabel(s.type)} · {s.marks} {s.marks === 1 ? 'mark' : 'marks'}</p>
                        <p className="mt-0.5 text-sm font-medium text-fg">{s.prompt}</p>
                        {s.options.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {s.options.map((o, i) => {
                              const right = s.answer.includes(i);
                              return (
                                <li key={i} className={cx('flex items-start gap-1.5 text-xs', right ? 'font-semibold text-fg' : 'text-fg-muted')}>
                                  <span className={cx('mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border', right ? 'border-fg bg-fg text-surface' : 'border-line')}>
                                    {right && <Check className="h-2.5 w-2.5" />}
                                  </span>
                                  {o}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {s.answerGuide && (
                          <div className="mt-1.5 rounded border border-dashed border-line px-2 py-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted">Answer guide</p>
                            <p className="whitespace-pre-wrap text-xs text-fg">{s.answerGuide}</p>
                          </div>
                        )}
                        {s.rationale && <p className="mt-1.5 text-[11px] italic text-fg-muted">Checks: {s.rationale}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" aria-label="Dismiss suggestion" onClick={() => setItems((p) => p.filter((x) => x.key !== s.key))} className={btn.icon}><X className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => take([s])} className={btn.secondary}><Plus className="h-3.5 w-3.5" /> Add</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

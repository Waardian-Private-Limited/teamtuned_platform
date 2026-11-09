'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { FieldLabel, FieldMessage, SelectField, TextField, shellClass } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/theme/tokens';
import { FIELD_RULE_OPTIONS, QUESTION_TYPE_LABELS, STANDARD_FIELDS } from '../constants/recruitment.constants';
import { newKey } from '../types/recruitment.mapper';
import type { FieldRule, FormQuestion, PositionForm, QuestionType } from '../types/recruitment.model';

type Errors = Record<string, string | undefined>;

const iconBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg disabled:cursor-not-allowed disabled:opacity-30';

/** Questions that cannot be saved, keyed `form.questions.<i>.label|options`. */
export function formErrors(form: PositionForm): Errors {
  const e: Errors = {};
  form.questions.forEach((q, i) => {
    if (!q.label.trim()) e[`form.questions.${i}.label`] = 'Write the question';
    if (q.type === 'choice' && q.options.filter((o) => o.trim()).length < 2) e[`form.questions.${i}.options`] = 'Add at least two options';
  });
  return e;
}

/** A deep copy, so a position's form and the company default never share arrays. */
export function copyForm(form: PositionForm): PositionForm {
  return { standard: { ...form.standard }, questions: form.questions.map((q) => ({ ...q, options: [...q.options] })) };
}

/**
 * The application form editor: which standard fields are asked (off / optional / required) and the custom
 * questions. Used by a position and by Settings → Application form (the company default).
 */
export function ApplicationFormEditor({ value, onChange, errors = {}, onClearErrors }: {
  value: PositionForm;
  onChange: (form: PositionForm) => void;
  errors?: Errors;
  /** Called with the error keys an edit makes stale. */
  onClearErrors?: (...keys: string[]) => void;
}) {
  const clear = (...keys: string[]) => onClearErrors?.(...keys);
  const clearQuestions = () => clear(...Object.keys(errors).filter((k) => k.startsWith('form.questions')), 'form');
  const setRule = (key: (typeof STANDARD_FIELDS)[number]['key'], rule: FieldRule) => {
    onChange({ ...value, standard: { ...value.standard, [key]: rule } });
    clear('form', `form.standard.${key}`);
  };
  const setQuestions = (questions: FormQuestion[]) => onChange({ ...value, questions });
  const update = (i: number, patch: Partial<FormQuestion>) => setQuestions(value.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, dir: -1 | 1) => {
    const to = i + dir;
    if (to < 0 || to >= value.questions.length) return;
    const qs = [...value.questions];
    [qs[i], qs[to]] = [qs[to], qs[i]];
    setQuestions(qs);
    clearQuestions();
  };

  return (
    <>
      <FieldMessage error={errors.form} />
      <div className="divide-y divide-line rounded-lg border border-line">
        {STANDARD_FIELDS.map((f) => (
          <div key={f.key} className={cx('flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between', errors[`form.standard.${f.key}`] && 'bg-[var(--tt-danger-soft)]')}>
            <span className="text-sm font-medium text-fg">{f.label}</span>
            <SegmentedControl fitText options={FIELD_RULE_OPTIONS} value={value.standard[f.key]} onChange={(v) => setRule(f.key, v)} />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-semibold text-fg sm:text-[13px]">Custom questions</p>
        {value.questions.length === 0 && <p className="mb-2 text-xs text-fg-muted">No custom questions.</p>}
        <ol className="space-y-3">
          {value.questions.map((q, i) => {
            const optErr = errors[`form.questions.${i}.options`];
            return (
              <li key={q.key} className="rounded-lg border border-line p-3">
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[1fr_150px]">
                    <TextField label={`Question ${i + 1}`} required value={q.label} maxLength={200}
                      onChange={(v) => { update(i, { label: v }); clear(`form.questions.${i}.label`, 'form'); }}
                      error={errors[`form.questions.${i}.label`]} />
                    <SelectField label="Answer type" value={q.type}
                      options={(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
                      onChange={(v) => { update(i, { type: (v || 'text') as QuestionType }); clear(`form.questions.${i}.options`); }} />
                    {q.type === 'choice' && (
                      <div className="sm:col-span-2">
                        <FieldLabel label="Options (one per line)" required />
                        <div className={cx(shellClass(Boolean(optErr)), 'h-auto py-2')}>
                          <textarea
                            value={q.options.join('\n')}
                            onChange={(e) => { update(i, { options: e.target.value.split('\n') }); clear(`form.questions.${i}.options`); }}
                            rows={3}
                            aria-label={`Options for question ${i + 1}`}
                            aria-invalid={Boolean(optErr) || undefined}
                            className="w-full resize-y bg-transparent text-sm text-fg outline-none"
                          />
                        </div>
                        <FieldMessage error={optErr} />
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs font-semibold text-fg sm:col-span-2">
                      <Switch checked={q.required} onChange={(v) => update(i, { required: v })} label={`Question ${i + 1} required`} />
                      Required
                    </label>
                  </div>
                  <div className="mt-6 flex shrink-0 flex-col gap-1">
                    <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move question ${i + 1} up`}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" className={iconBtn} disabled={i === value.questions.length - 1} onClick={() => move(i, 1)} aria-label={`Move question ${i + 1} down`}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" className={cx(iconBtn, 'hover:text-[var(--tt-danger)]')} onClick={() => { setQuestions(value.questions.filter((_, j) => j !== i)); clearQuestions(); }} aria-label={`Remove question ${i + 1}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setQuestions([...value.questions, { key: newKey('q'), label: '', type: 'text', required: false, options: [] }])}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-line-strong px-3 text-xs font-semibold text-fg hover:bg-bg-subtle sm:text-sm">
          <Plus className="h-3.5 w-3.5" />Add question
        </button>
      </div>
    </>
  );
}

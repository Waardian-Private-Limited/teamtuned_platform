'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { useExitsBasePath } from '../hooks/useExitsBasePath';
import { useLoad } from '../hooks/useLoad';
import type { InterviewQuestion, QuestionType } from '../types/exits';
import { Card, Skeleton } from './parts';

const TYPES: { value: QuestionType; label: string }[] = [
  { value: 'text', label: 'Free text' }, { value: 'rating', label: 'Rating 1 to 5' }, { value: 'choice', label: 'Pick one' }, { value: 'yes_no', label: 'Yes or no' },
];
const newId = () => `q_${Math.random().toString(36).slice(2, 8)}`;

/** Admin editor of the exit interview questions every leaver is asked. */
export function InterviewFormAdminPage() {
  const base = useExitsBasePath();
  const q = useLoad(() => api.interviewForm(), []);
  const [questions, setQuestions] = React.useState<InterviewQuestion[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => { if (q.data) setQuestions(q.data.questions ?? []); }, [q.data]);

  const patch = (i: number, p: Partial<InterviewQuestion>) => setQuestions((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) => setQuestions((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const save = async () => {
    if (questions.some((x) => !x.label.trim())) { setErr('Every question needs text'); return; }
    if (questions.some((x) => x.type === 'choice' && (x.options ?? []).map((o) => (typeof o === 'string' ? o : o.value).trim()).filter(Boolean).length < 2)) { setErr('A pick-one question needs at least two options'); return; }
    setBusy(true);
    try {
      await api.saveInterviewForm({ questions: questions.map((x) => ({ ...x, label: x.label.trim(), options: x.type === 'choice' ? (x.options ?? []).map((o) => (typeof o === 'string' ? o : o.value).trim()).filter(Boolean) : undefined })) });
      showSuccess('Interview form saved'); setErr(null); q.reload();
    } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-8">
      <Link href={base} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> All exits</Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="text-xl font-extrabold text-fg sm:text-2xl">Exit interview form</h1><p className="text-sm text-fg-muted">Asked once an exit is accepted. Leavers can hide their answers from their manager.</p></div>
        <Btn variant="primary" busy={busy} onClick={save}>Save form</Btn>
      </header>
      {(q.error || err) && <Alert message={q.error || err || ''} />}
      {q.loading && !q.data ? <Skeleton className="h-40" /> : (
        <>
          {questions.length === 0 && <Card><p className="text-sm text-fg-muted">No questions yet. Without questions leavers see no interview.</p></Card>}
          {questions.map((x, i) => (
            <Card key={x.id}>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1"><TextField label={`Question ${i + 1}`} required value={x.label} onChange={(v) => patch(i, { label: v })} maxLength={300} /></div>
                  <div className="mt-6 flex shrink-0">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Move down" disabled={i === questions.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" aria-label="Remove question" onClick={() => setQuestions((l) => l.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField<QuestionType> label="Answer type" value={x.type} onChange={(v) => { if (v) patch(i, { type: v }); }} options={TYPES} />
                  <label className="flex items-center gap-2 pt-6 text-sm text-fg"><input type="checkbox" checked={Boolean(x.required)} onChange={(e) => patch(i, { required: e.target.checked })} className="h-4 w-4" /> Required</label>
                </div>
                {x.type === 'choice' && <TextField label="Options" value={(x.options ?? []).map((o) => (typeof o === 'string' ? o : o.label)).join(', ')} onChange={(v) => patch(i, { options: v.split(',') })} hint="Separate options with commas" />}
              </div>
            </Card>
          ))}
          <div><Btn icon={<Plus className="h-4 w-4" />} onClick={() => setQuestions((l) => [...l, { id: newId(), label: '', type: 'text' }])}>Add question</Btn></div>
        </>
      )}
    </div>
  );
}

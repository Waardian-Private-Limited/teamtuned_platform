'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, Lock, Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';
import { usePermission } from '@/lib/hooks/usePermission';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip, SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Textarea } from '@/components/ui/Textarea';
import { btnClass, Btn, IconBtn, PageHead, Panel, Table, td } from '@/features/performance/components/ui';
import * as api from '../api/surveys.api';
import type { MySurvey, Question, QuestionType, Survey, SurveyForm, SurveyList } from '../api/surveys.api';

type Tab = 'answer' | 'manage';
export const SURVEY_MANAGE = 'SURVEY_MANAGE';
const TYPE_LABEL: Record<QuestionType, string> = { rating: 'Agree 1 to 5', enps: 'Recommend 0 to 10', choice: 'Pick one', text: 'Comment' };
const STATUS_LABEL = { draft: 'Draft', open: 'Open', closed: 'Closed' } as const;
const tone = (s: Survey['status']) => (s === 'open' ? 'active' : s === 'closed' ? 'terminated' : 'neutral');

/** Surveys: the ones I am asked to answer, and (SURVEY_MANAGE) running them. */
export function SurveysPage({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { can } = usePermission();
  const manager = can(SURVEY_MANAGE);
  const tab: Tab = manager && params.get('tab') === 'manage' ? 'manage' : 'answer';
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead title="Surveys" subtitle="Anonymous pulse and engagement surveys" help={HELP.surveys}
        actions={manager ? <SegmentedControl<Tab> options={[{ value: 'answer', label: 'To answer' }, { value: 'manage', label: 'Run surveys' }]} value={tab} onChange={(t) => router.replace(`?tab=${t}`, { scroll: false })} fitText /> : undefined} />
      {tab === 'answer' ? <AnswerList /> : <ManageList basePath={basePath} />}
    </div>
  );
}

function AnswerList() {
  const [items, setItems] = React.useState<MySurvey[] | null>(null);
  const [error, setError] = React.useState('');
  const [open, setOpen] = React.useState<number | null>(null);
  const load = React.useCallback(() => api.mine().then((d) => setItems(d.items)).catch((e) => setError(messageOf(e))), []);
  React.useEffect(() => { load(); }, [load]);
  return (
    <Panel>
      {error && <p role="alert" className="p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {!items && !error && <TableSkeleton rows={3} columns={3} />}
      {items?.length === 0 && <div className="flex flex-1 items-center justify-center p-4"><EmptyState illustration={{ src: '/vectors/notifications.svg', width: 220, height: 160, alt: '' }} title="No survey to answer" description="When HR opens a survey for you, it shows up here." /></div>}
      {items && items.length > 0 && (
        <Table minWidth={520} head={[{ label: 'Survey' }, { label: 'Closes', className: 'w-36' }, { label: 'Actions', className: 'w-36 text-right' }]}>
          {items.map((s) => (
            <tr key={s.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={td}><span className="font-semibold">{s.title}</span><span className="block text-[11px] text-fg-muted">{s.question_count} questions</span></td>
              <td className={`${td} text-fg-muted`}>{formatDate(s.closes_on)}</td>
              <td className={`${td} text-right`}>{s.responded ? <StatusPill label="Answered" tone="active" /> : <Btn size="sm" onClick={() => setOpen(s.id)}>Answer</Btn>}</td>
            </tr>
          ))}
        </Table>
      )}
      {open && <AnswerDialog id={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); showSuccess('Thank you. Your answers were saved without your name.'); load(); }} />}
    </Panel>
  );
}

function AnswerDialog({ id, onClose, onDone }: { id: number; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = React.useState<SurveyForm | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string | number>>({});
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { api.form(id).then(setForm).catch((e) => setError(messageOf(e))); }, [id]);
  const set = (q: string, v: string | number) => { setAnswers({ ...answers, [q]: v }); setError(''); };
  const send = async () => {
    setBusy(true); setError('');
    try { await api.respond(id, answers); onDone(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  const scale = (q: Question, from: number, to: number) => (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={q.text}>
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={answers[q.id] === n} onClick={() => set(q.id, n)}
          className={`h-9 min-w-9 rounded-lg border px-2 text-sm font-semibold transition-colors ${answers[q.id] === n ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line bg-surface text-fg hover:bg-bg-subtle'}`}>{n}</button>
      ))}
    </div>
  );
  return (
    <Dialog open onClose={onClose} title={form?.title || 'Survey'} maxWidthClassName="max-w-2xl" footer={<><Btn variant="secondary" onClick={onClose}>Later</Btn><Btn loading={busy} disabled={!form?.open} onClick={send}>Send anonymously</Btn></>}>
      {!form ? (error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-lg bg-bg-subtle" />) : (
        <div className="space-y-5">
          <p className="flex items-start gap-2 rounded-lg bg-bg-subtle p-3 text-xs text-fg"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />Your answers are saved without your name. Results only show for groups of {form.min_group} or more.</p>
          {form.intro && <p className="text-sm text-fg">{form.intro}</p>}
          {form.questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-semibold text-fg">{i + 1}. {q.text}{q.required && <span className="text-[var(--tt-danger)]"> *</span>}</p>
              {q.type === 'rating' && <>{scale(q, 1, 5)}<p className="text-[11px] text-fg-muted">1 strongly disagree · 5 strongly agree</p></>}
              {q.type === 'enps' && <>{scale(q, 0, 10)}<p className="text-[11px] text-fg-muted">0 not at all likely · 10 extremely likely</p></>}
              {q.type === 'choice' && <div className="flex flex-wrap gap-1.5">{q.options?.map((o) => <Chip key={o} active={answers[q.id] === o} onClick={() => set(q.id, o)}>{o}</Chip>)}</div>}
              {q.type === 'text' && <Textarea label="" aria-label={q.text} rows={3} maxLength={2000} value={String(answers[q.id] ?? '')} onChange={(e) => set(q.id, e.target.value)} hint="Avoid names or details that would show who you are." />}
            </div>
          ))}
          {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
        </div>
      )}
    </Dialog>
  );
}

function ManageList({ basePath }: { basePath: string }) {
  const [data, setData] = React.useState<SurveyList | null>(null);
  const [error, setError] = React.useState('');
  const [editing, setEditing] = React.useState<Survey | 'new' | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  const load = React.useCallback(() => api.list().then(setData).catch((e) => setError(messageOf(e))), []);
  React.useEffect(() => { load(); }, [load]);
  const act = (s: Survey, what: 'open' | 'close' | 'remind', done: string) => async () => {
    try { const r = await api.action(s.id, what); showSuccess(what === 'remind' ? `Reminded ${r.reminded ?? 0} people` : done); load(); } catch (e) { setError(messageOf(e)); }
  };
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <p className="text-xs text-fg-muted">Start from a ready set and edit it. Locked once open.</p>
        <Btn icon={Plus} onClick={() => setEditing('new')}>New survey</Btn>
      </div>
      {error && <p role="alert" className="p-3 text-sm text-[var(--tt-danger)]">{error}</p>}
      {!data && !error && <TableSkeleton rows={4} columns={5} />}
      {data?.items.length === 0 && <div className="flex flex-1 items-center justify-center p-4"><EmptyState illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="No surveys yet" description="A five-question pulse every month shows how people feel long before anyone resigns." action={{ label: 'New survey', onClick: () => setEditing('new') }} /></div>}
      {data && data.items.length > 0 && (
        <Table minWidth={820} head={[{ label: 'Survey' }, { label: 'Status', className: 'w-28' }, { label: 'Closes', className: 'w-32' }, { label: 'Answered', className: 'w-36' }, { label: 'Actions', className: 'w-72 text-right' }]}>
          {data.items.map((s) => (
            <tr key={s.id} className="transition-colors hover:bg-bg-subtle/50">
              <td className={td}><span className="font-semibold">{s.title}</span><span className="block text-[11px] text-fg-muted">{s.questions.length} questions · groups of {s.min_group}+{s.audience.department_ids.length ? ` · ${s.audience.department_ids.length} departments` : ' · everyone'}</span></td>
              <td className={td}><StatusPill label={STATUS_LABEL[s.status]} tone={tone(s.status)} /></td>
              <td className={`${td} text-fg-muted`}>{formatDate(s.closes_on)}</td>
              <td className={td}>{s.status === 'draft' ? '—' : `${s.responded_count ?? 0} of ${s.invited_count}`}</td>
              <td className={`${td} text-right`}>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {s.status === 'draft' && <Btn variant="secondary" size="sm" onClick={() => setEditing(s)}>Edit</Btn>}
                  {s.status === 'draft' && <Btn size="sm" onClick={() => setConfirm({ title: `Open "${s.title}"?`, body: <p className="text-sm text-fg">Everyone in the audience is told. Questions cannot change after this.</p>, cta: 'Open survey', run: act(s, 'open', 'Survey opened') })}>Open</Btn>}
                  {s.status === 'draft' && <IconBtn label="Delete" onClick={async () => { await api.remove(s.id); load(); }}><Trash2 className="h-4 w-4" /></IconBtn>}
                  {s.status === 'open' && <Btn variant="secondary" size="sm" onClick={act(s, 'remind', '')}>Remind</Btn>}
                  {s.status === 'open' && <Btn variant="secondary" size="sm" onClick={() => setConfirm({ title: 'Close this survey?', body: <p className="text-sm text-fg">Nobody can answer after this.</p>, cta: 'Close', run: act(s, 'close', 'Survey closed') })}>Close</Btn>}
                  {s.status !== 'draft' && <Link href={`${basePath}/surveys/${s.id}`} className={btnClass('secondary', 'sm')}><BarChart3 className="h-3.5 w-3.5" />Results</Link>}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {editing && data && <SurveyDialog survey={editing === 'new' ? null : editing} list={data} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); showSuccess('Saved as a draft'); load(); }} />}
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </Panel>
  );
}

function SurveyDialog({ survey, list, onClose, onSaved }: { survey: Survey | null; list: SurveyList; onClose: () => void; onSaved: () => void }) {
  const inTwoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const [title, setTitle] = React.useState(survey?.title || '');
  const [intro, setIntro] = React.useState(survey?.intro || '');
  const [closes, setCloses] = React.useState(survey?.closes_on || inTwoWeeks);
  const [minGroup, setMinGroup] = React.useState(String(survey?.min_group ?? 5));
  const [depts, setDepts] = React.useState<number[]>(survey?.audience.department_ids || []);
  const [questions, setQuestions] = React.useState<Question[]>(survey?.questions || []);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const setQ = (i: number, patch: Partial<Question>) => setQuestions(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const starter = (key: string) => { const s = list.starters.find((x) => x.key === key); if (s) { setQuestions(s.questions.map((q) => ({ ...q }))); if (!title) setTitle(s.title); } };
  const save = async () => {
    setBusy(true); setError('');
    const body = { title, intro, closes_on: closes, min_group: Number(minGroup), audience: { department_ids: depts }, questions };
    try { if (survey) await api.update(survey.id, body); else await api.create(body); onSaved(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={survey ? 'Edit survey' : 'New survey'} maxWidthClassName="max-w-3xl" footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Save draft</Btn></>}>
      <div className="space-y-3">
        {!survey && <div className="flex flex-wrap items-center gap-1.5"><span className="text-xs font-semibold text-fg">Start from:</span>{list.starters.map((s) => <Chip key={s.key} active={false} onClick={() => starter(s.key)}>{s.title}</Chip>)}</div>}
        <TextField label="Title" required value={title} onChange={setTitle} maxLength={200} />
        <Textarea label="Note to people (optional)" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Closes on" type="date" required value={closes} onChange={setCloses} />
          <TextField label="Smallest group shown" type="number" value={minGroup} onChange={setMinGroup} hint="3 to 50. Fewer answers than this are never shown." />
        </div>
        {list.departments.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-fg">Who is asked <span className="font-normal text-fg-muted">· none chosen = everyone</span></p>
            <div className="flex flex-wrap gap-1.5">{list.departments.map((d) => <Chip key={d.id} active={depts.includes(d.id)} onClick={() => setDepts(depts.includes(d.id) ? depts.filter((x) => x !== d.id) : [...depts, d.id])}>{d.name}</Chip>)}</div>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg">Questions</p>
          {questions.map((q, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_11rem_auto]">
                <TextField label="" aria-label="Question" value={q.text} onChange={(v) => setQ(i, { text: v })} maxLength={300} placeholder="Write the question" />
                <SelectField<QuestionType> label="" value={q.type} onChange={(v) => v && setQ(i, { type: v, options: v === 'choice' ? q.options || ['', ''] : undefined })} options={(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => ({ value: t, label: TYPE_LABEL[t] }))} />
                <div className="pt-0.5"><IconBtn label="Remove question" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></IconBtn></div>
              </div>
              {q.type === 'choice' && <TextField label="" aria-label="Choices" value={(q.options || []).join(', ')} onChange={(v) => setQ(i, { options: v.split(',').map((x) => x.trimStart()) })} placeholder="Choices, separated by commas" />}
            </div>
          ))}
          <Btn variant="secondary" size="sm" icon={Plus} onClick={() => setQuestions([...questions, { id: '', type: 'rating', text: '' }])}>Add question</Btn>
        </div>
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}

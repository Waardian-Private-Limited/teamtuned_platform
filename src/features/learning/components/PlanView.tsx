'use client';

import React from 'react';
import { BookOpen, Check, ExternalLink, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import { Btn, Card, IconBtn, Progress, Stat } from '@/features/performance/components/ui';
import * as api from '../api/learning.api';
import type { Gap, Plan, PlanItem } from '../api/learning.api';
import { KIND_LABEL, SOURCE_LABEL, STATUS_LABEL, statusTone } from './labels';

/** One learning plan: progress, skill gaps from the latest review (for whoever looks after it), and the items with their next step. */
export function PlanView({ employeeId }: { employeeId: number | 'me' }) {
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [gaps, setGaps] = React.useState<Gap[]>([]);
  const [error, setError] = React.useState('');
  const [adding, setAdding] = React.useState<{ gap?: Gap } | null>(null);
  const [finishing, setFinishing] = React.useState<PlanItem | null>(null);
  const [busy, setBusy] = React.useState(0);

  const load = React.useCallback(() => {
    api.plan(employeeId).then((p) => { setPlan(p); if (p.permissions.can_assign) api.gaps(employeeId).then((g) => setGaps(g.items)).catch(() => setGaps([])); }).catch((e) => setError(messageOf(e)));
  }, [employeeId]);
  React.useEffect(() => { load(); }, [load]);

  if (!plan) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;
  const p = plan.permissions;
  const move = async (item: PlanItem, status: PlanItem['status'], done: string) => {
    setBusy(item.id); setError('');
    try { await api.updateItem(item.id, { status }); showSuccess(done); load(); } catch (e) { setError(messageOf(e)); } finally { setBusy(0); }
  };
  const drop = async (item: PlanItem) => {
    try { await api.removeItem(item.id); load(); } catch (e) { setError(messageOf(e)); }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Items" value={plan.progress.total} />
        <Stat label="Done" value={`${plan.progress.done}`} note={<Progress value={plan.progress.done} total={plan.progress.total} />} />
        <Stat label="Overdue" value={plan.progress.overdue} />
        <Stat label="Complete" value={`${plan.progress.percent}%`} />
      </div>
      {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}

      {p.can_assign && gaps.length > 0 && (
        <Card title={<span className="inline-flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" />Skill gaps</span>} note={`rated 2 or below in ${gaps[0].cycle_name}`}>
          <div className="divide-y divide-line/60">
            {gaps.map((g) => (
              <div key={g.competency_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg">{g.name} <span className="text-[11px] font-normal text-fg-muted">rated {g.rating} of 5</span></p>
                  <p className="text-[11px] text-fg-muted">{g.courses.length ? `Courses for it: ${g.courses.map((c) => c.title).join(', ')}` : 'No course in the catalog is tagged with this skill yet.'}</p>
                </div>
                <Btn variant="secondary" size="sm" icon={Plus} onClick={() => setAdding({ gap: g })}>Add to plan</Btn>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Plan" note={plan.person.name} right={(p.can_assign || p.can_add_own) ? <Btn size="sm" icon={Plus} onClick={() => setAdding({})}>{p.can_assign ? 'Assign learning' : 'Add something'}</Btn> : undefined}>
        {plan.items.length === 0 ? (
          <EmptyState compact illustration={{ src: '/vectors/review.svg', width: 220, height: 160, alt: '' }} title="Nothing to learn yet"
            description={p.can_assign ? 'Assign a course from the catalog, or start from a skill gap above.' : 'Your manager can assign learning, or add a course yourself.'} />
        ) : (
          <ul className="divide-y divide-line/60">
            {plan.items.map((i) => {
              const overdue = i.due_date && ['assigned', 'in_progress'].includes(i.status) && i.due_date < new Date().toISOString().slice(0, 10);
              return (
                <li key={i.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-fg-muted" />{i.title}
                      {i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-fg" aria-label="Open"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      <StatusPill label={STATUS_LABEL[i.status]} tone={statusTone(i.status)} />
                    </p>
                    <p className="text-[11px] text-fg-muted">{[SOURCE_LABEL[i.source], i.competency_name, i.course_kind ? KIND_LABEL[i.course_kind] : null, i.course_provider, i.duration_minutes ? `${i.duration_minutes} min` : null, i.assigned_by_name ? `by ${i.assigned_by_name}` : null].filter(Boolean).join(' · ')}</p>
                    {i.due_date && <p className={`text-[11px] ${overdue ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted'}`}>Due {formatDate(i.due_date)}{overdue ? ' · overdue' : ''}</p>}
                    {(i.proof_url || i.proof_note) && <p className="text-[11px] text-fg-muted">Proof: {i.proof_note}{i.proof_url && <> <a href={i.proof_url} target="_blank" rel="noopener noreferrer" className="underline">link</a></>}{i.verified_by_name ? ` · confirmed by ${i.verified_by_name}` : ''}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.is_learner && i.status === 'assigned' && <Btn variant="secondary" size="sm" loading={busy === i.id} onClick={() => move(i, 'in_progress', 'Started')}>Start</Btn>}
                    {p.is_learner && ['assigned', 'in_progress'].includes(i.status) && <Btn size="sm" icon={Check} onClick={() => setFinishing(i)}>Mark done</Btn>}
                    {p.can_confirm && i.status === 'completed' && <Btn size="sm" icon={Check} loading={busy === i.id} onClick={() => move(i, 'verified', 'Confirmed')}>Confirm</Btn>}
                    {p.can_confirm && !['verified', 'dropped'].includes(i.status) && <Btn variant="ghost" size="sm" onClick={() => move(i, 'dropped', 'Dropped')}>Drop</Btn>}
                    {i.can_remove && <IconBtn label="Remove" onClick={() => drop(i)}><Trash2 className="h-4 w-4" /></IconBtn>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {adding && <AddDialog employeeId={employeeId} gap={adding.gap} lead={p.can_assign} onClose={() => setAdding(null)} onSaved={() => { setAdding(null); showSuccess('Added to the plan'); load(); }} />}
      {finishing && <FinishDialog item={finishing} onClose={() => setFinishing(null)} onSaved={() => { setFinishing(null); showSuccess('Marked done. Your manager confirms it.'); load(); }} />}
    </div>
  );
}

function AddDialog({ employeeId, gap, lead, onClose, onSaved }: { employeeId: number | 'me'; gap?: Gap; lead: boolean; onClose: () => void; onSaved: () => void }) {
  const [courses, setCourses] = React.useState(gap?.courses || []);
  const [courseId, setCourseId] = React.useState<number | null>(gap?.courses[0]?.id ?? null);
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [due, setDue] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (!gap) api.catalog().then((c) => setCourses(c.items)).catch(() => setCourses([])); }, [gap]);
  const save = async () => {
    setBusy(true); setError('');
    try {
      await api.addItem(employeeId, courseId ? { course_id: courseId, due_date: due || null, competency_id: gap?.competency_id ?? null, from_gap: Boolean(gap) } : { title, url: url || undefined, due_date: due || null, competency_id: gap?.competency_id ?? null, from_gap: Boolean(gap) });
      onSaved();
    } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={gap ? `Learning for ${gap.name}` : lead ? 'Assign learning' : 'Add to my plan'} footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Add</Btn></>}>
      <div className="space-y-3">
        <SelectField<number> label="Course from the catalog" numeric value={courseId} placeholder="None: describe it below" onChange={setCourseId} options={courses.map((c) => ({ value: c.id, label: `${c.title}${c.provider ? ` · ${c.provider}` : ''}` }))} />
        {!courseId && (
          <>
            <TextField label="What to learn" required value={title} onChange={setTitle} maxLength={200} placeholder="For example: shadow two client calls with Rahul" />
            <TextField label="Link (optional)" value={url} onChange={setUrl} maxLength={1000} placeholder="https://" />
          </>
        )}
        <TextField label="Due (optional)" type="date" value={due} onChange={setDue} />
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}

function FinishDialog({ item, onClose, onSaved }: { item: PlanItem; onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = React.useState('');
  const [note, setNote] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const save = async () => {
    setBusy(true); setError('');
    try { await api.updateItem(item.id, { status: 'completed', proof_url: url || undefined, proof_note: note || undefined }); onSaved(); } catch (e) { setError(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={`Done: ${item.title}`} footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Mark done</Btn></>}>
      <div className="space-y-3">
        <TextField label="Certificate or proof link (optional)" value={url} onChange={setUrl} maxLength={1000} placeholder="https://" />
        <TextField label="What you took from it (optional)" value={note} onChange={setNote} maxLength={1000} />
        {error && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{error}</p>}
      </div>
    </Dialog>
  );
}

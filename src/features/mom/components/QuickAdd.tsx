'use client';

import React from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { fieldErrorsOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Chip } from '@/components/ui/FormControls';
import { inputCls } from '@/features/data-collection/components/shared/Ui';
import { Btn } from '@/features/performance/components/ui';
import * as api from '../api/mom.api';
import type { PointKind } from '../api/mom.api';
import type { PersonOption } from '@/features/task-management/types/tm.types';
import { AssignPicker, AudiencePicker, audienceLabelOf, EMPTY_ASSIGN, DEFAULT_AUDIENCE, ReviewerPicker, toAssign, toAudience, type AssignValue, type AudienceValue } from './AssignPicker';
import { duePresets, KIND_LABEL, KindInfo } from './parts';

const KINDS: PointKind[] = ['action', 'decision', 'note'];

/** A short line for the closed assign control: who, or which group. */
function summary(v: AssignValue): string {
  if (v.tab === 'people') return v.people.length === 0 ? 'Assign to' : v.people.length === 1 ? v.people[0].name : `${v.people.length} people`;
  const parts = [v.departmentIds.length ? `${v.departmentIds.length} department${v.departmentIds.length > 1 ? 's' : ''}` : '', v.siteIds.length ? `${v.siteIds.length} site${v.siteIds.length > 1 ? 's' : ''}` : ''].filter(Boolean);
  return parts.length ? parts.join(' at ') : 'Assign to';
}

/**
 * Add a point without leaving the keyboard: type, press Enter, type the next. For an action the assignees, due date and
 * flags sit right below. The kind stays put between points; everything else clears.
 */
export function QuickAdd({ meetingId, today, tasks, onAdded }: { meetingId: number; today: string; tasks?: boolean; onAdded: () => void }) {
  const [kind, setKind] = React.useState<PointKind>('action');
  const [text, setText] = React.useState('');
  const [assign, setAssign] = React.useState<AssignValue>(EMPTY_ASSIGN);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [due, setDue] = React.useState('');
  const [high, setHigh] = React.useState(false);
  const [signoff, setSignoff] = React.useState(false);
  const [ack, setAck] = React.useState(true);
  const [reviewer, setReviewer] = React.useState<PersonOption | null>(null);
  const [asTask, setAsTask] = React.useState(false);
  const [audience, setAudience] = React.useState<AudienceValue>(DEFAULT_AUDIENCE);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) { setFields({ text: kind === 'action' ? 'Write the action' : 'Write the point' }); input.current?.focus(); return; }
    setBusy(true); setError(''); setFields({});
    try {
      const body = kind === 'action'
        ? { kind, text: text.trim(), assign: toAssign(assign), due_on: due || null, priority: high ? ('high' as const) : ('normal' as const), needs_signoff: signoff, ...(signoff && reviewer ? { signoff_employee_id: reviewer.id } : {}) }
        : { kind, text: text.trim(), ...(kind === 'decision' && ack ? { needs_ack: true } : {}), ...(toAudience(audience) ? { audience: toAudience(audience) } : {}) };
      const added = await api.addPoint(meetingId, body);
      if (added.created > 1) showSuccess(`${added.created} actions added, one for each person`);
      if (kind === 'action' && asTask) {
        if (added.access.can_make_task) { await api.makeTask(added.point.id); showSuccess('Added and converted to task'); }
        else showError('Added, but it was not converted to a task. Choose one owner first.');
      }
      setText(''); setAssign(EMPTY_ASSIGN); setAssignOpen(false); setDue(''); setHigh(false); setSignoff(false); setAck(true); setReviewer(null); setAsTask(false); setAudience(DEFAULT_AUDIENCE);
      onAdded();
      input.current?.focus();
    } catch (err) {
      const r = fieldErrorsOf(err);
      setFields(r.fields); setError(r.general);
      if (r.fields.assign) setAssignOpen(true);
    } finally { setBusy(false); }
  };

  const fieldError = fields.text || fields.due_on;
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-line bg-surface p-3 shadow-xs sm:p-4" aria-label="Add a point">
      <div className="flex gap-2">
        <input ref={input} className={inputCls(Boolean(fields.text))} value={text} maxLength={1000} aria-label="Point" aria-invalid={Boolean(fields.text)}
          placeholder={kind === 'action' ? 'What needs to be done?' : kind === 'decision' ? 'What was decided?' : 'Add a note'}
          onChange={(e) => { setText(e.target.value); setFields((f) => ({ ...f, text: '' })); }} />
        <Btn type="submit" icon={Plus} loading={busy} className="shrink-0">Add</Btn>
      </div>
      {fieldError && <p role="alert" className="-mt-1 text-xs text-[var(--tt-danger)]">{fieldError}</p>}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Kind of point">
        {KINDS.map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>)}
        <KindInfo />
        {kind === 'decision' && <Chip active={ack} onClick={() => setAck(!ack)}>Ask people to acknowledge</Chip>}
      </div>
      {kind !== 'action' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-fg-muted">Share with: {audienceLabelOf(audience)}</p>
          <AudiencePicker value={audience} onChange={(v) => { setAudience(v); setFields((f) => ({ ...f, audience: '' })); }} />
        </div>
      )}
      {fields.audience && <p role="alert" className="-mt-1 text-xs text-[var(--tt-danger)]">{fields.audience}</p>}
      {kind === 'action' && (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Chip active={assignOpen || Boolean(toAssign(assign))} onClick={() => setAssignOpen(!assignOpen)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden />{summary(assign)}
            </Chip>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Due date">
              {duePresets(today).map((d) => <Chip key={d.value} active={due === d.value} onClick={() => setDue(due === d.value ? '' : d.value)}>{d.label}</Chip>)}
              <input type="date" aria-label="Pick a due date" value={due} min={today} onChange={(e) => setDue(e.target.value)} className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-fg" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip active={high} onClick={() => setHigh(!high)}>High priority</Chip>
              <Chip active={signoff} onClick={() => { setSignoff(!signoff); if (signoff) setReviewer(null); }}>Needs sign-off</Chip>
              {tasks && <Chip active={asTask} onClick={() => setAsTask(!asTask)}>Convert to task</Chip>}
            </div>
          </div>
          {signoff && <ReviewerPicker value={reviewer} onChange={(v) => { setReviewer(v); setFields((f) => ({ ...f, signoff_employee_id: '' })); }} invalid={Boolean(fields.signoff_employee_id)} />}
          {fields.signoff_employee_id && <p role="alert" className="-mt-1 text-xs text-[var(--tt-danger)]">{fields.signoff_employee_id}</p>}
          {assignOpen && <AssignPicker value={assign} onChange={(v) => { setAssign(v); setFields((f) => ({ ...f, assign: '' })); }} invalid={Boolean(fields.assign)} />}
          {fields.assign && <p role="alert" className="-mt-1 text-xs text-[var(--tt-danger)]">{fields.assign}</p>}
        </>
      )}
      {error && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
    </form>
  );
}

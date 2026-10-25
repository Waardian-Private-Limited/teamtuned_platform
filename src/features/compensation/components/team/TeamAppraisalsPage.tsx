'use client';

import React from 'react';
import { CheckCircle2, Save, Send } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/compensation.api';
import { resetAppraisalReviewer } from '../../hooks/useAppraisalReviewer';
import type { TeamAppraisalDto } from '../../types/compensation.dto';
import { date } from '../../utils/format';
import { Btn } from '../shared/Buttons';
import { ConfirmDialog, type ConfirmState } from '../shared/ConfirmDialog';
import { AssessmentFields, assessmentFrom, assessmentItem, type Assessment } from './AssessmentFields';

type Errors = Record<number, Record<string, string>>;

/** "reviews.<revisionId>.<field>" → { revisionId: { field: message } }. */
function errorsFrom(list: { field: string; message: string }[]): Errors {
  const out: Errors = {};
  for (const m of list) {
    const [, id, field] = m.field.split('.');
    const n = Number(id);
    if (!n || !field) continue;
    out[n] = { ...(out[n] || {}), [field]: m.message };
  }
  return out;
}

/** Same checks the server makes before a manager submits, so problems show on the fields straight away. */
function localMissing(cycle: TeamAppraisalDto, values: Record<number, Assessment>) {
  const out: { field: string; message: string }[] = [];
  for (const p of cycle.people) {
    const v = values[p.revision_id];
    if (!v.rating) out.push({ field: `reviews.${p.revision_id}.rating`, message: 'Rate this person' });
    else if (cycle.comment_required.includes(v.rating) && !v.comment.trim()) out.push({ field: `reviews.${p.revision_id}.comment`, message: 'Add a comment for this rating' });
    if (v.recommend_promotion && !v.proposed_designation.trim()) out.push({ field: `reviews.${p.revision_id}.proposed_designation`, message: 'Name the proposed designation' });
  }
  return out;
}

function CycleCard({ cycle, onChanged }: { cycle: TeamAppraisalDto; onChanged: (next: TeamAppraisalDto | null) => void }) {
  const initial = React.useMemo(() => Object.fromEntries(cycle.people.map((p) => [p.revision_id, assessmentFrom(p)])), [cycle]);
  const [values, setValues] = React.useState<Record<number, Assessment>>(initial);
  const [dirty, setDirty] = React.useState<Set<number>>(new Set());
  const [errors, setErrors] = React.useState<Errors>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);
  React.useEffect(() => { setValues(initial); setDirty(new Set()); setErrors({}); }, [initial]);

  const locked = cycle.done;
  const rated = cycle.people.filter((p) => values[p.revision_id]?.rating).length;

  const change = (id: number, next: Assessment) => {
    setValues((v) => ({ ...v, [id]: next }));
    setDirty((d) => new Set(d).add(id));
    setErrors((e) => (e[id] ? { ...e, [id]: {} } : e));
  };

  const saveDirty = async () => {
    if (!dirty.size) return cycle;
    const items = [...dirty].map((id) => assessmentItem(id, values[id]));
    const next = await api.saveTeamAppraisal(cycle.id, items);
    setDirty(new Set());
    return next;
  };

  const fail = (err: unknown) => {
    const data = err instanceof ApiError ? (err.data as { field?: string; missing?: { field: string; message: string }[] } | null) : null;
    if (data?.missing?.length) setErrors(errorsFrom(data.missing));
    else if (data?.field?.startsWith('reviews.')) setErrors(errorsFrom([{ field: data.field, message: messageOf(err) }]));
    showError(messageOf(err));
  };

  const save = async () => {
    setBusy('save');
    try {
      onChanged(await saveDirty());
      showSuccess('Draft saved');
    } catch (err) { fail(err); } finally { setBusy(null); }
  };

  const submit = async () => {
    const missing = localMissing(cycle, values);
    if (missing.length) {
      setErrors(errorsFrom(missing));
      showError(`${missing.length} item${missing.length === 1 ? ' needs' : 's need'} attention before you submit`);
      return;
    }
    setConfirm({
      title: 'Submit ratings',
      body: <>You are submitting ratings for {cycle.total} {cycle.total === 1 ? 'person' : 'people'}. After this you cannot change them unless HR sends them back.</>,
      cta: 'Submit',
      run: async () => {
        setBusy('submit');
        try {
          await saveDirty();
          const next = await api.submitTeamAppraisal(cycle.id);
          resetAppraisalReviewer();
          showSuccess('Ratings submitted to HR');
          onChanged(next);
        } catch (err) { fail(err); } finally { setBusy(null); }
      },
    });
  };

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-fg sm:text-base">{cycle.name}</h2>
          <p className="text-[11px] text-fg-muted sm:text-xs">
            Review {date(cycle.period_start)} – {date(cycle.period_end)}{cycle.due_date ? ` · due ${date(cycle.due_date)}` : ''} · {rated} of {cycle.total} rated
          </p>
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-fg"><CheckCircle2 className="h-4 w-4" /> Submitted to HR</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Btn icon={<Save className="h-3.5 w-3.5" />} busy={busy === 'save'} disabled={!dirty.size} onClick={save}>Save draft</Btn>
            <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} busy={busy === 'submit'} onClick={submit}>Submit team</Btn>
          </div>
        )}
      </div>
      <ul className="divide-y divide-line">
        {cycle.people.map((p) => (
          <li key={p.revision_id} className={cx('p-3 sm:p-4', dirty.has(p.revision_id) && 'bg-bg-subtle/40')}>
            <div className="mb-2.5">
              <p className="text-sm font-semibold text-fg">{p.employee.name}</p>
              <p className="text-[11px] text-fg-muted">{[p.employee.employee_code, p.employee.designation, p.employee.department].filter(Boolean).join(' · ')}</p>
            </div>
            <AssessmentFields
              value={values[p.revision_id]}
              onChange={(next) => change(p.revision_id, next)}
              scale={cycle.scale}
              commentRequired={cycle.comment_required}
              errors={errors[p.revision_id]}
              disabled={locked}
            />
          </li>
        ))}
      </ul>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </section>
  );
}

/**
 * A manager rating their own people for an appraisal HR sent them. Only names and ratings: pay is never shown here, and HR
 * decides the increment. Ratings with the highest and lowest increment need a comment.
 */
export function TeamAppraisalsPage() {
  const [cycles, setCycles] = React.useState<TeamAppraisalDto[] | null>(null);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    api.teamAppraisals().then((r) => setCycles(r.cycles)).catch((e) => setError(messageOf(e)));
  }, []);

  const replace = (id: number, next: TeamAppraisalDto | null) => setCycles((list) => (list || []).map((c) => (c.id === id && next ? next : c)));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <div className="rounded-xl border border-line bg-surface p-3 sm:p-4">
        <h1 className="text-base font-bold text-fg sm:text-lg">Team appraisals</h1>
        <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">Rate each person who reports to you. HR sees your ratings and comments and decides the increment.</p>
      </div>
      {error && <Alert tone="error" message={error} />}
      {!cycles && !error && <TableSkeleton rows={6} columns={3} />}
      {cycles && cycles.length === 0 && (
        <div className="rounded-xl border border-dashed border-line bg-surface p-6 text-center">
          <p className="text-sm font-semibold text-fg">Nothing to rate right now</p>
          <p className="mt-1 text-xs text-fg-muted">When HR opens an appraisal for your team, it shows here.</p>
        </div>
      )}
      {cycles?.map((c) => <CycleCard key={c.id} cycle={c} onChanged={(next) => replace(c.id, next)} />)}
    </div>
  );
}

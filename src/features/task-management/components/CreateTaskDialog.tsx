'use client';

import { useEffect, useState } from 'react';
import { Paperclip, Plus, UserCheck, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePermission } from '@/lib/hooks/usePermission';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { Btn, Checkbox, Labeled, inputCls } from '@/features/data-collection/components/shared/Ui';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import type { Attachment } from '@/features/data-collection/types/dc.types';
import * as api from '../api/tm.api';
import { PRIORITIES, PRIORITY_LABEL, TM_PERMISSIONS } from '../constants/tm.constants';
import type { AssignKind, CreateInput, GoalOption, PersonOption, Priority } from '../types/tm.types';
import { PersonPicker } from './PersonPicker';

const KINDS = [{ value: 'employees', label: 'People' }, { value: 'site', label: 'Site' }, { value: 'department', label: 'Department' }, { value: 'role', label: 'Role' }] as const;
type Errs = Record<string, string>;

function MultiChoice({ items, value, onChange, invalid }: { items: { id: number; name: string }[]; value: number[]; onChange: (v: number[]) => void; invalid?: boolean }) {
  return (
    <div className={cx('max-h-40 overflow-y-auto rounded-lg border p-2', invalid ? 'border-[var(--tt-danger)]' : 'border-line')}>
      {items.length === 0 ? <p className="px-1 py-2 text-xs text-fg-muted">Nothing to choose from.</p> : items.map((i) => (
        <label key={i.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-bg-subtle">
          <input type="checkbox" className="h-4 w-4 accent-black" checked={value.includes(i.id)} onChange={(e) => onChange(e.target.checked ? [...value, i.id] : value.filter((x) => x !== i.id))} />
          <span className="truncate text-sm text-fg">{i.name}</span>
        </label>
      ))}
    </div>
  );
}

/**
 * One dialog to make a task and say who gets it: people, a site, a department or a role. Sending to a group makes one task per person.
 * Without TM_CREATE it is a task for yourself only (the server allows exactly that), so assigning, review and required data are hidden.
 */
export function CreateTaskDialog({ open, presetDue, onClose, onCreated }: { open: boolean; presetDue?: string | null; onClose: () => void; onCreated: (count: number) => void }) {
  const { can } = usePermission();
  const canAssign = can(TM_PERMISSIONS.CREATE);
  const { employee, employee_id: employeeId } = useAuth();
  const meId = employeeId ?? employee?.id ?? null;
  const options = useAsync(() => api.getOptions(), [], open && canAssign);
  const forms = useAsync(() => api.optionForms(), [], open && canAssign);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('17:00');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelText, setLabelText] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [itemText, setItemText] = useState('');
  const [review, setReview] = useState(false);
  const [reviewer, setReviewer] = useState<PersonOption[]>([]);
  const [formId, setFormId] = useState<number | null>(null);
  const [goalId, setGoalId] = useState<number | null>(null);
  const [goals, setGoals] = useState<GoalOption[]>([]);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [kind, setKind] = useState<AssignKind>('employees');
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [siteFilter, setSiteFilter] = useState<number[]>([]);
  const [errors, setErrors] = useState<Errs>({});
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate(''); setDueTime('17:00'); setLabels([]); setLabelText(''); setChecklist([]); setItemText('');
    setReview(false); setReviewer([]); setFormId(null); setFiles([]); setKind('employees'); setPeople([]); setIds([]); setSiteFilter([]); setErrors({});
  };
  const close = () => { reset(); onClose(); };
  useEffect(() => { if (open && presetDue) setDueDate(presetDue); }, [open, presetDue]);
  const me: PersonOption | null = meId ? { id: meId, name: 'Me', employee_code: null } : null;
  const assignedToMe = Boolean(me && people.some((p) => p.id === me.id));

  const addLabel = () => { const t = labelText.trim(); if (t && !labels.includes(t) && labels.length < 10) setLabels([...labels, t]); setLabelText(''); };
  const addItem = () => { const t = itemText.trim(); if (t && checklist.length < 50) setChecklist([...checklist, t]); setItemText(''); };
  const attach = async (f?: File) => { if (!f) return; try { const a = await api.uploadAttachment(f); setFiles((p) => [...p, a]); } catch (e) { showError(messageOf(e)); } };

  const assignIds = !canAssign ? (meId ? [meId] : []) : kind === 'employees' ? people.map((p) => p.id) : ids;
  const count = !canAssign ? 1 : kind === 'employees' ? people.length : null;
  // A task for one person can count toward one of their goals (Performance), when they have any.
  const single = assignIds.length === 1 && (!canAssign || kind === 'employees') ? assignIds[0] : null;
  useEffect(() => {
    setGoalId(null);
    if (!single) { setGoals([]); return; }
    api.optionGoals(single).then((d) => setGoals(d.items)).catch(() => setGoals([]));
  }, [single]);

  const submit = async () => {
    const local: Errs = {};
    if (!title.trim()) local.title = 'Give the task a title';
    if (!assignIds.length) local.assign = !canAssign ? 'Your account is not linked to an employee' : kind === 'employees' ? 'Choose at least one person' : `Choose at least one ${kind}`;
    if (dueDate && Number.isNaN(Date.parse(`${dueDate}T${dueTime || '00:00'}`))) local.due_at = 'Choose a valid date and time';
    setErrors(local);
    if (Object.keys(local).length) return;
    const body: CreateInput = {
      title: title.trim(), description: description.trim() || undefined, priority, labels, checklist, requires_review: review,
      reviewer_employee_id: review ? reviewer[0]?.id ?? null : null, form_id: formId, attachments: files, goal_item_id: single ? goalId : null,
      due_at: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null,
      assign: canAssign ? { kind, ids: assignIds, ...(kind === 'department' || kind === 'role' ? { site_ids: siteFilter } : {}) } : { kind: 'employees', ids: assignIds },
    };
    setBusy(true);
    try {
      const r = await api.createTask(body);
      showSuccess(!canAssign || (r.count === 1 && assignedToMe) ? 'Task added' : r.count === 1 ? 'Task sent' : `${r.count} tasks sent`);
      onCreated(r.count);
      close();
    } catch (e) {
      const server = e instanceof ApiError ? (e.data as { details?: { errors?: Errs } })?.details?.errors : undefined;
      if (server) setErrors(server); else showError(messageOf(e));
    } finally { setBusy(false); }
  };

  const o = options.data;
  return (
    <Dialog open={open} onClose={close} title="New task" maxWidthClassName="max-w-2xl"
      footer={<><span className="mr-auto self-center text-xs text-fg-muted">{count !== null ? `Creates ${count} task${count === 1 ? '' : 's'}` : 'One task for each active person who matches'}</span><Btn onClick={close}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={submit}>{!canAssign || (assignedToMe && people.length === 1) ? 'Add task' : 'Send task'}</Btn></>}>
      <div className="space-y-4">
        <Labeled label="Title" error={errors.title} required><input className={inputCls(Boolean(errors.title))} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} aria-invalid={Boolean(errors.title)} placeholder="What needs to be done?" /></Labeled>
        <Labeled label="Details"><textarea rows={3} className={cx(inputCls(), 'h-auto py-2')} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context, steps or links" /></Labeled>

        <div className="grid gap-3 sm:grid-cols-3">
          <Labeled label="Priority"><select className={inputCls()} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></Labeled>
          <Labeled label="Due date" error={errors.due_at}><input type="date" className={inputCls(Boolean(errors.due_at))} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Labeled>
          <Labeled label="Due time"><input type="time" className={inputCls()} value={dueTime} disabled={!dueDate} onChange={(e) => setDueTime(e.target.value)} /></Labeled>
        </div>

        {!canAssign ? (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-bg-subtle px-3 py-2 text-xs font-semibold text-fg"><UserCheck className="h-4 w-4" />Assigned to you{errors.assign && <span className="font-medium text-[var(--tt-danger)]"> · {errors.assign}</span>}</p>
        ) : (
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-fg sm:text-[13px]">Assign to <span className="text-[var(--tt-danger)]">*</span></span>
            {me && !(kind === 'employees' && assignedToMe) && (
              <button type="button" onClick={() => { setKind('employees'); setIds([]); setPeople(kind === 'employees' ? [...people, me] : [me]); setErrors({ ...errors, assign: '' }); }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-fg underline-offset-2 hover:underline"><UserCheck className="h-3.5 w-3.5" />Assign to me</button>
            )}
          </div>
          <SegmentedControl options={KINDS} value={kind} onChange={(v) => { setKind(v); setIds([]); setPeople([]); setErrors({ ...errors, assign: '' }); }} />
          <div className="mt-3">
            {kind === 'employees' && <PersonPicker multiple value={people} onChange={setPeople} invalid={Boolean(errors.assign)} placeholder="Search people to add" />}
            {kind === 'site' && <MultiChoice invalid={Boolean(errors.assign)} items={o?.sites || []} value={ids} onChange={setIds} />}
            {kind === 'department' && <MultiChoice invalid={Boolean(errors.assign)} items={o?.departments || []} value={ids} onChange={setIds} />}
            {kind === 'role' && <MultiChoice invalid={Boolean(errors.assign)} items={o?.roles || []} value={ids} onChange={setIds} />}
            {errors.assign && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors.assign}</p>}
          </div>
          {(kind === 'department' || kind === 'role') && (
            <div className="mt-3"><span className="mb-1.5 block text-xs font-semibold text-fg">Only at these sites <span className="font-normal text-fg-muted">(optional)</span></span><MultiChoice items={o?.sites || []} value={siteFilter} onChange={setSiteFilter} /></div>
          )}
        </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Labeled label="Checklist">
              <div className="flex gap-2"><input className={inputCls()} value={itemText} onChange={(e) => setItemText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }} placeholder="Add a step" /><Btn aria-label="Add step" onClick={addItem} icon={<Plus className="h-4 w-4" />} /></div>
            </Labeled>
            {checklist.length > 0 && <ul className="mt-2 space-y-1">{checklist.map((c, i) => <li key={`${c}${i}`} className="flex items-center justify-between gap-2 rounded-md bg-bg-subtle px-2.5 py-1.5 text-sm"><span className="truncate">{c}</span><button type="button" aria-label="Remove" onClick={() => setChecklist(checklist.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button></li>)}</ul>}
          </div>
          <div>
            <Labeled label="Labels">
              <div className="flex gap-2"><input className={inputCls()} value={labelText} onChange={(e) => setLabelText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }} placeholder="e.g. safety" /><Btn aria-label="Add label" onClick={addLabel} icon={<Plus className="h-4 w-4" />} /></div>
            </Labeled>
            {labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{labels.map((l) => <span key={l} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-semibold">{l}<button type="button" aria-label={`Remove ${l}`} onClick={() => setLabels(labels.filter((x) => x !== l))} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button></span>)}</div>}
          </div>
        </div>

        {goals.length > 0 && (
          <Labeled label="Counts toward goal" hint="Pick one of their goals; a goal measured from linked tasks counts this task when it is done.">
            <select className={inputCls()} value={goalId ?? ''} onChange={(e) => setGoalId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">No goal</option>{goals.map((g) => <option key={g.id} value={g.id}>{g.name}{g.kra_name ? ` (${g.kra_name})` : ''} · {g.cycle_name}{g.counts_tasks ? ' · counts tasks' : ''}</option>)}
            </select>
          </Labeled>
        )}

        {canAssign && <>
        <Labeled label="Required data" hint="The assignee fills this form when finishing the task.">
          <select className={inputCls()} value={formId ?? ''} onChange={(e) => setFormId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">None</option>{forms.data?.items.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Labeled>

        <div>
          <Checkbox checked={review} onChange={setReview} label="Needs review" hint="The work is checked before the task counts as done." />
          {review && <div className="mt-2"><Labeled label="Reviewer" hint="Leave empty and you review it, as the person raising the task."><PersonPicker value={reviewer} onChange={setReviewer} placeholder="Search a reviewer" /></Labeled></div>}
        </div>
        </>}

        <div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-fg-muted hover:text-fg"><Paperclip className="h-3.5 w-3.5" />Attach files<input type="file" className="hidden" accept="image/png,image/jpeg,application/pdf" onChange={(e) => { void attach(e.target.files?.[0]); e.target.value = ''; }} /></label>
          {files.length > 0 && <ul className="mt-2 flex flex-wrap gap-1.5">{files.map((f, i) => <li key={f.key} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-semibold">{f.name}<button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button></li>)}</ul>}
        </div>
      </div>
    </Dialog>
  );
}

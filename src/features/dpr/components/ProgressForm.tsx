'use client';

import React from 'react';
import { Check, Plus, RefreshCw, RotateCcw, Trash2, UserPlus, X } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import { addDays, formatDate } from '@/lib/datetime';
import { Btn, Card, IconBtn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { Item, ItemAssign, ItemKind, ItemOps, Milestone, NewItem, PeopleRow, ProgressData, ProgressForm as Form } from '../api/dpr.api';
import { Bar, DateBox, ITEM_LABEL, LocationSelect, locName, n1, newKey, NumBox, PersonSearch, TextBox } from './parts';

type Errors = Record<string, string>;
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Rows with who was present by attendance: matched by name, the rest added as not planned. */
function withAttendance(rows: PeopleRow[], found: { name: string; present: number }[]): PeopleRow[] {
  const byName = new Map(found.map((a) => [a.name.toLowerCase(), a.present]));
  const out = rows.map((r) => (byName.has(r.name.toLowerCase()) ? { ...r, present: byName.get(r.name.toLowerCase()) ?? r.present, from_attendance: true } : r));
  for (const a of found) if (!out.some((r) => r.name.toLowerCase() === a.name.toLowerCase())) out.push({ name: a.name, planned: 0, present: a.present, from_attendance: true, extra: true });
  return out;
}

function People({ title, rows, list, prefix, errors, disabled, onChange, listId, onFetch }: { title: string; rows: PeopleRow[]; list: string[]; prefix: 'staff' | 'labour'; errors: Errors; disabled: boolean; onChange: (r: PeopleRow[]) => void; listId: string; onFetch: () => Promise<{ name: string; present: number }[]> }) {
  const [fetching, setFetching] = React.useState(false);
  const fetchNow = async () => {
    setFetching(true);
    try {
      const found = await onFetch();
      if (!found.length) showSuccess(prefix === 'staff' ? 'Nobody of this site is marked present in attendance for this day' : 'No labour attendance for this day');
      else { onChange(withAttendance(rows, found)); showSuccess(`${found.reduce((n, a) => n + a.present, 0)} present by attendance`); }
    } catch (e) { showError(messageOf(e)); } finally { setFetching(false); }
  };
  const planned = rows.reduce((s, r) => s + (r.planned || 0), 0);
  const present = rows.reduce((s, r) => s + (r.present || 0), 0);
  const set = (i: number, patch: Partial<PeopleRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <Card title={title} note={`${present} on site of ${planned} planned`} right={!disabled ? (
      <div className="flex gap-1.5">
        <Btn variant="secondary" size="sm" icon={RefreshCw} loading={fetching} onClick={fetchNow}>Fetch from attendance</Btn>
        <Btn variant="ghost" size="sm" icon={Plus} onClick={() => onChange([...rows, { name: '', planned: 0, present: null, extra: true }])}>Add</Btn>
      </div>
    ) : undefined}>
      <datalist id={listId}>{list.map((n) => <option key={n} value={n} />)}</datalist>
      {!rows.length && <p className="text-xs text-fg-muted">Nothing planned. Add anyone who was on site.</p>}
      <ul className="divide-y divide-line/60">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0 flex-1">
              {r.extra && !disabled ? (
                <input list={listId} value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Name" aria-label={`${title} name`} className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm outline-none focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]" />
              ) : <p className="truncate text-sm font-medium text-fg">{r.name}</p>}
              <p className="truncate text-[11px] text-fg-muted">Planned {r.planned}{r.split ? ` · ${r.split}` : ''}{r.from_attendance ? ' · from attendance' : ''}</p>
            </div>
            <NumBox value={r.present} onChange={(v) => set(i, { present: v })} ariaLabel={`${r.name || title} on site`} error={errors[`${prefix}.${i}.present`]} disabled={disabled} placeholder="0" />
            {r.extra && !disabled && <IconBtn label="Remove" onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></IconBtn>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function MilestoneAnswer({ m, answer, error, errorDate, errorReason, date, disabled, onChange }: { m: Milestone; answer?: ProgressData['milestones'][number]; error?: string; errorDate?: string; errorReason?: string; date: string; disabled: boolean; onChange: (a: ProgressData['milestones'][number] | null) => void }) {
  return (
    <li className="space-y-2 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{[m.location_name, m.level].filter(Boolean).join(' · ') || 'Site'} — {m.activity}</p>
          <p className={cx('text-[11px]', m.target_on && m.target_on < date ? 'font-semibold text-[var(--tt-danger)]' : 'text-fg-muted')}>{m.target_on && m.target_on < date ? 'Overdue · ' : 'Due '}{formatDate(m.target_on, 'short')}</p>
        </div>
        <div className={cx('inline-flex h-8 overflow-hidden rounded-lg border', error ? 'border-[var(--tt-danger)]' : 'border-line')}>
          <button type="button" disabled={disabled} onClick={() => onChange({ id: m.id, done: true })} className={cx('inline-flex items-center gap-1 px-3 text-xs font-semibold', answer?.done === true ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted')}><Check className="h-3.5 w-3.5" />Done</button>
          <button type="button" disabled={disabled} onClick={() => onChange({ id: m.id, done: false, target_on: answer?.target_on ?? null, reason: answer?.reason ?? null })} className={cx('px-3 text-xs font-semibold', answer?.done === false ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'bg-surface text-fg-muted')}>Not yet</button>
        </div>
      </div>
      {error && <p className="text-[11px] font-medium text-[var(--tt-danger)]">{error}</p>}
      {answer?.done === false && (
        <div className="grid gap-2 sm:grid-cols-[11rem_1fr]">
          <DateBox value={answer.target_on} min={addDays(date, 1)} onChange={(v) => onChange({ ...answer, target_on: v })} ariaLabel="New date" error={errorDate} disabled={disabled} />
          <TextBox value={answer.reason} onChange={(v) => onChange({ ...answer, reason: v })} ariaLabel="Why it slipped" placeholder="Why it slipped (required)" error={errorReason} disabled={disabled} />
        </div>
      )}
    </li>
  );
}

/** One person picked by search, shown as a chip with a clear button. */
function PersonField({ id, name, placeholder, disabled, onChange }: { id?: number | null; name?: string | null; placeholder: string; disabled: boolean; onChange: (id: number | null, name: string | null) => void }) {
  return id ? (
    <span className="inline-flex h-9 max-w-full items-center gap-1 rounded-lg border border-line bg-bg-subtle px-2.5 text-sm"><span className="truncate">{name}</span>{!disabled && <button type="button" aria-label={`Clear ${placeholder}`} onClick={() => onChange(null, null)}><X className="h-3.5 w-3.5" /></button>}</span>
  ) : disabled ? <span className="text-xs text-fg-muted">—</span> : <PersonSearch placeholder={placeholder} onPick={(p) => onChange(p.employee_id, p.name)} />;
}

function DepartmentSelect({ value, list, disabled, onChange }: { value?: string | null; list: string[]; disabled: boolean; onChange: (v: string | null) => void }) {
  return (
    <select value={value || ''} disabled={disabled} onChange={(e) => onChange(e.target.value || null)} aria-label="Department" className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm text-fg disabled:bg-bg-subtle">
      <option value="">No department</option>
      {list.map((d) => <option key={d} value={d}>{d}</option>)}
      {value && !list.includes(value) && <option value={value}>{value}</option>}
    </select>
  );
}

const NEW_HINT: Record<ItemKind, string> = {
  breakdown: 'Goes to the equipment owner as an action in this month’s site meeting.',
  material: 'Goes to the material owner as an action, due on the needed-by date.',
  issue: 'Pick who will act on it to make it an action; without an owner it is only tracked here.',
  action: 'Pick who will do it to make it an action; without an owner it is only tracked here.',
};

function NewItemRow({ item, i, kind, form, errors, disabled, onChange, onRemove }: { item: NewItem; i: number; kind: ItemKind; form: Form; errors: Errors; disabled: boolean; onChange: (p: Partial<NewItem>) => void; onRemove: () => void }) {
  const e = (f: string) => errors[`items.add.${i}.${f}`];
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-line p-2.5">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-2 sm:grid-cols-2">
          {kind === 'breakdown' && <>
            <div><input list="dpr-equipment" value={item.equipment || ''} disabled={disabled} onChange={(ev) => onChange({ equipment: ev.target.value })} placeholder="Equipment" aria-label="Equipment" className={cx('h-9 w-full rounded-lg border bg-surface px-2.5 text-sm outline-none focus:ring-1', e('equipment') ? 'border-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)] focus:ring-[var(--tt-primary)]')} />{e('equipment') && <p className="mt-1 text-[11px] text-[var(--tt-danger)]">{e('equipment')}</p>}</div>
            <TextBox value={item.unit} onChange={(v) => onChange({ unit: v })} ariaLabel="Unit" placeholder="Unit (optional), e.g. #2" disabled={disabled} />
            <TextBox className="sm:col-span-2" value={item.note} onChange={(v) => onChange({ note: v })} ariaLabel="What is wrong" placeholder="What is wrong" error={e('note')} disabled={disabled} />
          </>}
          {kind === 'material' && <>
            <TextBox value={item.name} onChange={(v) => onChange({ name: v })} ariaLabel="Material" placeholder="Material" error={e('name')} disabled={disabled} />
            <TextBox value={item.quantity} onChange={(v) => onChange({ quantity: v })} ariaLabel="Quantity" placeholder="Quantity, e.g. 50 bags" error={e('quantity')} disabled={disabled} />
          </>}
          {(kind === 'issue' || kind === 'action') && <TextBox className="sm:col-span-2" value={item.text} onChange={(v) => onChange({ text: v })} ariaLabel="Describe it" placeholder={kind === 'issue' ? 'What is the issue' : 'What needs doing'} error={e('text')} disabled={disabled} />}
          {kind === 'issue' && (
            <select value={item.category || 'site'} disabled={disabled} onChange={(ev) => onChange({ category: ev.target.value as NewItem['category'] })} aria-label="Kind of issue" className="h-9 rounded-lg border border-line bg-surface px-2 text-sm">
              <option value="site">Site issue</option><option value="safety">Safety</option><option value="quality">Quality</option>
            </select>
          )}
          {kind === 'action' && <DepartmentSelect value={item.department} list={form.lists.departments} disabled={disabled} onChange={(v) => onChange({ department: v || undefined })} />}
          <LocationSelect locations={form.locations} value={item.location_id ?? null} onChange={(v) => onChange({ location_id: v })} ariaLabel="Location" overallLabel="Whole site" disabled={disabled} />
          {(kind === 'material' || kind === 'action' || kind === 'issue') && <div><DateBox value={item.due_on} min={form.date} onChange={(v) => onChange({ due_on: v })} ariaLabel={kind === 'material' ? 'Needed by' : 'Due'} error={e('due_on')} disabled={disabled} /><p className="mt-0.5 text-[10px] text-fg-muted">{kind === 'material' ? 'Needed by' : 'Due (optional)'}</p></div>}
          {(kind === 'issue' || kind === 'action') && (
            <div>
              <PersonField id={item.owner_employee_id} name={item.owner_name} placeholder="Assign employee" disabled={disabled} onChange={(id, name) => onChange({ owner_employee_id: id, owner_name: name })} />
              {e('owner_employee_id') && <p className="mt-1 text-[11px] text-[var(--tt-danger)]">{e('owner_employee_id')}</p>}
            </div>
          )}
          {(kind === 'issue' || kind === 'action') && item.owner_employee_id && (
            <div><PersonField id={item.reviewer_employee_id} name={item.reviewer_name} placeholder="Set reviewer (signs it off)" disabled={disabled} onChange={(id, name) => onChange({ reviewer_employee_id: id, reviewer_name: name })} /></div>
          )}
        </div>
        {!disabled && <IconBtn label="Remove" onClick={onRemove}><Trash2 className="h-4 w-4" /></IconBtn>}
      </div>
      <p className="text-[11px] text-fg-muted">{NEW_HINT[kind]}</p>
    </div>
  );
}

function Tracked({ kind, form, ops, errors, disabled, onOps }: { kind: ItemKind; form: Form; ops: ItemOps; errors: Errors; disabled: boolean; onOps: (o: ItemOps) => void }) {
  const open = form.items[kind];
  const adds = (ops.add || []).map((a, i) => ({ a, i })).filter((x) => x.a.kind === kind);
  const closing = new Map((ops.close || []).map((c) => [c.id, c]));
  const toggle = (it: Item) => {
    const list = ops.close || [];
    onOps({ ...ops, close: closing.has(it.id) ? list.filter((c) => c.id !== it.id) : [...list, { id: it.id, note: '' }] });
  };
  const reopen = (it: Item) => onOps({ ...ops, reopen: (ops.reopen || []).includes(it.id) ? (ops.reopen || []).filter((x) => x !== it.id) : [...(ops.reopen || []), it.id] });
  const note = (id: number, text: string) => onOps({ ...ops, close: (ops.close || []).map((c) => (c.id === id ? { ...c, note: text } : c)) });
  const add = () => onOps({ ...ops, add: [...(ops.add || []), { client_key: newKey(), kind }] });
  const patch = (i: number, p: Partial<NewItem>) => onOps({ ...ops, add: (ops.add || []).map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const stillOpen = open.filter((i) => i.status === 'open').length;
  // Assigning open issues and actions, as the old form's "Assign employee / Set reviewer / Assign dept"; done when the report is submitted.
  const assignable = kind === 'issue' || kind === 'action';
  const [assigning, setAssigning] = React.useState<number | null>(null);
  const pending = new Map((ops.assign || []).map((x) => [x.id, x]));
  const setAssign = (id: number, patch: Partial<ItemAssign>) => {
    const cur = pending.get(id) || { id };
    onOps({ ...ops, assign: [...(ops.assign || []).filter((x) => x.id !== id), { ...cur, ...patch }] });
  };
  return (
    <Card title={ITEM_LABEL[kind]} note={`${stillOpen} open`} right={!disabled ? <Btn variant="ghost" size="sm" icon={Plus} onClick={add}>New</Btn> : undefined}>
      {!open.length && !adds.length && <p className="text-xs text-fg-muted">Nothing open.</p>}
      <ul className="divide-y divide-line/60">
        {open.map((it) => {
          const resolving = closing.has(it.id);
          const closedToday = it.status === 'closed';
          return (
            <li key={it.id} className="space-y-2 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cx('text-sm font-medium', closedToday || resolving ? 'text-fg-muted line-through' : 'text-fg')}>{it.title}</p>
                  <p className="text-[11px] text-fg-muted">{[it.location_name, it.owner_name || 'No owner', `${it.days_open ?? 0} d open`, it.due_on ? `due ${formatDate(it.due_on, 'short')}` : null, it.mom ? 'in MOM' : null].filter(Boolean).join(' · ')}</p>
                </div>
                {!disabled && (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {assignable && !closedToday && !resolving && <Btn variant={pending.has(it.id) ? 'primary' : 'ghost'} size="sm" icon={UserPlus} onClick={() => setAssigning(assigning === it.id ? null : it.id)}>{pending.has(it.id) ? 'Assigned' : 'Assign'}</Btn>}
                    {closedToday
                      ? <Btn variant="ghost" size="sm" icon={RotateCcw} onClick={() => reopen(it)}>{(ops.reopen || []).includes(it.id) ? 'Will reopen' : 'Reopen'}</Btn>
                      : <Btn variant={resolving ? 'primary' : 'secondary'} size="sm" icon={Check} onClick={() => toggle(it)}>{resolving ? 'Resolved' : kind === 'material' ? 'Received' : kind === 'breakdown' ? 'Fixed' : 'Resolved'}</Btn>}
                  </div>
                )}
              </div>
              {assignable && assigning === it.id && (
                <div className="grid gap-2 rounded-lg border border-dashed border-line p-2.5 sm:grid-cols-3">
                  <div><p className="mb-1 text-[11px] font-semibold text-fg-muted">Assign employee</p><PersonField id={pending.get(it.id)?.owner_employee_id ?? it.owner_employee_id} name={pending.get(it.id)?.owner_name ?? it.owner_name} placeholder="Search" disabled={disabled} onChange={(id, name) => setAssign(it.id, { owner_employee_id: id, owner_name: name })} /></div>
                  <div><p className="mb-1 text-[11px] font-semibold text-fg-muted">Set reviewer</p><PersonField id={pending.get(it.id)?.reviewer_employee_id} name={pending.get(it.id)?.reviewer_name} placeholder="Search" disabled={disabled} onChange={(id, name) => setAssign(it.id, { reviewer_employee_id: id, reviewer_name: name })} /></div>
                  {kind === 'action' && <div><p className="mb-1 text-[11px] font-semibold text-fg-muted">Assign department</p><DepartmentSelect value={pending.get(it.id)?.department ?? (it.detail.department as string | null)} list={form.lists.departments} disabled={disabled} onChange={(v) => setAssign(it.id, { department: v })} /></div>}
                  <p className="text-[11px] text-fg-muted sm:col-span-3">Saved with the report. The employee gets it as an action in this plan&apos;s site meeting; a reviewer must sign it off.</p>
                </div>
              )}
              {resolving && <TextBox value={closing.get(it.id)?.note} onChange={(v) => note(it.id, v)} ariaLabel="How it was resolved" placeholder="How it was resolved (optional, shared in MOM)" disabled={disabled} />}
            </li>
          );
        })}
      </ul>
      <div className="space-y-2">{adds.map(({ a, i }) => <NewItemRow key={a.client_key} item={a} i={i} kind={kind} form={form} errors={errors} disabled={disabled} onChange={(p) => patch(i, p)} onRemove={() => onOps({ ...ops, add: (ops.add || []).filter((_, j) => j !== i) })} />)}</div>
    </Card>
  );
}

/** The steps of the planning form, as on the old one, and which answers (error keys) each holds. */
export const PROGRESS_STEPS: { title: string; keys: string[]; items?: ItemKind }[] = [
  { title: 'Concrete progress', keys: ['pours', 'shortfall_reason'] },
  { title: 'Staff deployment', keys: ['staff'] },
  { title: 'Labour deployment', keys: ['labour'] },
  { title: 'Schedule targets', keys: ['milestones'] },
  { title: 'Equipment tracking', keys: ['equipment'], items: 'breakdown' },
  { title: 'Material tracking', keys: [], items: 'material' },
  { title: 'Safety / quality', keys: ['safety', 'quality'], items: 'issue' },
  { title: 'Action items', keys: ['note'], items: 'action' },
];

/** The daily planning form, one step at a time: concrete, staff, labour, targets, equipment, materials, safety and quality, actions. */
export function ProgressForm({ form, data, ops, onChange, onOps, errors, disabled, step }: { form: Form; data: ProgressData; ops: ItemOps; onChange: (d: ProgressData) => void; onOps: (o: ItemOps) => void; errors: Errors; disabled: boolean; step: number }) {
  const set = (patch: Partial<ProgressData>) => onChange({ ...data, ...patch });
  const poured = round2(data.pours.reduce((s, p) => s + (Number(p.m3) || 0), 0));
  const planned = form.planned.pours_m3;
  const answers = new Map(data.milestones.map((a) => [a.id, a]));
  const answer = (a: ProgressData['milestones'][number] | null, id: number) => set({ milestones: a ? [...data.milestones.filter((x) => x.id !== id), a] : data.milestones.filter((x) => x.id !== id) });
  const counts = (key: 'safety' | 'quality') => data[key];
  const setCount = (key: 'safety' | 'quality', i: number, f: 'internal' | 'client' | 'nc', v: number | null) => set({ [key]: data[key].map((r, j) => (j === i ? { ...r, [f]: v ?? 0 } : r)) } as Partial<ProgressData>);

  // The old form's eight steps, in order.
  const steps: React.ReactNode[] = [
    <>
        <Card title="Concrete poured" note={`${n1(poured)} m³${planned ? ` of ${n1(planned)} planned` : ''}`} right={!disabled ? <Btn variant="ghost" size="sm" icon={Plus} onClick={() => set({ pours: [...data.pours, { location_id: null, m3: null }] })}>Location</Btn> : undefined}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([['Planned today', `${n1(planned)} m³`], ['Achieved today', `${n1(poured)} m³`], ['Variance today', `${poured - planned >= 0 ? '+' : ''}${n1(poured - planned)} m³`],
              ['Cumulative this plan', `${n1(form.planned.month_before_m3 + poured)} / ${n1(form.planned.month_target_m3)} m³`]] as const).map(([l, v]) => (
              <div key={l} className="rounded-lg bg-bg-subtle p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-fg-muted sm:text-[11px]">{l}</p><p className={`mt-0.5 font-bold tabular-nums ${l === 'Variance today' && poured < planned ? 'text-[var(--tt-danger)]' : 'text-fg'}`}>{v}</p></div>
            ))}
          </div>
          <Bar pct={form.planned.month_target_m3 ? ((form.planned.month_before_m3 + poured) / form.planned.month_target_m3) * 100 : 0} />
          <ul className="space-y-2">
            {data.pours.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <LocationSelect locations={form.locations} value={p.location_id} onChange={(v) => set({ pours: data.pours.map((x, j) => (j === i ? { ...x, location_id: v } : x)) })} ariaLabel="Location" disabled={disabled} />
                  {p.planned ? <p className="mt-0.5 text-[11px] text-fg-muted">Planned {n1(p.planned)} m³</p> : null}
                </div>
                <NumBox value={p.m3} step={0.5} onChange={(v) => set({ pours: data.pours.map((x, j) => (j === i ? { ...x, m3: v } : x)) })} ariaLabel={`m³ at ${locName(form.locations, p.location_id)}`} placeholder="m³" error={errors[`pours.${i}.m3`]} disabled={disabled} />
                {!disabled && data.pours.length > 1 && <IconBtn label="Remove" onClick={() => set({ pours: data.pours.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></IconBtn>}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-fg-muted">Leave a location blank for no pour. Enter 0 if nothing was poured.</p>
          {planned > 0 && poured < planned && <TextBox value={data.shortfall_reason} onChange={(v) => set({ shortfall_reason: v })} ariaLabel="Why less was poured" placeholder="Why less than planned (required)" error={errors.shortfall_reason} disabled={disabled} />}
        </Card>
    </>,
    <People title="Staff deployment" listId="dpr-staff" prefix="staff" rows={data.staff} list={form.lists.staff} errors={errors} disabled={disabled} onChange={(r) => set({ staff: r })} onFetch={async () => (await api.attendance(form.site.id, form.date)).staff} />,
    <People title="Labour deployment" listId="dpr-labour" prefix="labour" rows={data.labour} list={form.lists.labour} errors={errors} disabled={disabled} onChange={(r) => set({ labour: r })} onFetch={async () => (await api.attendance(form.site.id, form.date)).labour} />,
    <>
        <Card title="Milestones" note={form.milestones.due.length ? `${form.milestones.due.length} due` : 'none due'}>
          {!form.milestones.due.length && <p className="text-xs text-fg-muted">Nothing due on this day.</p>}
          <ul className="divide-y divide-line/60">
            {form.milestones.due.map((m) => (
              <MilestoneAnswer key={m.id} m={m} date={form.date} answer={answers.get(m.id)} disabled={disabled} onChange={(a) => answer(a, m.id)}
                error={errors[`milestones.${m.id}`]} errorDate={errors[`milestones.${m.id}.target_on`]} errorReason={errors[`milestones.${m.id}.reason`]} />
            ))}
          </ul>
          {form.milestones.upcoming.length > 0 && (
            <details className="rounded-lg border border-line p-2.5">
              <summary className="cursor-pointer text-xs font-semibold text-fg">Finished something early? ({form.milestones.upcoming.length} coming up)</summary>
              <ul className="mt-2 space-y-1.5">
                {form.milestones.upcoming.map((m) => {
                  const on = answers.get(m.id)?.done === true;
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate">{[m.location_name, m.level].filter(Boolean).join(' · ')} — {m.activity} · {formatDate(m.target_on, 'short')}</span>
                      <Btn size="sm" variant={on ? 'primary' : 'secondary'} disabled={disabled} onClick={() => answer(on ? null : { id: m.id, done: true, early: true }, m.id)}>{on ? 'Done' : 'Mark done'}</Btn>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </Card>
    </>,
    <div className="space-y-3 sm:space-y-4">
        <Card title="Equipment on site" right={!disabled ? <Btn variant="ghost" size="sm" icon={Plus} onClick={() => set({ equipment: [...data.equipment, { name: '', planned: 0, on_site: null, reason: null, extra: true }] })}>Add</Btn> : undefined}>
          <datalist id="dpr-equipment">{form.lists.equipment.map((n) => <option key={n} value={n} />)}</datalist>
          {!data.equipment.length && <p className="text-xs text-fg-muted">No equipment planned.</p>}
          <ul className="divide-y divide-line/60">
            {data.equipment.map((r, i) => {
              const short = r.on_site !== null && r.on_site < r.planned;
              const setRow = (p: Partial<typeof r>) => set({ equipment: data.equipment.map((x, j) => (j === i ? { ...x, ...p } : x)) });
              return (
                <li key={i} className="space-y-2 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {r.extra && !disabled ? <input list="dpr-equipment" value={r.name} onChange={(e) => setRow({ name: e.target.value })} placeholder="Equipment" aria-label="Equipment" className="h-9 w-full rounded-lg border border-line bg-surface px-2.5 text-sm outline-none" /> : <p className="truncate text-sm font-medium text-fg">{r.name}</p>}
                      <p className="text-[11px] text-fg-muted">Planned {r.planned}</p>
                    </div>
                    <NumBox value={r.on_site} onChange={(v) => setRow({ on_site: v })} ariaLabel={`${r.name} on site`} error={errors[`equipment.${i}.on_site`]} disabled={disabled} placeholder="0" />
                  </div>
                  {(short || errors[`equipment.${i}.reason`]) && <TextBox value={r.reason} onChange={(v) => setRow({ reason: v })} ariaLabel="Why fewer" placeholder="Why fewer (breakdown, not mobilised, not needed …)" error={errors[`equipment.${i}.reason`]} disabled={disabled} />}
                </li>
              );
            })}
          </ul>
          {data.equipment.some((r) => r.on_site !== null && r.on_site < r.planned) && <p className="text-[11px] text-fg-muted">A machine that is down? Report it under Breakdowns so its owner acts on it.</p>}
        </Card>
      <Tracked kind="breakdown" form={form} ops={ops} errors={errors} disabled={disabled || !form.access.items} onOps={onOps} />
    </div>,
    <Tracked kind="material" form={form} ops={ops} errors={errors} disabled={disabled || !form.access.items} onOps={onOps} />,
    <div className="space-y-3 sm:space-y-4">
        <Card title="Safety and quality observations" note="count per location">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-fg-muted"><th className="py-1.5 font-semibold">Location</th><th className="font-semibold" colSpan={3}>Safety · internal, client, NC</th><th className="font-semibold" colSpan={3}>Quality · internal, client, NC</th></tr></thead>
              <tbody>
                {counts('safety').map((r, i) => (
                  <tr key={i} className="border-t border-line/60">
                    <td className="py-2 pr-2 font-medium">{locName(form.locations, r.location_id)}</td>
                    {(['internal', 'client', 'nc'] as const).map((f) => <td key={`s${f}`} className="py-2 pr-1"><NumBox value={r[f]} onChange={(v) => setCount('safety', i, f, v)} ariaLabel={`Safety ${f}`} disabled={disabled} /></td>)}
                    {(['internal', 'client', 'nc'] as const).map((f) => <td key={`q${f}`} className="py-2 pr-1"><NumBox value={data.quality[i]?.[f] ?? 0} onChange={(v) => setCount('quality', i, f, v)} ariaLabel={`Quality ${f}`} disabled={disabled} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      <Tracked kind="issue" form={form} ops={ops} errors={errors} disabled={disabled || !form.access.items} onOps={onOps} />
    </div>,
    <div className="space-y-3 sm:space-y-4">
      <Tracked kind="action" form={form} ops={ops} errors={errors} disabled={disabled || !form.access.items} onOps={onOps} />
        <Card title="Note"><TextBox value={data.note} onChange={(v) => set({ note: v })} ariaLabel="Note" placeholder="Anything else the office should know" disabled={disabled} /></Card>
    </div>,
  ];
  return <div className="space-y-3 sm:space-y-4">{steps[step]}</div>;
}

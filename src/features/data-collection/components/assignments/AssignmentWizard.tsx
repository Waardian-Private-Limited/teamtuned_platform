'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { ApiError, messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/dc.api';
import { WEEKDAYS } from '../../constants/dc.constants';
import { useAsync } from '../../hooks/useAsync';
import type { AssignmentInput, AssignmentRow, Errors, Flags, PersonOption, Schedule, Target } from '../../types/dc.types';
import { todayIso } from '../../utils/schema';
import { Btn, Checkbox, Labeled, inputCls } from '../shared/Ui';

const STEPS = ['Form', 'Where', 'Who', 'When'];
const WHO: { kind: Target['who']['kind']; label: string; hint: string }[] = [
  { kind: 'everyone', label: 'Everyone at those sites', hint: 'New joiners are picked up on the next run' },
  { kind: 'departments', label: 'By department', hint: 'People in the chosen departments' },
  { kind: 'roles', label: 'By role', hint: 'People holding the chosen roles' },
  { kind: 'employees', label: 'Specific people', hint: 'Pick the individuals' },
  { kind: 'one_per_site', label: 'One person per site', hint: 'One shared form for each site: whoever is there fills it, once' },
];
const KINDS: { value: Schedule['kind']; label: string }[] = [
  { value: 'daily', label: 'Every day' }, { value: 'weekly', label: 'Certain weekdays' }, { value: 'monthly', label: 'Certain dates each month' },
  { value: 'every_n_days', label: 'Every few days' }, { value: 'dates', label: 'On chosen dates' }, { value: 'once', label: 'Once' },
];
const FLAGS: { key: keyof Flags; label: string; hint: string; scheduledOnly?: boolean }[] = [
  { key: 'needs_review', label: 'Needs review', hint: 'A reviewer approves, rejects or sends it back (set up under Approval Flows)' },
  { key: 'allow_late', label: 'Allow late submission', hint: 'Can be filled after the due time; it is marked late', scheduledOnly: true },
  { key: 'skip_when_off', label: 'Skip when the person is off', hint: 'No form on holidays, week offs and approved leave', scheduledOnly: true },
  { key: 'require_location', label: 'Must be at the site', hint: 'Location is captured and checked against the site fence' },
  { key: 'allow_edit', label: 'Allow edit until reviewed', hint: 'The person can fix mistakes after sending' },
  { key: 'team_visible', label: 'Team can see each other’s answers', hint: 'People at the same site can read them' },
];

const blank = (): AssignmentInput => ({
  form_id: 0, title: '', mode: 'scheduled', target: { sites: { all: true }, who: { kind: 'everyone' } },
  schedule: { kind: 'daily', open_time: '00:00', due_time: '23:59', grace_minutes: 0 }, flags: {}, start_date: todayIso(), end_date: null,
});

function Chips({ items, onRemove }: { items: { id: number; label: string }[]; onRemove: (id: number) => void }) {
  return <div className="mt-2 flex flex-wrap gap-1.5">{items.map((i) => <span key={i.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle px-2.5 py-1 text-xs font-medium text-fg">{i.label}<button type="button" aria-label={`Remove ${i.label}`} onClick={() => onRemove(i.id)}><X className="h-3 w-3" /></button></span>)}</div>;
}

function Pick({ options, chosen, onChange, placeholder }: { options: { id: number; name: string }[]; chosen: number[]; onChange: (ids: number[]) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const shown = options.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input className={inputCls()} placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 max-h-52 space-y-0.5 overflow-y-auto rounded-lg border border-line p-1">
        {shown.map((o) => { const on = chosen.includes(o.id); return (
          <li key={o.id}><button type="button" onClick={() => onChange(on ? chosen.filter((x) => x !== o.id) : [...chosen, o.id])} className={cx('flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm', on ? 'bg-bg-subtle font-semibold text-fg' : 'text-fg-muted hover:bg-bg-subtle')}>{o.name}{on && <Check className="h-4 w-4" />}</button></li>
        ); })}
        {shown.length === 0 && <li className="px-2.5 py-3 text-xs text-fg-muted">Nothing found</li>}
      </ul>
    </div>
  );
}

function People({ chosen, onChange, error }: { chosen: number[]; onChange: (ids: number[]) => void; error?: string }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<PersonOption[]>([]);
  const [known, setKnown] = useState<Record<number, PersonOption>>({});
  useEffect(() => {
    const t = setTimeout(() => { api.searchPeople(q).then((r) => { setFound(r.items); setKnown((k) => ({ ...k, ...Object.fromEntries(r.items.map((p) => [p.id, p])) })); }).catch(() => setFound([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { const missing = chosen.filter((id) => !known[id]); if (missing.length) api.searchPeople('', missing).then((r) => setKnown((k) => ({ ...k, ...Object.fromEntries(r.items.map((p) => [p.id, p])) }))).catch(() => undefined); }, [chosen, known]);
  return (
    <div>
      <input className={inputCls(Boolean(error))} placeholder="Search by name or code" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="mt-2 max-h-44 space-y-0.5 overflow-y-auto rounded-lg border border-line p-1">
        {found.map((p) => { const on = chosen.includes(p.id); return <li key={p.id}><button type="button" onClick={() => onChange(on ? chosen.filter((x) => x !== p.id) : [...chosen, p.id])} className={cx('flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm', on ? 'bg-bg-subtle font-semibold text-fg' : 'text-fg-muted hover:bg-bg-subtle')}><span>{p.name} <span className="text-[11px] text-fg-subtle">{p.employee_code}</span></span>{on && <Check className="h-4 w-4" />}</button></li>; })}
        {found.length === 0 && <li className="px-2.5 py-3 text-xs text-fg-muted">No one found</li>}
      </ul>
      <Chips items={chosen.map((id) => ({ id, label: known[id]?.name || `Person ${id}` }))} onRemove={(id) => onChange(chosen.filter((x) => x !== id))} />
    </div>
  );
}

export function AssignmentWizard({ open, existing, presetFormId, onClose, onDone }: { open: boolean; existing: AssignmentRow | null; presetFormId?: number | null; onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<AssignmentInput>(blank());
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState(false);
  const editing = Boolean(existing);

  const forms = useAsync(() => api.listForms({ status: 'active', pageSize: 100 }), [open], open);
  const options = useAsync(() => api.getOptions(), [open], open);
  const versions = useAsync(() => api.formVersions(v.form_id), [v.form_id], open && v.form_id > 0 && pin);

  useEffect(() => {
    if (!open) return;
    setStep(0); setErrors({});
    if (existing) { setV({ form_id: existing.form_id, title: existing.title, mode: existing.mode, target: existing.target, schedule: existing.schedule, flags: existing.flags, start_date: existing.start_date, end_date: existing.end_date, version: existing.pinned_version_id ? { pinned: existing.pinned_version_id } : null }); setPin(Boolean(existing.pinned_version_id)); }
    else { setV({ ...blank(), form_id: presetFormId || 0 }); setPin(false); }
  }, [open, existing, presetFormId]);

  const sitesAll = 'all' in v.target.sites;
  const siteIds = 'ids' in v.target.sites ? v.target.sites.ids : [];
  const who = v.target.who;
  const set = (patch: Partial<AssignmentInput>) => setV((c) => ({ ...c, ...patch }));
  const setFlag = (k: keyof Flags, val: boolean) => set({ flags: { ...v.flags, [k]: val || undefined } });

  // Live count of who this reaches; only for a complete target.
  const ready = (sitesAll || siteIds.length > 0) && (!['departments', 'roles', 'employees'].includes(who.kind) || (who.ids?.length || 0) > 0);
  const [reach, setReach] = useState<{ people: number; sites: number; runs_per_period: number } | null>(null);
  useEffect(() => {
    if (!open || !ready || step < 2) { setReach(null); return undefined; }
    const t = setTimeout(() => { api.previewAssignment(v.target).then(setReach).catch(() => setReach(null)); }, 300);
    return () => clearTimeout(t);
  }, [open, ready, step, v.target]);

  const stepErrors = (s: number): Errors => {
    const e: Errors = {};
    if (s === 0 && !v.form_id) e.form_id = 'Choose a form';
    if (s === 0 && !v.title.trim()) e.title = 'Give this assignment a name';
    if (s === 1 && !sitesAll && siteIds.length === 0) e['target.sites'] = 'Choose where this runs';
    if (s === 2 && ['departments', 'roles', 'employees'].includes(who.kind) && !(who.ids?.length)) e['target.who'] = who.kind === 'employees' ? 'Choose at least one person' : `Choose at least one ${who.kind === 'roles' ? 'role' : 'department'}`;
    if (s === 3 && v.mode === 'scheduled') {
      const sc = v.schedule;
      if (sc?.kind === 'weekly' && !sc.weekdays?.length) e['schedule.weekdays'] = 'Choose at least one day';
      if (sc?.kind === 'monthly' && !sc.month_days?.length) e['schedule.month_days'] = 'Choose at least one date';
      if (sc?.kind === 'every_n_days' && !(Number(sc.interval) >= 2)) e['schedule.interval'] = 'Enter 2 to 365 days';
      if (sc?.kind === 'dates' && !sc.dates?.length) e['schedule.dates'] = 'Add at least one date';
    }
    if (s === 3 && v.end_date && v.end_date < v.start_date) e.end_date = 'End date is before the start';
    return e;
  };

  const next = () => { const e = stepErrors(step); setErrors(e); if (!Object.keys(e).length) setStep(step + 1); };

  const save = async () => {
    const e = stepErrors(3); setErrors(e); if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body: AssignmentInput = { ...v, version: pin && v.version ? v.version : null };
      if (existing) await api.updateAssignment(existing.id, body); else await api.createAssignment(body);
      showSuccess(existing ? 'Assignment updated' : 'Assignment created');
      onDone(); onClose();
    } catch (err) {
      const server = (err instanceof ApiError ? (err.data as { details?: { errors?: Errors } })?.details?.errors : undefined) || { form: messageOf(err) };
      setErrors(server);
      const first = Object.keys(server)[0] || '';
      setStep(first.startsWith('target.sites') ? 1 : first.startsWith('target') ? 2 : first.startsWith('schedule') || first.startsWith('end') || first.startsWith('start') ? 3 : first === 'version' || first === 'form_id' ? 0 : step);
    } finally { setBusy(false); }
  };

  const sc = v.schedule || { kind: 'daily' as const, open_time: '00:00', due_time: '23:59' };
  const setSc = (patch: Partial<Schedule>) => set({ schedule: { ...sc, ...patch } as Schedule });
  const opt = options.data;
  const whoOptions = who.kind === 'departments' ? opt?.departments : who.kind === 'roles' ? opt?.roles : null;

  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Edit assignment' : 'New assignment'} maxWidthClassName="max-w-2xl"
      footer={<>
        {step > 0 && <Btn onClick={() => setStep(step - 1)}>Back</Btn>}
        <Btn onClick={onClose}>Cancel</Btn>
        {step < 3 ? <Btn variant="primary" onClick={next}>Next</Btn> : <Btn variant="primary" busy={busy} onClick={save}>{editing ? 'Save changes' : 'Create assignment'}</Btn>}
      </>}>
      <ol className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2"><span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', i <= step ? 'bg-fg text-[var(--tt-on-primary)]' : 'bg-bg-subtle text-fg-muted')}>{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span><span className={cx('hidden text-xs font-semibold sm:block', i === step ? 'text-fg' : 'text-fg-muted')}>{s}</span><span className="h-px flex-1 bg-line" /></li>
        ))}
      </ol>
      {errors.form && <p role="alert" className="mb-3 text-xs font-medium text-[var(--tt-danger)]">{errors.form}</p>}

      {step === 0 && (
        <div className="space-y-4">
          <Labeled label="Form" required error={errors.form_id}>
            <select disabled={editing} className={inputCls(Boolean(errors.form_id))} value={v.form_id || ''} onChange={(e) => { const f = forms.data?.items.find((x) => x.id === Number(e.target.value)); set({ form_id: Number(e.target.value), title: v.title || f?.name || '', version: null }); setPin(false); }}>
              <option value="">Choose a live form</option>{forms.data?.items.map((f) => <option key={f.id} value={f.id}>{f.name} (v{f.version_no})</option>)}
            </select>
          </Labeled>
          <Labeled label="Assignment name" required error={errors.title}><input className={inputCls(Boolean(errors.title))} value={v.title} maxLength={150} onChange={(e) => set({ title: e.target.value })} /></Labeled>
          <div className="space-y-2">
            <Checkbox checked={!pin} onChange={(on) => { setPin(!on); if (on) set({ version: null }); }} label="Always use the latest published version" hint="New versions apply from the next run" />
            {pin && <Labeled label="Pinned version" error={errors.version}><select className={inputCls(Boolean(errors.version))} value={v.version?.pinned || ''} onChange={(e) => set({ version: e.target.value ? { pinned: Number(e.target.value) } : null })}><option value="">Choose a version</option>{versions.data?.items.map((x) => <option key={x.id} value={x.id}>Version {x.version_no}{x.note ? ` · ${x.note}` : ''}</option>)}</select></Labeled>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ all: true, label: 'All sites', hint: 'Every active site you can reach' }, { all: false, label: 'Chosen sites', hint: 'Pick the sites' }].map((o) => (
              <button key={o.label} type="button" onClick={() => set({ target: { ...v.target, sites: o.all ? { all: true } : { ids: siteIds } } })} className={cx('rounded-lg border p-3 text-left', sitesAll === o.all ? 'border-fg ring-1 ring-fg' : 'border-line hover:bg-bg-subtle')}><div className="text-sm font-semibold text-fg">{o.label}</div><div className="text-[11px] text-fg-muted">{o.hint}</div></button>
            ))}
          </div>
          {!sitesAll && <><Pick options={opt?.sites || []} chosen={siteIds} onChange={(ids) => set({ target: { ...v.target, sites: { ids } } })} placeholder="Search sites" />{errors['target.sites'] && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors['target.sites']}</p>}</>}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {WHO.filter((w) => !(v.mode === 'open' && w.kind === 'one_per_site')).map((w) => (
              <button key={w.kind} type="button" onClick={() => set({ target: { ...v.target, who: { kind: w.kind, ids: [] } } })} className={cx('rounded-lg border p-3 text-left', who.kind === w.kind ? 'border-fg ring-1 ring-fg' : 'border-line hover:bg-bg-subtle')}><div className="text-sm font-semibold text-fg">{w.label}</div><div className="text-[11px] text-fg-muted">{w.hint}</div></button>
            ))}
          </div>
          {whoOptions && <Pick options={whoOptions} chosen={who.ids || []} onChange={(ids) => set({ target: { ...v.target, who: { kind: who.kind, ids } } })} placeholder={`Search ${who.kind}`} />}
          {who.kind === 'employees' && <People chosen={who.ids || []} onChange={(ids) => set({ target: { ...v.target, who: { kind: 'employees', ids } } })} error={errors['target.who']} />}
          {errors['target.who'] && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors['target.who']}</p>}
          <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">{reach ? (who.kind === 'one_per_site' ? `${reach.sites} site${reach.sites === 1 ? '' : 's'} will each get one shared form.` : `Reaches ${reach.people} ${reach.people === 1 ? 'person' : 'people'} at ${reach.sites} site${reach.sites === 1 ? '' : 's'}.`) : ready ? 'Counting…' : 'Finish the choices above to see who this reaches.'}</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {!editing && (
            <div className="grid gap-2 sm:grid-cols-2">
              {[{ m: 'scheduled' as const, l: 'On a schedule', h: 'A form is due on set days' }, { m: 'open' as const, l: 'Open any time', h: 'Fill whenever needed, as often as needed' }].map((o) => (
                <button key={o.m} type="button" onClick={() => set({ mode: o.m, schedule: o.m === 'open' ? null : sc, target: o.m === 'open' && who.kind === 'one_per_site' ? { ...v.target, who: { kind: 'everyone' } } : v.target })} className={cx('rounded-lg border p-3 text-left', v.mode === o.m ? 'border-fg ring-1 ring-fg' : 'border-line hover:bg-bg-subtle')}><div className="text-sm font-semibold text-fg">{o.l}</div><div className="text-[11px] text-fg-muted">{o.h}</div></button>
              ))}
            </div>
          )}
          {v.mode === 'scheduled' && (
            <div className="space-y-3 rounded-lg border border-line p-3">
              <Labeled label="Repeats"><select className={inputCls()} value={sc.kind} onChange={(e) => setSc({ kind: e.target.value as Schedule['kind'] })}>{KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select></Labeled>
              {sc.kind === 'weekly' && <div><div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((d, i) => { const on = sc.weekdays?.includes(i); return <button key={d} type="button" onClick={() => setSc({ weekdays: on ? sc.weekdays!.filter((x) => x !== i) : [...(sc.weekdays || []), i] })} className={cx('h-9 w-12 rounded-lg border text-xs font-semibold', on ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line text-fg-muted')}>{d}</button>; })}</div>{errors['schedule.weekdays'] && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors['schedule.weekdays']}</p>}</div>}
              {sc.kind === 'monthly' && <div><div className="flex flex-wrap gap-1">{[...Array.from({ length: 31 }, (_, i) => i + 1), 'last' as const].map((d) => { const on = sc.month_days?.includes(d); return <button key={d} type="button" onClick={() => setSc({ month_days: on ? sc.month_days!.filter((x) => x !== d) : [...(sc.month_days || []), d] })} className={cx('h-8 min-w-8 rounded-md border px-1.5 text-[11px] font-semibold', on ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line text-fg-muted')}>{d === 'last' ? 'Last day' : d}</button>; })}</div>{errors['schedule.month_days'] && <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--tt-danger)]">{errors['schedule.month_days']}</p>}</div>}
              {sc.kind === 'every_n_days' && <Labeled label="Every how many days" error={errors['schedule.interval']}><input type="number" min={2} max={365} className={inputCls(Boolean(errors['schedule.interval']))} value={sc.interval ?? ''} onChange={(e) => setSc({ interval: Number(e.target.value) })} /></Labeled>}
              {sc.kind === 'dates' && <Labeled label="Dates" error={errors['schedule.dates']}><div className="flex gap-2"><input type="date" id="dc-add-date" className={inputCls()} /><Btn onClick={() => { const el = document.getElementById('dc-add-date') as HTMLInputElement; if (el.value && !sc.dates?.includes(el.value)) setSc({ dates: [...(sc.dates || []), el.value].sort() }); el.value = ''; }}>Add</Btn></div><Chips items={(sc.dates || []).map((d, i) => ({ id: i, label: d }))} onRemove={(i) => setSc({ dates: sc.dates!.filter((_, j) => j !== i) })} /></Labeled>}
              <div className="grid grid-cols-2 gap-3"><Labeled label="Opens at"><input type="time" className={inputCls()} value={sc.open_time} onChange={(e) => setSc({ open_time: e.target.value })} /></Labeled><Labeled label="Due by" hint="Earlier than opening means the next day"><input type="time" className={inputCls()} value={sc.due_time} onChange={(e) => setSc({ due_time: e.target.value })} /></Labeled></div>
              {v.flags.allow_late && <Labeled label="Late allowed for (minutes)" hint="After the due time"><input type="number" min={0} className={inputCls()} value={sc.grace_minutes ?? 1440} onChange={(e) => setSc({ grace_minutes: Number(e.target.value) })} /></Labeled>}
            </div>
          )}
          {v.mode === 'open' && <Labeled label="Most times per person per day" hint="Leave empty for no limit"><input type="number" min={1} className={inputCls()} value={v.flags.daily_limit ?? ''} onChange={(e) => set({ flags: { ...v.flags, daily_limit: e.target.value ? Number(e.target.value) : undefined } })} /></Labeled>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="Starts"><input type="date" className={inputCls()} value={v.start_date} onChange={(e) => set({ start_date: e.target.value })} /></Labeled>
            <Labeled label="Ends (optional)" error={errors.end_date}><input type="date" className={inputCls(Boolean(errors.end_date))} value={v.end_date || ''} onChange={(e) => set({ end_date: e.target.value || null })} /></Labeled>
          </div>
          <div className="space-y-3 rounded-lg border border-line p-3">
            {FLAGS.filter((f) => !(f.scheduledOnly && v.mode === 'open')).map((f) => <Checkbox key={f.key} checked={Boolean(v.flags[f.key])} onChange={(on) => setFlag(f.key, on)} label={f.label} hint={f.hint} />)}
          </div>
          <p className="rounded-lg bg-bg-subtle px-3 py-2 text-xs text-fg-muted">{summary(v, reach)}</p>
        </div>
      )}
    </Dialog>
  );
}

function summary(v: AssignmentInput, reach: { people: number; sites: number; runs_per_period: number } | null) {
  const w = v.target.who.kind === 'one_per_site' ? 'one shared form per site' : reach ? `${reach.people} people` : 'the chosen people';
  if (v.mode === 'open') return `Open form for ${w}. They can fill it any time${v.flags.daily_limit ? `, up to ${v.flags.daily_limit} a day` : ''}.`;
  const s = v.schedule;
  const when = !s ? '' : s.kind === 'daily' ? 'every day' : s.kind === 'weekly' ? `on ${(s.weekdays || []).map((d) => WEEKDAYS[d]).join(', ') || 'chosen days'}` : s.kind === 'monthly' ? 'on chosen dates each month' : s.kind === 'every_n_days' ? `every ${s.interval || '…'} days` : s.kind === 'dates' ? `on ${(s.dates || []).length} chosen dates` : 'once';
  return `About ${reach ? reach.runs_per_period : '…'} form${reach?.runs_per_period === 1 ? '' : 's'} ${when}, due by ${s?.due_time || '23:59'}, for ${w}.`;
}

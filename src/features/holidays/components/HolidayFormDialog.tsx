'use client';

import React from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { OptionCard, SelectField, TextField, FieldLabel, FieldMessage, shellClass } from '@/components/ui/FormControls';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';
import { listSites } from '@/features/sites/api/sites.api';
import type { SiteDto } from '@/features/sites/types/sites.dto';
import { cx } from '@/theme/tokens';
import { HOLIDAY_TYPES, SESSION_LABEL } from '../constants';
import type { Holiday, HolidayInput, HolidaySession, HolidaySite } from '../types/holidays';
import type { HolidayFieldError } from '../hooks/useHolidayMutations';

interface Props {
  open: boolean;
  initial?: Holiday;
  defaultYear: number;
  saving: boolean;
  fieldError: HolidayFieldError | null;
  onClose: () => void;
  onSubmit: (input: HolidayInput) => void;
}

export function HolidayFormDialog({ open, initial, defaultYear, saving, fieldError, onClose, onSubmit }: Props) {
  const { isOrgAdmin } = usePermission();
  const [name, setName] = React.useState('');
  const [date, setDate] = React.useState('');
  const [type, setType] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState('');
  const [half, setHalf] = React.useState(false);
  const [halfSession, setHalfSession] = React.useState<'first_half' | 'second_half'>('second_half');
  const [optional, setOptional] = React.useState(false);
  const [subOrg, setSubOrg] = React.useState<number | null>(null);
  const [siteMode, setSiteMode] = React.useState<'all' | 'some'>('all');
  const [sites, setSites] = React.useState<HolidaySite[]>([]);
  const [allSites, setAllSites] = React.useState<SiteDto[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDate(initial?.date ?? `${defaultYear}-01-01`);
    setType(initial?.type ?? null);
    setDescription(initial?.description ?? '');
    setHalf(initial ? initial.session !== 'full' : false);
    setHalfSession(initial && initial.session !== 'full' ? initial.session : 'second_half');
    setOptional(initial?.is_optional ?? false);
    setSubOrg(initial?.sub_organization_id ?? null);
    setSites(initial?.sites ?? []);
    setSiteMode(initial && initial.sites.length ? 'some' : 'all');
    setErrors({});
  }, [open, initial, defaultYear]);

  React.useEffect(() => {
    if (!open) return;
    listSites({ pageSize: 100, subOrgId: subOrg }).then((r) => setAllSites(r.sites.filter((s) => s.status === 'active'))).catch(() => setAllSites([]));
  }, [open, subOrg]);

  React.useEffect(() => {
    if (fieldError) setErrors({ [fieldError.field === 'holiday_date' ? 'date' : fieldError.field]: fieldError.message });
  }, [fieldError]);

  const session: HolidaySession = half ? halfSession : 'full';
  const toggleSite = (id: number) =>
    setSites((cur) => (cur.some((s) => s.site_id === id) ? cur.filter((s) => s.site_id !== id) : [...cur, { site_id: id, session: null }]));
  const setSiteSession = (id: number, value: HolidaySession | null) => setSites((cur) => cur.map((s) => (s.site_id === id ? { ...s, session: value } : s)));

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter a name';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Pick a date';
    if (siteMode === 'some' && !sites.length) next.sites = 'Pick at least one site, or choose all sites';
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({
      name: name.trim(), date, type: type ?? '', description: description.trim(), session, is_optional: optional,
      status: initial?.status ?? 'active', sub_organization_id: subOrg, sites: siteMode === 'some' ? sites : [],
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={initial ? 'Edit holiday' : 'New holiday'}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:opacity-60">
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Add holiday'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextField label="Name" required value={name} onChange={setName} error={errors.name} placeholder="Diwali" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Date" required type="date" value={date} onChange={setDate} error={errors.date} />
          <SelectField label="Type" value={type} onChange={setType} options={HOLIDAY_TYPES.map((t) => ({ value: t, label: t }))} placeholder="No type" />
        </div>

        <div>
          <FieldLabel label="How much of the day" />
          <div className="grid gap-2 sm:grid-cols-2">
            <OptionCard selected={!half} onClick={() => setHalf(false)} title="Full day" description="Everyone is off all day" />
            <OptionCard selected={half} onClick={() => setHalf(true)} title="Half day" description="Only one half of the day is off" />
          </div>
          {half && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(['first_half', 'second_half'] as const).map((s) => (
                <OptionCard key={s} selected={halfSession === s} onClick={() => setHalfSession(s)} title={SESSION_LABEL[s]} description={s === 'first_half' ? 'Morning is off' : 'Afternoon is off'} />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-line p-3">
          <div>
            <p className="text-sm font-semibold text-fg">Optional (restricted) holiday</p>
            <p className="text-xs text-fg-muted">Employees choose it with the optional holiday leave. It is a working day for everyone else.</p>
          </div>
          <Switch checked={optional} onChange={setOptional} label="Optional holiday" />
        </div>

        <SubOrgPicker value={subOrg} onChange={(v) => { setSubOrg(v); setSites([]); }} allowShared={isOrgAdmin} />

        <div>
          <FieldLabel label="Applies to" />
          <div className="grid gap-2 sm:grid-cols-2">
            <OptionCard selected={siteMode === 'all'} onClick={() => setSiteMode('all')} title="All sites" description={subOrg ? 'Every site of this sub-organization' : 'Every site of the organization'} />
            <OptionCard selected={siteMode === 'some'} onClick={() => setSiteMode('some')} title="Selected sites" description="Only employees at these sites; each can differ" />
          </div>
          {siteMode === 'some' && (
            <div className={cx('mt-2 max-h-52 divide-y divide-line overflow-y-auto rounded-lg border', errors.sites ? 'border-[var(--tt-danger)]' : 'border-line')}>
              {allSites.length === 0 && <p className="p-3 text-xs text-fg-muted">No sites to pick.</p>}
              {allSites.map((s) => {
                const picked = sites.find((x) => x.site_id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <label className="flex min-w-0 items-center gap-2 text-sm text-fg">
                      <input type="checkbox" checked={Boolean(picked)} onChange={() => toggleSite(s.id)} className="h-4 w-4 accent-[var(--tt-primary)]" />
                      <span className="truncate">{s.name}</span>
                    </label>
                    {picked && (
                      <div className={cx(shellClass(false), 'h-8 w-36 shrink-0')}>
                        <select
                          value={picked.session ?? ''}
                          onChange={(e) => setSiteSession(s.id, (e.target.value || null) as HolidaySession | null)}
                          className="w-full bg-transparent text-xs text-fg outline-none"
                          aria-label={`Session at ${s.name}`}
                        >
                          <option value="">Same as holiday</option>
                          {(['full', 'first_half', 'second_half'] as const).map((v) => <option key={v} value={v}>{SESSION_LABEL[v]}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <FieldMessage error={errors.sites} />
        </div>

        <TextField label="Note" value={description} onChange={setDescription} placeholder="Optional" maxLength={255} />
      </div>
    </Dialog>
  );
}

'use client';

import React from 'react';
import { Check, Search, Users, X } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Chip } from '@/components/ui/FormControls';
import { PersonPicker } from '@/features/task-management/components/PersonPicker';
import type { PersonOption } from '@/features/task-management/types/tm.types';
import * as api from '../api/mom.api';
import type { AssignInput } from '../api/mom.api';

export type AssignTab = 'people' | 'department' | 'site';
export interface AssignValue { tab: AssignTab; people: PersonOption[]; departmentIds: number[]; siteIds: number[]; mode: 'shared' | 'separate' }
export const EMPTY_ASSIGN: AssignValue = { tab: 'people', people: [], departmentIds: [], siteIds: [], mode: 'shared' };

/** The form value as the API takes it, or null for nobody. */
export function toAssign(v: AssignValue): AssignInput | null {
  if (v.tab === 'people') return v.people.length ? { employee_ids: v.people.map((p) => p.id), mode: v.mode } : null;
  if (v.tab === 'department') return v.departmentIds.length ? { department_ids: v.departmentIds, site_ids: v.siteIds, mode: v.mode } : null;
  return v.siteIds.length ? { site_ids: v.siteIds, mode: v.mode } : null;
}

type Options = Awaited<ReturnType<typeof api.assignOptions>>;
let optionsCache: Promise<Options> | null = null;
const loadOptions = () => (optionsCache ??= api.assignOptions().catch((e) => { optionsCache = null; throw e; }));

/** Departments or sites: a search bar over a list you tick, the chosen ones shown as chips above. */
function OptionPicker({ label, all, value, onChange, placeholder, hint }: { label: string; all: { id: number; name: string }[]; value: number[]; onChange: (v: number[]) => void; placeholder: string; hint?: string }) {
  const [q, setQ] = React.useState('');
  const needle = q.trim().toLowerCase();
  const shown = needle ? all.filter((x) => x.name.toLowerCase().includes(needle)) : all;
  const toggle = (id: number) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-fg">{label}</p>
        {value.length > 0 && <button type="button" onClick={() => onChange([])} className="text-[11px] font-semibold text-fg-muted hover:text-fg">Clear ({value.length})</button>}
      </div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-semibold text-fg">
              {all.find((x) => x.id === id)?.name || `#${id}`}
              <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((v) => v !== id))} className="rounded-full p-0.5 hover:bg-line"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-line bg-surface focus-within:border-[var(--tt-primary)]">
        <div className="flex h-9 items-center border-b border-line px-2.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-fg-subtle" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="ml-2 w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle focus:ring-0" />
        </div>
        <ul className="max-h-44 overflow-y-auto py-1" role="listbox" aria-label={label} aria-multiselectable>
          {shown.map((x) => {
            const on = value.includes(x.id);
            return (
              <li key={x.id} role="option" aria-selected={on}>
                <button type="button" onClick={() => toggle(x.id)} className={cx('flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-bg-subtle', on && 'bg-bg-subtle')}>
                  <span className={cx('truncate', on ? 'font-semibold text-fg' : 'text-fg')}>{x.name}</span>
                  {on && <Check className="h-3.5 w-3.5 shrink-0 text-fg" aria-hidden />}
                </button>
              </li>
            );
          })}
          {!shown.length && <li className="px-3 py-2 text-xs text-fg-muted">{all.length ? 'Nothing matches' : 'None to choose from'}</li>}
        </ul>
      </div>
      {hint && <p className="mt-1 text-[11px] text-fg-muted">{hint}</p>}
    </div>
  );
}

/**
 * Who an action goes to: people by name, a department (narrowed to sites when asked) or sites. Shows how many people that
 * reaches as it changes, and when it is more than one, asks whether any one of them completes it or each gets their own.
 * `allowSeparate` is false when editing (copies are only made when a point is added); `single` limits it to one person.
 */
export function AssignPicker({ value, onChange, allowSeparate = true, single = false, audience = false, invalid }: {
  value: AssignValue; onChange: (v: AssignValue) => void; allowSeparate?: boolean; single?: boolean; audience?: boolean; invalid?: boolean;
}) {
  const [options, setOptions] = React.useState<Options | null>(null);
  const [preview, setPreview] = React.useState<{ count: number; names: string[] } | null>(null);
  const [previewError, setPreviewError] = React.useState('');
  const search = React.useCallback((q: string) => api.people(q), []);
  React.useEffect(() => { if (!single) loadOptions().then(setOptions).catch(() => setOptions({ departments: [], sites: [], max: 100 })); }, [single]);

  const assign = toAssign(value);
  const key = JSON.stringify(assign);
  React.useEffect(() => {
    setPreviewError('');
    if (!assign || (value.tab === 'people' && value.people.length < 2)) { setPreview(null); return undefined; }
    const t = setTimeout(() => { api.assignPreview(assign, audience).then(setPreview).catch((e) => { setPreview(null); setPreviewError(e instanceof Error ? e.message : 'Could not count'); }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = (patch: Partial<AssignValue>) => onChange({ ...value, ...patch });
  const count = value.tab === 'people' ? value.people.length : preview?.count ?? 0;

  return (
    <div className={cx('space-y-3 rounded-xl border p-3', invalid ? 'border-[var(--tt-danger)]' : 'border-line')}>
      {!single && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Assign to">
          <Chip active={value.tab === 'people'} onClick={() => set({ tab: 'people' })}>People</Chip>
          <Chip active={value.tab === 'department'} onClick={() => set({ tab: 'department' })}>Department</Chip>
          <Chip active={value.tab === 'site'} onClick={() => set({ tab: 'site', departmentIds: [] })}>Site</Chip>
        </div>
      )}
      {value.tab === 'people' && (
        <PersonPicker multiple={!single} value={value.people} onChange={(v) => set({ people: single ? v.slice(-1) : v })} search={search} placeholder={single ? 'Search the owner' : audience ? 'Search people to share with' : 'Search people by name or code'} />
      )}
      {value.tab === 'department' && options && (
        <>
          <OptionPicker label="Department" all={options.departments} value={value.departmentIds} onChange={(v) => set({ departmentIds: v })} placeholder="Search departments" />
          <OptionPicker label="At sites" all={options.sites} value={value.siteIds} onChange={(v) => set({ siteIds: v })} placeholder="Search sites" hint={value.siteIds.length ? undefined : 'Leave empty to reach the department at every site.'} />
        </>
      )}
      {value.tab === 'site' && options && <OptionPicker label="Sites" all={options.sites} value={value.siteIds} onChange={(v) => set({ siteIds: v })} placeholder="Search sites" />}
      {(value.tab !== 'people' || value.people.length > 1) && (preview || previewError) && (
        <p className={cx('text-xs', previewError ? 'text-[var(--tt-danger)]' : 'text-fg-muted')}>
          {previewError || (preview && `${audience ? 'Shared with' : 'Reaches'} ${preview.count} ${preview.count === 1 ? 'person' : 'people'}${preview.names.length ? `: ${preview.names.join(', ')}${preview.count > preview.names.length ? '…' : ''}` : ''}`)}
        </p>
      )}
      {count > 1 && !audience && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Who completes it">
          <Chip active={value.mode === 'shared'} onClick={() => set({ mode: 'shared' })}>Any one of them completes it</Chip>
          {allowSeparate && <Chip active={value.mode === 'separate'} onClick={() => set({ mode: 'separate' })}>Each one gets their own</Chip>}
        </div>
      )}
    </div>
  );
}

/** Who a decision or note is shared with, as the form edits it. */
export interface AudienceValue { mode: 'attendees' | 'selected' | 'everyone'; assign: AssignValue }
export const DEFAULT_AUDIENCE: AudienceValue = { mode: 'selected', assign: EMPTY_ASSIGN };
export const EMPTY_AUDIENCE: AudienceValue = { mode: 'attendees', assign: EMPTY_ASSIGN };

/** The form value as the API takes it, or undefined when it is the people at the meeting. */
export function toAudience(v: AudienceValue): api.AudienceInput | undefined {
  if (v.mode === 'attendees') return undefined;
  if (v.mode === 'everyone') return { mode: 'everyone' };
  const picked = toAssign(v.assign);
  return picked ? { ...picked, mode: 'selected' } : undefined;
}

/** Plain words for who it is shared with, or null for the people at the meeting. */
export function audienceLabel(point: { audience_mode: string; audience_target: api.AssignTarget | null; audience_count: number }): string | null {
  if (point.audience_mode === 'everyone') return 'Everyone';
  if (point.audience_mode !== 'selected') return null;
  const t = point.audience_target;
  if (t && t.kind === 'group') return `${[t.departments.map((d) => d.name).join(', '), t.sites.length ? `at ${t.sites.map((x) => x.name).join(', ')}` : ''].filter(Boolean).join(' ')} · ${point.audience_count}`;
  return `${point.audience_count} ${point.audience_count === 1 ? 'person' : 'people'}`;
}

/** A short chip label for the current choice: "Share with…", or who it will be shared with. */
export function audienceLabelOf(v: AudienceValue): string {
  if (v.mode === 'everyone') return 'Shared with everyone';
  if (v.mode === 'selected') {
    const n = v.assign.tab === 'people' ? v.assign.people.length : v.assign.departmentIds.length + v.assign.siteIds.length;
    return n ? `Shared with ${v.assign.tab === 'people' ? `${n} ${n === 1 ? 'person' : 'people'}` : `${n} ${v.assign.tab === 'department' ? 'department' : 'site'}${n === 1 ? '' : 's'}`}` : 'Share with…';
  }
  return 'Share with…';
}

/** Choose who sees a decision or note besides the people at the meeting. */
export function AudiencePicker({ value, onChange }: { value: AudienceValue; onChange: (v: AudienceValue) => void }) {
  return (
    <div className="space-y-2.5 rounded-xl border border-line p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-fg"><Users className="h-3.5 w-3.5" aria-hidden />Share with</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Share with">
        <Chip active={value.mode === 'attendees'} onClick={() => onChange({ ...value, mode: 'attendees' })}>People at the meeting</Chip>
        <Chip active={value.mode === 'selected'} onClick={() => onChange({ ...value, mode: 'selected' })}>People, department or sites</Chip>
        <Chip active={value.mode === 'everyone'} onClick={() => onChange({ ...value, mode: 'everyone' })}>Everyone</Chip>
      </div>
      {value.mode === 'selected' && <AssignPicker audience allowSeparate={false} value={value.assign} onChange={(a) => onChange({ ...value, assign: a })} />}
      <p className="text-[11px] text-fg-muted">
        {value.mode === 'attendees' && 'Only the organizer and the people invited to the meeting see it.'}
        {value.mode === 'selected' && 'They also see it, even if they were not at the meeting. People at the meeting still see it.'}
        {value.mode === 'everyone' && 'Everyone in the meeting\'s company sees it. Nobody is notified; it shows in their meetings.'}
      </p>
    </div>
  );
}

/** Picks the one person who signs an action off when it is done. Empty means the person adding it. */
export function ReviewerPicker({ value, onChange, invalid }: { value: PersonOption | null; onChange: (v: PersonOption | null) => void; invalid?: boolean }) {
  const search = React.useCallback((q: string) => api.people(q), []);
  return (
    <div className={cx('space-y-1.5 rounded-xl border p-3', invalid ? 'border-[var(--tt-danger)]' : 'border-line')}>
      <p className="text-xs font-semibold text-fg">Who signs off?</p>
      <PersonPicker multiple={false} value={value ? [value] : []} onChange={(v) => onChange(v.length ? v[v.length - 1] : null)} search={search} placeholder="Search the person who signs off" />
      <p className="text-[11px] text-fg-muted">{value ? 'They confirm it when the owner finishes, or send it back.' : 'Leave empty and you sign it off.'}</p>
    </div>
  );
}

/** "Sales at Pune, Mumbai · 8 people", or the owner names for people picked by name. */
export function assignLabel(point: { owner_name: string | null; owners: { name: string }[]; assign_target: api.AssignTarget | null; assign_mode: string }): string | null {
  const t = point.assign_target;
  // One-each copies belong to one person: that person is the label.
  if (point.assign_mode !== 'separate' && t && t.kind === 'group') {
    const where = [t.departments.map((d) => d.name).join(', '), t.sites.length ? `at ${t.sites.map((x) => x.name).join(', ')}` : ''].filter(Boolean).join(' ');
    return `${where || 'Group'} · ${point.owners.length} ${point.owners.length === 1 ? 'person' : 'people'}`;
  }
  if (point.assign_mode === 'shared' && point.owners.length > 1) return `Any of ${point.owners.map((o) => o.name.split(' ')[0]).join(', ')}`;
  return point.owner_name;
}

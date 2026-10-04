'use client';

import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Copy, List, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { usePermission } from '@/lib/hooks/usePermission';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { StatusPill } from '@/components/ui/StatusPill';
import { Switch } from '@/components/ui/Switch';
import { SubOrgFilter } from '@/features/sub-organizations/components/SubOrgFilter';
import { SubOrgBadge } from '@/features/sub-organizations/components/SubOrgBadge';
import { useHolidays } from '../hooks/useHolidays';
import { useHolidayMutations } from '../hooks/useHolidayMutations';
import { HOLIDAY_PERMISSIONS, HOLIDAY_TYPES, SESSION_LABEL, STATUS_OPTIONS } from '../constants';
import type { Holiday } from '../types/holidays';
import { HolidayFormDialog } from './HolidayFormDialog';
import { HolidaysEmptyState } from './HolidaysEmptyState';
import { HolidayCalendar } from './HolidayCalendar';

const dateLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: d.getUTCDate(), month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }), weekday: d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' }) };
};

export function HolidaysPage() {
  const { can } = usePermission();
  const canAdd = can(HOLIDAY_PERMISSIONS.ADD);
  const canEdit = can(HOLIDAY_PERMISSIONS.EDIT);
  const canDelete = can(HOLIDAY_PERMISSIONS.DELETE);
  const list = useHolidays();
  const m = useHolidayMutations(list.refetch);

  const [view, setView] = React.useState<'list' | 'calendar'>('list');
  const [form, setForm] = React.useState<{ holiday?: Holiday } | null>(null);
  const [del, setDel] = React.useState<Holiday | null>(null);
  const [copyOpen, setCopyOpen] = React.useState(false);

  const close = () => { setForm(null); m.clearFieldError(); };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">Holidays</h1>
            <span className="rounded-md border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg-muted">{list.holidays.length}</span>
            <div className="ml-1 flex items-center rounded-lg border border-line">
              <button type="button" aria-label="Previous year" onClick={() => list.setYear(list.year - 1)} className="grid h-8 w-8 place-items-center hover:bg-bg-subtle"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-14 text-center text-sm font-semibold text-fg">{list.year}</span>
              <button type="button" aria-label="Next year" onClick={() => list.setYear(list.year + 1)} className="grid h-8 w-8 place-items-center hover:bg-bg-subtle"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-line p-0.5">
              {([['list', List], ['calendar', CalendarDays]] as const).map(([v, Icon]) => (
                <button key={v} type="button" aria-label={`${v} view`} onClick={() => setView(v)} className={cx('grid h-8 w-8 place-items-center rounded-md', view === v ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'text-fg-muted hover:bg-bg-subtle')}>
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            {canAdd && (
              <>
                <button type="button" onClick={() => setCopyOpen(true)} className="hidden h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-fg hover:bg-bg-subtle sm:inline-flex">
                  <Copy className="h-4 w-4 text-fg-muted" /> Copy to {list.year + 1}
                </button>
                <button type="button" onClick={() => setForm({})} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-3 text-sm font-semibold text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]">
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New holiday</span><span className="sm:hidden">Add</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex h-9 w-full items-center rounded-lg border border-line px-2.5 focus-within:border-[var(--tt-primary)] sm:w-60">
            <Search className="h-3.5 w-3.5 text-fg-subtle" />
            <input value={list.searchInput} onChange={(e) => list.setSearchInput(e.target.value)} placeholder="Search holidays…" className="ml-2 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-subtle" />
          </div>
          <div className="w-full sm:w-52"><SegmentedControl options={STATUS_OPTIONS} value={list.status} onChange={list.setStatus} /></div>
          <select value={list.type} onChange={(e) => list.setType(e.target.value)} aria-label="Type" className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-fg outline-none">
            <option value="">All types</option>
            {HOLIDAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <SubOrgFilter value={list.subOrgId} onChange={list.setSubOrgId} />
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
        {list.error && <div className="border-b border-line p-3"><Alert message={list.error} tone="error" /></div>}
        {list.loading ? (
          <div className="space-y-px">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse bg-bg-subtle/60" />)}</div>
        ) : list.holidays.length === 0 ? (
          <HolidaysEmptyState year={list.year} filtered={list.hasFilters} canAdd={canAdd} onAdd={() => setForm({})} onClear={list.clearFilters} />
        ) : view === 'calendar' ? (
          <HolidayCalendar year={list.year} holidays={list.holidays} onPick={(h) => canEdit && setForm({ holiday: h })} />
        ) : (
          <ul className={cx('min-h-0 flex-1 divide-y divide-line overflow-y-auto transition-opacity', list.fetching ? 'opacity-70' : 'opacity-100')}>
            {list.holidays.map((h) => {
              const d = dateLabel(h.date);
              return (
                <li key={h.id} className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-line bg-bg-subtle text-center leading-tight">
                    <span className="text-base font-bold text-fg">{d.day}</span>
                    <span className="text-[10px] font-semibold uppercase text-fg-muted">{d.month}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className={cx('truncate text-sm font-semibold text-fg', h.status === 'inactive' && 'text-fg-muted line-through')}>{h.name}</p>
                      {h.is_optional && <span className="rounded-md border border-dashed border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-muted">Optional</span>}
                      <SubOrgBadge subOrgId={h.sub_organization_id} hideEmpty />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {d.weekday}{h.type ? ` · ${h.type}` : ''} · {h.sites.length ? `${h.sites.length} site${h.sites.length === 1 ? '' : 's'}` : 'All sites'}
                    </p>
                  </div>
                  <span className={cx('hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline', h.session === 'full' ? 'border-line text-fg-muted' : 'border-[var(--tt-primary)] text-fg')}>{SESSION_LABEL[h.session]}</span>
                  <span className="hidden md:block"><StatusPill label={h.status} tone={h.status === 'active' ? 'active' : 'inactive'} /></span>
                  <div className="flex items-center gap-1">
                    {canEdit && <Switch checked={h.status === 'active'} onChange={() => m.toggle(h)} label={`Toggle ${h.name}`} />}
                    {canEdit && <button type="button" aria-label="Edit" onClick={() => setForm({ holiday: h })} className="grid h-8 w-8 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle"><Pencil className="h-4 w-4" /></button>}
                    {canDelete && <button type="button" aria-label="Delete" onClick={() => setDel(h)} className="grid h-8 w-8 place-items-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-[var(--tt-danger)]"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <HolidayFormDialog
        open={Boolean(form)}
        initial={form?.holiday}
        defaultYear={list.year}
        saving={m.saving}
        fieldError={m.fieldError}
        onClose={close}
        onSubmit={async (input) => {
          const ok = form?.holiday ? await m.update(form.holiday.id, input) : await m.create(input);
          if (ok) close();
        }}
      />

      <Dialog
        open={Boolean(del)}
        onClose={() => setDel(null)}
        title="Delete holiday"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDel(null)} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
            <button type="button" disabled={m.saving} onClick={async () => { if (del && (await m.remove(del))) setDel(null); }} className="h-9 rounded-lg bg-[var(--tt-danger)] px-4 text-sm font-semibold text-white disabled:opacity-60">Delete</button>
          </div>
        }
      >
        <p className="text-sm text-fg">Delete <b>{del?.name}</b> on {del?.date}? Attendance and payroll will treat that day as a normal working day.</p>
      </Dialog>

      <Dialog
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        title={`Copy ${list.year} holidays to ${list.year + 1}`}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCopyOpen(false)} className="h-9 rounded-lg border border-line px-4 text-sm font-semibold text-fg hover:bg-bg-subtle">Cancel</button>
            <button type="button" disabled={m.saving} onClick={async () => { if (await m.copy(list.year, list.year + 1)) { setCopyOpen(false); list.setYear(list.year + 1); } }} className="h-9 rounded-lg bg-[var(--tt-primary)] px-4 text-sm font-semibold text-[var(--tt-on-primary)] disabled:opacity-60">Copy holidays</button>
          </div>
        }
      >
        <p className="text-sm text-fg">Every holiday you can manage is copied to the same month and day. Existing holidays are kept. Festival dates change every year, so check the copied dates.</p>
      </Dialog>
    </div>
  );
}

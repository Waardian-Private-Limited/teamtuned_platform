'use client';

import React from 'react';
import { CalendarClock, Users } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { monthRange } from '@/lib/datetime';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../../api/detailedAttendance.api';
import type { MissedOverridePreviewDto } from '../../api/detailedAttendance.api';
import type { Filters } from '../../hooks/useAttendanceList';
import { shiftDate } from '../../utils/format';
import { controlClass, Select } from './controls';

const MAX_DAYS = 400;
type Mode = 'month' | 'range';
type DayType = 'full_day' | 'half_day';

const startOfMonth = (d: string) => `${d.slice(0, 7)}-01`;
const endOfMonth = (d: string) => {
  const [y, m] = d.split('-').map(Number);
  return monthRange(`${y}-${String(m).padStart(2, '0')}`).to;
};

function presets(today: string) {
  const lastMonthEnd = shiftDate(startOfMonth(today), -1);
  return [
    { label: 'This month', from: startOfMonth(today), to: today },
    { label: 'Last month', from: startOfMonth(lastMonthEnd), to: endOfMonth(lastMonthEnd) },
    { label: 'Last 3 months', from: startOfMonth(shiftDate(startOfMonth(today), -62)), to: today },
  ];
}

const pill = (on: boolean) => cx('h-8 rounded-lg border px-3 text-xs font-bold transition-colors', on ? 'border-fg bg-bg-subtle text-fg' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg');

function Form({ today, filters: initial, options, onClose }: { today: string; filters: Filters; options: FilterOptionsDto | null; onClose: () => void }) {
  const { track } = useDownloadCenter();
  const quick = React.useMemo(() => presets(today), [today]);
  const [subOrgId, setSubOrgId] = React.useState<number | null>(initial.subOrgId);
  const [siteId, setSiteId] = React.useState<number | null>(initial.siteId);
  const [mode, setMode] = React.useState<Mode>('month');
  const [month, setMonth] = React.useState(today.slice(0, 7));
  const [from, setFrom] = React.useState(quick[0].from);
  const [to, setTo] = React.useState(quick[0].to);
  const [type, setType] = React.useState<DayType>('full_day');
  const [reason, setReason] = React.useState('');
  const [preview, setPreview] = React.useState<MissedOverridePreviewDto | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const days = from && to ? Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1 : 0;
  const rangeError = mode === 'month' ? (month ? null : 'Pick the month') : !from || !to ? 'Pick the first and last date' : from > to ? 'The first date cannot be after the last' : days > MAX_DAYS ? `Pick at most ${MAX_DAYS} days` : null;

  // Any scope change invalidates a shown preview: the admin must preview again before applying.
  const scopeBody = (): api.MissedOverrideScope => (mode === 'month' ? { month, subOrgId, siteId } : { from, to, subOrgId, siteId });
  React.useEffect(() => { setPreview(null); }, [mode, month, from, to, subOrgId, siteId]);

  const runPreview = async () => {
    if (rangeError) return;
    setPreviewing(true);
    setError(null);
    try {
      setPreview(await api.previewMissedOverride(scopeBody()));
    } catch (e) {
      const m = messageOf(e);
      setError(m);
      showError(m);
    } finally {
      setPreviewing(false);
    }
  };

  const apply = async () => {
    if (!preview || preview.affected === 0 || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const job = await api.applyMissedOverride({ ...scopeBody(), type, reason: reason.trim() });
      track(job);
      showSuccess('Queued. The summary appears in Downloads when it is done.');
      onClose();
    } catch (e) {
      const m = messageOf(e);
      setError(m);
      showError(m);
    } finally {
      setBusy(false);
    }
  };

  const button = 'inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-semibold transition-colors sm:text-sm';
  const canApply = !!preview && preview.affected > 0 && !!reason.trim() && !busy;
  const label = type === 'full_day' ? 'Full day' : 'Half day';

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={<div><h2 className="text-base font-bold text-fg">Fix missed check-outs</h2><p className="text-xs text-fg-muted">Set every untouched missed check-out day to a full or half day. Runs in the background; a summary lands in Downloads.</p></div>}
      footer={
        <>
          <button type="button" onClick={onClose} className={cx(button, 'border border-line bg-surface text-fg hover:bg-bg-subtle')}>Cancel</button>
          {preview ? (
            <button type="button" disabled={!canApply} onClick={apply} className={cx(button, 'gap-1.5 bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40')}>
              {busy ? 'Applying…' : `Apply to ${preview.affected} day${preview.affected === 1 ? '' : 's'}`}
            </button>
          ) : (
            <button type="button" disabled={!!rangeError || previewing} onClick={runPreview} className={cx(button, 'gap-1.5 bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40')}>
              {previewing ? 'Checking…' : 'Preview'}
            </button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Scope</h3>
          <div className="grid grid-cols-2 gap-3">
            {!!options && options.sub_organizations.length > 0 && <Select label="Sub-organisation" allLabel="All sub-organisations" value={subOrgId} options={options.sub_organizations} onChange={setSubOrgId} />}
            <Select label="Site" allLabel={options?.access.all_sites === false ? 'All my sites' : 'All sites'} value={siteId} options={options?.sites ?? []} onChange={setSiteId} disabled={!!options && options.sites.length === 0} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Period</h3>
          <div className="mb-2.5 grid grid-cols-2 gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5" role="tablist" aria-label="Period">
            {([['month', 'A month'], ['range', 'Custom range']] as const).map(([value, text]) => (
              <button key={value} type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)}
                className={cx('h-8 rounded-md text-xs font-semibold transition-colors', mode === value ? 'border border-line/70 bg-surface font-bold text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>{text}</button>
            ))}
          </div>
          {mode === 'month' ? (
            <label className="flex max-w-[14rem] flex-col gap-1"><span className="sr-only">Month</span><input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => setMonth(e.target.value)} className={controlClass} /></label>
          ) : (
            <>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {quick.map((p) => (
                  <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }} className={pill(from === p.from && to === p.to)}>{p.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">From</span><input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={controlClass} /></label>
                <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">To</span><input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={controlClass} /></label>
              </div>
            </>
          )}
          {rangeError && <p className="mt-1.5 text-xs text-[var(--tt-danger)]">{rangeError}</p>}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Mark each as</h3>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mark each as">
            {([['full_day', 'Full day', 'Counts as a whole present day'], ['half_day', 'Half day', 'Counts as half a present day']] as const).map(([value, title, hint]) => (
              <button key={value} type="button" role="radio" aria-checked={type === value} onClick={() => setType(value)}
                className={cx('flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors', type === value ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle')}>
                <span className="text-sm font-bold text-fg">{title}</span>
                <span className="text-[11px] leading-snug text-fg-muted">{hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Reason</h3>
          <textarea value={reason} maxLength={255} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Why these days are being set (kept on every day's history)"
            className="w-full rounded-[var(--tt-radius-control)] border border-line bg-surface px-3 py-2 text-sm font-medium text-fg outline-none transition-colors hover:border-line-strong focus:border-[var(--tt-primary)]" />
        </section>

        {preview && (
          <section className="rounded-xl border border-line bg-bg-subtle p-3">
            {preview.affected === 0 ? (
              <p className="text-sm font-semibold text-fg">No untouched missed check-out days in that scope.</p>
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-bold text-fg"><CalendarClock className="h-4 w-4" /> {preview.affected} day{preview.affected === 1 ? '' : 's'} across {preview.employees} {preview.employees === 1 ? 'person' : 'people'} → {label}</p>
                {(preview.skipped.locked + preview.skipped.overridden + preview.skipped.regularized > 0) && (
                  <p className="mt-1 text-xs text-fg-muted">Skipped: {[preview.skipped.locked && `${preview.skipped.locked} payroll-locked`, preview.skipped.overridden && `${preview.skipped.overridden} already overridden`, preview.skipped.regularized && `${preview.skipped.regularized} under regularization`].filter(Boolean).join(', ')}.</p>
                )}
                {preview.by_employee.length > 0 && (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
                    {preview.by_employee.map((e) => (
                      <li key={`${e.code}-${e.name}`} className="flex items-center justify-between gap-2 text-xs text-fg">
                        <span className="inline-flex min-w-0 items-center gap-1.5"><Users className="h-3 w-3 shrink-0 text-fg-muted" /><span className="truncate">{e.name}{e.code ? ` · ${e.code}` : ''}</span></span>
                        <span className="shrink-0 font-semibold text-fg-muted">{e.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {!reason.trim() && <p className="mt-2 text-xs text-[var(--tt-danger)]">Add a reason to apply.</p>}
              </>
            )}
          </section>
        )}
        {error && <Alert message={error} />}
      </div>
    </Dialog>
  );
}

export function BulkOverrideDialog(props: { open: boolean; today: string; filters: Filters; options: FilterOptionsDto | null; onClose: () => void }) {
  if (!props.open || !props.today) return null;
  return <Form today={props.today} filters={props.filters} options={props.options} onClose={props.onClose} />;
}

'use client';

import React from 'react';
import { Download, FileSpreadsheet, FileText, Mail, Search, Table2, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Alert } from '@/components/ui/Alert';
import { cx } from '@/theme/tokens';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import type { FilterOptionsDto } from '@/features/attendance-dashboard/types/dashboard.dto';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import * as api from '../../api/detailedAttendance.api';
import type { Filters } from '../../hooks/useAttendanceList';
import { toList } from '../../types/detailed.mapper';
import type { AttendanceRow } from '../../types/detailed.model';
import { ONLY_OPTIONS } from '../../constants/detailed.constants';
import type { OnlyKey } from '../../types/detailed.model';
import { shiftDate } from '../../utils/format';
import { Avatar, controlClass, Select } from './controls';

type Format = 'xlsx' | 'csv' | 'pdf';
type Report = 'daily' | 'monthly' | 'data';
const MAX_DAYS = 400;

const REPORTS: Array<{ value: Report; label: string; hint: string }> = [
  { value: 'daily', label: 'Daily report', hint: 'Everyone on one date, counts per site' },
  { value: 'monthly', label: 'Monthly report', hint: 'A month grid per person, day by day' },
  { value: 'data', label: 'Detailed data', hint: 'A summary per month and a line per day' },
];

/** What each report can be saved as; the daily and monthly reports are Excel or PDF. */
const FORMATS_FOR: Record<Report, Format[]> = { daily: ['xlsx', 'pdf'], monthly: ['xlsx', 'pdf'], data: ['xlsx', 'csv', 'pdf'] };

const FORMATS: Array<{ value: Format; label: string; hint: string; icon: typeof FileText }> = [
  { value: 'xlsx', label: 'Excel', hint: 'Opens in Excel or Sheets', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', hint: 'A line per day, opens anywhere', icon: Table2 },
  { value: 'pdf', label: 'PDF', hint: 'Ready to print or share', icon: FileText },
];

const startOfMonth = (d: string) => `${d.slice(0, 7)}-01`;
const endOfMonth = (d: string) => {
  const [y, m] = d.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};

function presets(today: string, date: string) {
  const lastMonthEnd = shiftDate(startOfMonth(today), -1);
  const picked = date || today;
  return [
    { label: picked === today ? 'Today' : 'The day on screen', from: picked, to: picked },
    { label: 'This month', from: startOfMonth(today), to: today },
    { label: 'Last month', from: startOfMonth(lastMonthEnd), to: endOfMonth(lastMonthEnd) },
    { label: 'Last 3 months', from: startOfMonth(shiftDate(startOfMonth(today), -62)), to: today },
    { label: 'This year', from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
}

const MAX_EMAILS = 5;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function scopeText(filters: Filters, options: FilterOptionsDto | null) {
  const parts = [
    options?.sub_organizations.find((s) => s.id === filters.subOrgId)?.name,
    options?.sites.find((s) => s.id === filters.siteId)?.name,
    options?.departments.find((d) => d.id === filters.departmentId)?.name,
    options?.roles.find((r) => r.id === filters.roleId)?.name,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : options?.access.all_sites === false ? 'All the sites you run' : 'Everyone you can see';
}

function Form({ today, date, filters: initial, options: initialOptions, onClose }: { today: string; date: string; filters: Filters; options: FilterOptionsDto | null; onClose: () => void }) {
  const { track } = useDownloadCenter();
  const quick = React.useMemo(() => presets(today, date), [today, date]);
  // The filters start as the list's and can be changed here without touching the list.
  const [filters, setFilters] = React.useState<Filters>(initial);
  const [options, setOptions] = React.useState<FilterOptionsDto | null>(initialOptions);
  const [only, setOnly] = React.useState<OnlyKey[]>([]);
  const [emailOn, setEmailOn] = React.useState(false);
  const [emails, setEmails] = React.useState<string[]>([]);
  const [emailText, setEmailText] = React.useState('');
  const [report, setReport] = React.useState<Report>('daily');
  const [month, setMonth] = React.useState(today.slice(0, 7));
  const [from, setFrom] = React.useState(quick[0].from);
  const [to, setTo] = React.useState(quick[0].to);
  const [format, setFormat] = React.useState<Format>('xlsx');
  const [pick, setPick] = React.useState(false);
  const [people, setPeople] = React.useState<AttendanceRow[]>([]);
  const [chosen, setChosen] = React.useState<Array<{ id: number; name: string }>>([]);
  const [term, setTerm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    api.getFilterOptions(filters.subOrgId, filters.departmentId, controller.signal)
      .then((o) => {
        setOptions(o);
        setFilters((f) => ({
          ...f,
          siteId: f.siteId && o.sites.some((x) => x.id === f.siteId) ? f.siteId : null,
          departmentId: f.departmentId && o.departments.some((x) => x.id === f.departmentId) ? f.departmentId : null,
          roleId: f.roleId && o.roles.some((x) => x.id === f.roleId) ? f.roleId : null,
        }));
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [filters.subOrgId, filters.departmentId]);

  React.useEffect(() => {
    if (!pick || term.trim().length < 2) { setPeople([]); return undefined; }
    const controller = new AbortController();
    const t = setTimeout(() => {
      api.listEmployees({ date: today, subOrgId: filters.subOrgId, siteId: filters.siteId, departmentId: filters.departmentId, roleId: filters.roleId, search: term.trim(), page: 1, pageSize: 8 }, controller.signal)
        .then((dto) => setPeople(toList(dto).rows))
        .catch(() => undefined);
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [pick, term, today, filters.subOrgId, filters.siteId, filters.departmentId, filters.roleId]);

  const days = from && to ? Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1 : 0;
  const rangeError = report === 'monthly' ? (month ? null : 'Pick the month') : report === 'daily' ? (from ? null : 'Pick the date') : !from || !to ? 'Pick the first and last date' : from > to ? 'The first date cannot be after the last' : days > MAX_DAYS ? `Pick at most ${MAX_DAYS} days` : null;
  const peopleError = pick && chosen.length === 0 ? 'Pick at least one person' : null;
  const addEmail = () => {
    const parts = emailText.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    const bad = parts.find((e) => !EMAIL.test(e));
    if (bad) { setError(`"${bad}" is not a valid email address`); return; }
    setError(null);
    setEmails((l) => [...new Set([...l, ...parts])].slice(0, MAX_EMAILS));
    setEmailText('');
  };
  const pending = emailOn && emailText.trim().length > 0;
  const emailError = emailOn && emails.length === 0 && !pending ? 'Add at least one email address' : null;
  const blocked = !!rangeError || !!peopleError || !!emailError;

  const submit = async () => {
    if (pending) { addEmail(); return; }
    setBusy(true);
    setError(null);
    try {
      const job = await api.requestExport({
        report, from: report === 'monthly' ? `${month}-01` : from, to: report === 'daily' ? from : to, month: report === 'monthly' ? month : undefined, format,
        subOrgId: filters.subOrgId, siteId: filters.siteId, departmentId: filters.departmentId, roleId: filters.roleId,
        employeeIds: pick ? chosen.map((c) => c.id) : undefined,
        only: report === 'monthly' || !only.length ? undefined : only,
        emails: emailOn ? emails : undefined,
      });
      track(job);
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
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={<div><h2 className="text-base font-bold text-fg">Export attendance</h2><p className="text-xs text-fg-muted">Prepared in the background. It appears in Downloads when it is ready.</p></div>}
      footer={
        <>
          <button type="button" onClick={onClose} className={cx(button, 'border border-line bg-surface text-fg hover:bg-bg-subtle')}>Cancel</button>
          <button type="button" disabled={blocked || busy} onClick={submit} className={cx(button, 'gap-1.5 bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)] disabled:cursor-not-allowed disabled:opacity-40')}>
            <Download className="h-4 w-4" /> {busy ? 'Requesting…' : 'Export'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Report</h3>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Report">
            {REPORTS.map((r) => (
              <button key={r.value} type="button" role="radio" aria-checked={report === r.value} onClick={() => { setReport(r.value); if (!FORMATS_FOR[r.value].includes(format)) setFormat('xlsx'); }}
                className={cx('flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors', report === r.value ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle')}>
                <span className="text-sm font-bold text-fg">{r.label}</span>
                <span className="text-[11px] leading-snug text-fg-muted">{r.hint}</span>
              </button>
            ))}
          </div>
        </section>

        {report === 'data' ? (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Dates</h3>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {quick.map((p) => (
              <button key={p.label} type="button" onClick={() => { setFrom(p.from); setTo(p.to); }}
                className={cx('h-8 rounded-lg border px-3 text-xs font-bold transition-colors', from === p.from && to === p.to ? 'border-fg bg-bg-subtle text-fg' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg')}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">From</span><input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={controlClass} /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">To</span><input type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} className={controlClass} /></label>
          </div>
          {rangeError ? <p className="mt-1.5 text-xs text-[var(--tt-danger)]">{rangeError}</p> : <p className="mt-1.5 text-xs text-fg-muted">{days} day{days === 1 ? '' : 's'}. Up to {MAX_DAYS} days in one file.</p>}
        </section>
        ) : (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">{report === 'daily' ? 'Date' : 'Month'}</h3>
          {report === 'daily' ? (
            <>
              <div className="mb-2.5 flex flex-wrap gap-1.5">
                {[{ label: 'Today', v: today }, { label: 'Yesterday', v: shiftDate(today, -1) }, ...(date && date !== today && date !== shiftDate(today, -1) ? [{ label: 'The day on screen', v: date }] : [])].map((p) => (
                  <button key={p.label} type="button" onClick={() => setFrom(p.v)} className={cx('h-8 rounded-lg border px-3 text-xs font-bold transition-colors', from === p.v ? 'border-fg bg-bg-subtle text-fg' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg')}>{p.label}</button>
                ))}
              </div>
              <label className="flex max-w-[14rem] flex-col gap-1"><span className="sr-only">Date</span><input type="date" value={from} max={today} onChange={(e) => setFrom(e.target.value)} className={controlClass} /></label>
            </>
          ) : (
            <label className="flex max-w-[14rem] flex-col gap-1"><span className="sr-only">Month</span><input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => setMonth(e.target.value)} className={controlClass} /></label>
          )}
          {rangeError && <p className="mt-1.5 text-xs text-[var(--tt-danger)]">{rangeError}</p>}
        </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Who</h3>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-line/60 bg-bg-subtle p-0.5" role="tablist" aria-label="Who to include">
            {([[false, 'By filters'], [true, 'Pick people']] as const).map(([value, label]) => (
              <button key={label} type="button" role="tab" aria-selected={pick === value} onClick={() => setPick(value)}
                className={cx('h-8 rounded-md text-xs font-semibold transition-colors', pick === value ? 'border border-line/70 bg-surface font-bold text-fg shadow-xs' : 'text-fg-muted hover:text-fg')}>{label}</button>
            ))}
          </div>
          {!pick ? (
            <div className="mt-2.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                {!!options && options.sub_organizations.length > 0 && <Select label="Sub-organisation" allLabel="All sub-organisations" value={filters.subOrgId} options={options.sub_organizations} onChange={(v) => setFilters((f) => ({ ...f, subOrgId: v }))} />}
                <Select label="Site" allLabel={options?.access.all_sites === false ? 'All my sites' : 'All sites'} value={filters.siteId} options={options?.sites ?? []} onChange={(v) => setFilters((f) => ({ ...f, siteId: v }))} disabled={!!options && options.sites.length === 0} />
                <Select label="Department" allLabel="All departments" value={filters.departmentId} options={options?.departments ?? []} onChange={(v) => setFilters((f) => ({ ...f, departmentId: v }))} />
                <Select label="Role" allLabel="All roles" value={filters.roleId} options={options?.roles ?? []} onChange={(v) => setFilters((f) => ({ ...f, roleId: v }))} />
              </div>
              <p className="text-xs text-fg-muted">{scopeText(filters, options)}. Anyone who has since left is included if they have attendance in these dates.</p>
            </div>
          ) : (
            <div className="mt-2.5 space-y-2.5">
              {chosen.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {chosen.map((c) => (
                    <li key={c.id} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-semibold text-fg">
                      {c.name}
                      <button type="button" aria-label={`Remove ${c.name}`} onClick={() => setChosen((l) => l.filter((x) => x.id !== c.id))} className="rounded-full p-0.5 text-fg-muted hover:bg-line hover:text-fg"><X className="h-3 w-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <label className="relative block">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Type a name or code" aria-label="Find a person" className={cx(controlClass, 'pl-9 font-medium')} />
              </label>
              {people.length > 0 && (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {people.filter((p) => !chosen.some((c) => c.id === p.employeeId)).map((p) => (
                    <li key={p.employeeId}>
                      <button type="button" onClick={() => { setChosen((l) => [...l, { id: p.employeeId, name: p.name }]); setTerm(''); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-bg-subtle">
                        <Avatar name={p.name} size="sm" />
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-fg">{p.name}</span><span className="block truncate text-xs text-fg-muted">{[p.code, p.department].filter(Boolean).join(' · ')}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {peopleError && <p className="text-xs text-[var(--tt-danger)]">{peopleError}</p>}
            </div>
          )}
        </section>

        {report !== 'monthly' && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">Only days that were</h3>
          <div className="flex flex-wrap gap-1.5">
            {ONLY_OPTIONS.map((o) => {
              const on = only.includes(o.value);
              return (
                <button key={o.value} type="button" aria-pressed={on} onClick={() => setOnly((l) => (on ? l.filter((x) => x !== o.value) : [...l, o.value]))}
                  className={cx('h-8 rounded-lg border px-3 text-xs font-bold transition-colors', on ? 'border-fg bg-bg-subtle text-fg' : 'border-line text-fg-muted hover:bg-bg-subtle hover:text-fg')}>{o.label}</button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-fg-muted">{only.length ? 'The daily lines list only these days. Monthly totals still cover everything.' : 'Nothing picked: every day is listed.'}</p>
        </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-muted">File</h3>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="File format">
            {FORMATS.filter((f) => FORMATS_FOR[report].includes(f.value)).map(({ value, label, hint, icon: Icon }) => (
              <button key={value} type="button" role="radio" aria-checked={format === value} onClick={() => setFormat(value)}
                className={cx('flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors', format === value ? 'border-fg bg-bg-subtle ring-1 ring-fg' : 'border-line bg-surface hover:bg-bg-subtle')}>
                <Icon className="h-5 w-5 text-fg" />
                <span className="text-sm font-bold text-fg">{label}</span>
                <span className="text-[11px] leading-snug text-fg-muted">{hint}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-fg-muted">
            <input type="checkbox" checked={emailOn} onChange={(e) => setEmailOn(e.target.checked)} className="h-4 w-4 accent-[var(--tt-primary)]" />
            <Mail className="h-4 w-4" aria-hidden /> Also send it by email
          </label>
          {emailOn && (
            <div className="space-y-2.5">
              {emails.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {emails.map((e) => (
                    <li key={e} className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-subtle py-0.5 pl-2.5 pr-1 text-xs font-semibold text-fg">
                      {e}
                      <button type="button" aria-label={`Remove ${e}`} onClick={() => setEmails((l) => l.filter((x) => x !== e))} className="rounded-full p-0.5 text-fg-muted hover:bg-line hover:text-fg"><X className="h-3 w-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
              {emails.length < MAX_EMAILS && (
                <div className="flex gap-2">
                  <input type="email" inputMode="email" value={emailText} onChange={(e) => setEmailText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(); } }}
                    placeholder="name@company.com" aria-label="Email address" className={cx(controlClass, 'font-medium')} />
                  <button type="button" onClick={addEmail} disabled={!emailText.trim()} className="h-9 shrink-0 rounded-lg border border-line px-3 text-xs font-bold text-fg hover:bg-bg-subtle disabled:opacity-40">Add</button>
                </div>
              )}
              {emailError ? <p className="text-xs text-[var(--tt-danger)]">{emailError}</p> : <p className="text-xs text-fg-muted">Up to {MAX_EMAILS} addresses. Small files are attached; larger ones are ready in Downloads and the email says so.</p>}
            </div>
          )}
        </section>
        {error && <Alert message={error} />}
      </div>
    </Dialog>
  );
}

export function ExportDialog(props: { open: boolean; today: string; date: string; filters: Filters; options: FilterOptionsDto | null; onClose: () => void }) {
  if (!props.open || !props.today) return null;
  return <Form today={props.today} date={props.date} filters={props.filters} options={props.options} onClose={props.onClose} />;
}

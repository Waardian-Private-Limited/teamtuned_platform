'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, History, Save, Send } from 'lucide-react';
import { addDays, formatDate, formatDayTime } from '@/lib/datetime';
import { fieldErrorsOf, messageOf } from '@/lib/api/errors';
import { showError, showSuccess } from '@/lib/toast';
import { Dialog } from '@/components/ui/Dialog';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { useAsync } from '@/features/data-collection/hooks/useAsync';
import { Btn, IconBtn } from '@/features/performance/components/ui';
import * as api from '../api/dpr.api';
import type { BillingData, ItemOps, ProgressData, ReportForm, ReportKind } from '../api/dpr.api';
import { BILLING_STEPS, BillingForm } from './BillingForm';
import { PROGRESS_STEPS, ProgressForm } from './ProgressForm';
import { errorsUnder, Tag } from './parts';

const REASON: Record<NonNullable<ReportForm['access']['reason']>, string> = {
  not_set_up: 'This site is not set up yet.', no_plan: 'This month has no plan yet, so there is no report to fill.', future: 'This day has not come yet.',
  no_role: 'You can read this report. Only the site’s reporters fill it.', closed: 'This day can no longer be changed. A report is filled today or yesterday and corrected until the end of the next day.',
};

function Revisions({ reportId, onClose }: { reportId: number; onClose: () => void }) {
  const { data, error } = useAsync(() => api.revisions(reportId), [reportId]);
  const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return (
    <Dialog open onClose={onClose} title="Corrections" maxWidthClassName="max-w-xl">
      {error && <p className="text-sm text-[var(--tt-danger)]">{error}</p>}
      {data && !data.items.length && <p className="text-sm text-fg-muted">No corrections.</p>}
      <ol className="space-y-3">
        {data?.items.map((r) => (
          <li key={r.revision_no} className="rounded-lg border border-line p-3">
            <p className="text-xs font-semibold text-fg">Correction {r.revision_no} · {r.by_name || 'Someone'} · {formatDayTime(r.changed_at)}</p>
            <ul className="mt-1.5 space-y-0.5 text-xs">{r.changes.slice(0, 60).map((c, i) => <li key={i}><span className="text-fg-muted">{c.path}:</span> <s className="text-fg-muted">{show(c.from)}</s> → <b>{show(c.to)}</b></li>)}</ul>
          </li>
        ))}
      </ol>
    </Dialog>
  );
}

/** One day's report, filled on a phone or at a desk: every section on one page, saved as a draft or submitted. */
export function DprReportPage({ basePath, siteId, date, kind }: { basePath: string; siteId: number; date: string; kind: ReportKind }) {
  const router = useRouter();
  const { data: form, error, setData } = useAsync(() => api.reportForm(siteId, date, kind), [siteId, date, kind]);
  const [progress, setProgress] = React.useState<ProgressData | null>(null);
  const [billing, setBilling] = React.useState<BillingData | null>(null);
  const [ops, setOps] = React.useState<ItemOps>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<'' | 'draft' | 'submit'>('');
  const [revisions, setRevisions] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const steps: { title: string; keys: string[]; items?: string }[] = kind === 'progress' ? PROGRESS_STEPS : BILLING_STEPS;
  /** Errors per step: the answers a step holds, and the new items of its kind. */
  const errorsOf = (i: number, fields: Record<string, string> = errors) => {
    const s = steps[i];
    const adds = (ops.add || []).map((a, j) => (a.kind === s.items ? j : -1)).filter((j) => j >= 0);
    return s.keys.reduce((n, k) => n + errorsUnder(fields, k), 0) + adds.reduce((n, j) => n + errorsUnder(fields, `items.add.${j}`), 0);
  };
  const go = (i: number) => { setStep(i); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  React.useEffect(() => {
    if (!form) return;
    if (form.kind === 'progress') {
      const { _items, ...rest } = form.data;
      setProgress(rest as ProgressData);
      setOps(_items || {});
    } else setBilling(form.data);
    setErrors({});
  }, [form]);

  const save = async (submit: boolean) => {
    if (!form) return;
    setBusy(submit ? 'submit' : 'draft');
    setErrors({});
    try {
      const out = await api.saveReport(siteId, date, { kind, submit, data: (kind === 'progress' ? progress : billing) as ProgressData | BillingData, ...(kind === 'progress' ? { items: ops } : {}) });
      setData(out);
      if (submit) { showSuccess(form.report?.status === 'submitted' ? 'Correction saved' : 'Report submitted'); router.push(`${basePath}/daily`); } else showSuccess('Draft saved');
    } catch (e) {
      const { fields, general } = fieldErrorsOf(e);
      setErrors(fields);
      showError(general || messageOf(e));
      // As on the old form, go to the first step with something missing.
      const first = steps.findIndex((_, i) => errorsOf(i, fields) > 0);
      if (first >= 0) go(first);
    } finally { setBusy(''); }
  };

  const back = `${basePath}/daily`;
  const day = (n: number) => `${basePath}/daily/${siteId}/${addDays(date, n)}?kind=${kind}`;
  if (error) return <div className="space-y-3"><Link href={back} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" />Back</Link><p className="text-sm text-[var(--tt-danger)]">{error}</p></div>;
  if (!form || (kind === 'progress' ? !progress : !billing)) return <div className="rounded-xl border border-line bg-surface p-4"><TableSkeleton rows={8} columns={3} /></div>;
  const disabled = !form.access.write;
  const submitted = form.report?.status === 'submitted';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4">
      <div className="space-y-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Link href={back} aria-label="Back to daily forms" className="mt-0.5 rounded-lg p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-fg sm:text-lg">{kind === 'progress' ? 'Planning form · daily progress report' : 'CBD form · billing report'}</h1>
              <p className="truncate text-xs text-fg-muted">{form.site.name} · {formatDate(date, 'long')}{!form.expected ? ' · off day' : ''}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href={day(-1)} aria-label="Day before" className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ChevronLeft className="h-4 w-4" /></Link>
            {date < form.today && <Link href={day(1)} aria-label="Next day" className="rounded-lg p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ChevronRight className="h-4 w-4" /></Link>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
          <Tag tone={submitted ? 'done' : form.report ? 'wait' : 'plain'}>{submitted ? 'Submitted' : form.report ? 'Draft' : 'Not started'}</Tag>
          {form.report?.filled_by_name && <span>{form.report.filled_by_name}{form.report.submitted_at ? ` · ${formatDayTime(form.report.submitted_at)}` : ''}</span>}
          {form.editable_until && form.access.write && <span>· can be corrected until {formatDate(form.editable_until, 'weekday')}</span>}
          {form.report && form.report.edit_count > 0 && <IconBtn label="Corrections" onClick={() => setRevisions(true)}><History className="h-4 w-4" /></IconBtn>}
        </div>
        {form.access.reason && <p className="rounded-lg bg-bg-subtle p-2.5 text-sm text-fg">{REASON[form.access.reason]}</p>}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-fg">Step {step + 1} of {steps.length} · {steps[step].title}</p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-subtle"><div className="h-full rounded-full bg-[var(--tt-primary)] transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 tt-scroll-hidden" aria-label="Steps">
            {steps.map((s, i) => {
              const n = errorsOf(i);
              return (
                <button key={s.title} type="button" onClick={() => go(i)} aria-current={i === step ? 'step' : undefined}
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold ${i === step ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : n ? 'border-[var(--tt-danger)] text-[var(--tt-danger)]' : 'border-line text-fg-muted hover:text-fg'}`}>
                  <span className="tabular-nums">{i + 1}</span>{s.title}{n ? ` · ${n}` : ''}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {form.kind === 'progress' && progress && <ProgressForm form={form} data={progress} ops={ops} onChange={setProgress} onOps={setOps} errors={errors} disabled={disabled} step={step} />}
      {form.kind === 'billing' && billing && <BillingForm form={form} data={billing} onChange={setBilling} errors={errors} disabled={disabled} step={step} />}
      {errors._general && <p className="text-sm text-[var(--tt-danger)]">{errors._general}</p>}

      <div className="sticky bottom-0 z-30 -mx-1 border-t border-line bg-bg/95 px-1 py-2.5 backdrop-blur">
        <div className="flex items-center justify-end gap-2">
          <Btn variant="secondary" icon={ArrowLeft} disabled={step === 0} onClick={() => go(step - 1)} className="mr-auto">Back</Btn>
          {!disabled && !submitted && <Btn variant="secondary" icon={Save} loading={busy === 'draft'} disabled={Boolean(busy)} onClick={() => save(false)}>Save draft</Btn>}
          {step < steps.length - 1
            ? <Btn onClick={() => go(step + 1)}>Continue<ArrowRight className="h-3.5 w-3.5" /></Btn>
            : !disabled && <Btn icon={Send} loading={busy === 'submit'} disabled={Boolean(busy)} onClick={() => save(true)}>{submitted ? 'Resubmit' : 'Submit report'}</Btn>}
        </div>
      </div>
      {revisions && form.report && <Revisions reportId={form.report.id} onClose={() => setRevisions(false)} />}
    </div>
  );
}

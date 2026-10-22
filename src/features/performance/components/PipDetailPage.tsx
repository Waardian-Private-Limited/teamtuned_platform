'use client';

import React from 'react';
import { HELP } from '@/features/performance/constants/help';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import { ConfirmDialog, type ConfirmState } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { StatusPill } from '@/components/ui/StatusPill';
import { Textarea } from '@/components/ui/Textarea';
import * as api from '../api/perf.api';
import { PIP_STATUS_LABEL } from '../constants/perf.constants';
import { errorsOf, type FieldErrors } from '../hooks/useResource';
import type { Pip } from '../types/perf.types';
import { Btn, PageHead } from './ui';

type Panel = 'extend' | 'close' | null;
const ITEM_LABEL = { open: 'Open', met: 'Met', not_met: 'Not met' } as const;

/** One improvement plan: objectives, notes, and the actions the viewer may take at its current stage. */
export function PipDetailPage({ id, basePath }: { id: number; basePath: string }) {
  const [pip, setPip] = React.useState<Pip | null>(null);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [panel, setPanel] = React.useState<Panel>(null);
  const [form, setForm] = React.useState({ end: '', reason: '', outcome: '', summary: '' });
  const [confirm, setConfirm] = React.useState<ConfirmState | null>(null);

  React.useEffect(() => { api.getPip(id).then(setPip).catch((e) => setError(messageOf(e))); }, [id]);
  if (!pip) return error ? <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p> : <div className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;

  const p = pip.permissions;
  const run = async (fn: () => Promise<Pip>, done: string) => {
    setBusy(true); setError(''); setErrors({});
    try { setPip(await fn()); showSuccess(done); setPanel(null); return true; } catch (e) { setErrors(errorsOf(e, 'form')); setError(messageOf(e)); return false; } finally { setBusy(false); }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageHead
        help={HELP.pip}
        title={<><Link href={`${basePath}/improvement-plans`} aria-label="All plans" className="rounded-[var(--tt-radius-sm)] p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><ArrowLeft className="h-4 w-4" /></Link>{pip.title}<StatusPill label={PIP_STATUS_LABEL[pip.status]} tone={pip.status === 'closed' ? 'terminated' : pip.status === 'active' ? 'active' : 'neutral'} /></>}
        subtitle={`${pip.employee_name} · ${pip.start_date} to ${pip.end_date}${pip.owner_name ? ` · Owner: ${pip.owner_name}` : ''}${pip.outcome ? ` · Outcome: ${pip.outcome === 'passed' ? 'Passed' : 'Failed'}` : ''}`}
        actions={<>
            {p?.can_submit && <Btn type="button" loading={busy} onClick={() => run(() => api.pipAction(id, 'submit'), pip.needs_approval ? 'Sent for approval' : 'Plan started')}>{pip.needs_approval ? 'Submit for approval' : 'Start plan'}</Btn>}
            {p?.can_withdraw && <Btn type="button" variant="secondary" loading={busy} onClick={() => run(() => api.pipAction(id, 'withdraw'), 'Withdrawn')}>Withdraw</Btn>}
            {p?.can_extend && <Btn type="button" variant="secondary" onClick={() => { setErrors({}); setForm({ ...form, end: pip.end_date, reason: '' }); setPanel('extend'); }}>Extend</Btn>}
            {p?.can_close && <Btn type="button" onClick={() => { setErrors({}); setForm({ ...form, outcome: '', summary: '' }); setPanel('close'); }}>Close with outcome</Btn>}
            {p?.can_cancel && <Btn type="button" variant="secondary" onClick={() => setConfirm({ title: 'Cancel this plan?', body: <p className="text-sm text-fg">It closes with no outcome recorded.</p>, cta: 'Cancel plan', danger: true, run: () => run(() => api.pipAction(id, 'cancel'), 'Plan cancelled') })}>Cancel plan</Btn>}
        </>}
      >
        {pip.decision_note && <p className="text-sm text-fg"><span className="font-semibold">Changes asked for:</span> {pip.decision_note}</p>}
        {error && !panel && <p role="alert" className="text-sm text-[var(--tt-danger)]">{error}</p>}
      </PageHead>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-line bg-surface p-3 tt-scroll-hidden sm:p-4">
        {pip.reason && <div className="rounded-lg border border-line p-3"><p className="text-xs font-semibold text-fg">Why</p><p className="mt-1 whitespace-pre-wrap text-sm text-fg">{pip.reason}</p></div>}

        <div className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Objectives</p>
          {pip.items?.map((i) => (
            <div key={i.id} className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[1fr_9rem]">
              <div>
                <p className="text-sm font-semibold text-fg">{i.objective}</p>
                <p className="text-[11px] text-fg-muted">{[i.measure, i.due_date ? `due ${i.due_date}` : null, i.note].filter(Boolean).join(' · ')}</p>
              </div>
              {p?.can_mark_items ? (
                <SelectField<string> label="" value={i.status} onChange={(v) => v && run(() => api.pipMarkItem(id, i.id, { status: v, note: i.note || '' }), 'Saved')} options={(Object.keys(ITEM_LABEL) as (keyof typeof ITEM_LABEL)[]).map((k) => ({ value: k, label: ITEM_LABEL[k] }))} />
              ) : <p className="pt-2 text-sm text-fg">{ITEM_LABEL[i.status]}</p>}
            </div>
          ))}
        </div>

        {pip.outcome_note && <div className="rounded-lg border border-line p-3"><p className="text-xs font-semibold text-fg">How it ended</p><p className="mt-1 whitespace-pre-wrap text-sm text-fg">{pip.outcome_note}</p></div>}

        <div className="space-y-2 rounded-lg border border-line p-3">
          <p className="text-xs font-semibold text-fg sm:text-[13px]">Notes</p>
          {p?.can_checkin && (
            <div className="flex items-start gap-2">
              <div className="flex-1"><TextField label="" aria-label="Note" placeholder="How is it going?" value={note} onChange={setNote} maxLength={4000} error={errors.note} /></div>
              <Btn type="button" variant="secondary" size="field" loading={busy} onClick={async () => { if (await run(() => api.pipCheckin(id, note), 'Note added')) setNote(''); }}>Add note</Btn>
            </div>
          )}
          {pip.events?.length === 0 && <p className="text-xs text-fg-muted">No notes yet.</p>}
          {pip.events?.map((e) => <p key={e.id} className="text-xs text-fg"><span className="font-semibold">{e.author_name || 'Someone'}:</span> {e.note}<span className="text-fg-muted"> · {new Date(e.created_at).toLocaleDateString()}</span></p>)}
        </div>
      </div>

      <Dialog open={panel === 'extend'} onClose={() => setPanel(null)} title="Extend the plan"
        footer={<><Btn type="button" variant="secondary" onClick={() => setPanel(null)}>Cancel</Btn><Btn type="button" loading={busy} onClick={() => run(() => api.pipExtend(id, { end_date: form.end, reason: form.reason }), 'Plan extended')}>Extend</Btn></>}>
        <div className="space-y-3">
          <TextField label="New end date" type="date" value={form.end} onChange={(v) => setForm({ ...form, end: v })} error={errors.end_date} />
          <TextField label="Reason" value={form.reason} onChange={(v) => setForm({ ...form, reason: v })} error={errors.reason} maxLength={500} />
        </div>
      </Dialog>

      <Dialog open={panel === 'close'} onClose={() => setPanel(null)} title="Close with an outcome"
        footer={<><Btn type="button" variant="secondary" onClick={() => setPanel(null)}>Cancel</Btn><Btn type="button" loading={busy} onClick={() => run(() => api.pipClose(id, { outcome: form.outcome, note: form.summary }), pip.needs_approval ? 'Outcome sent for approval' : 'Plan closed')}>Close plan</Btn></>}>
        <div className="space-y-3">
          <p className="text-xs text-fg-muted">Mark every objective as met or not met first.{pip.needs_approval ? ' The outcome then goes for approval.' : ''}</p>
          <SelectField<string> label="Outcome" required value={form.outcome || null} onChange={(v) => setForm({ ...form, outcome: v || '' })} options={[{ value: 'passed', label: 'Passed' }, { value: 'failed', label: 'Failed' }]} error={errors.outcome} />
          <Textarea label="Summary" rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} error={errors.note} />
          {errors.items && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{errors.items}</p>}
        </div>
      </Dialog>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}

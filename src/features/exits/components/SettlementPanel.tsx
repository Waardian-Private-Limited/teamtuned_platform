'use client';

import React from 'react';
import { Calculator, FilePlus2, Pencil } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { inr } from '@/features/compensation/utils/format';
import { formatDate, orgToday, addDays } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showSuccess } from '@/lib/toast';
import * as api from '../api/exits.api';
import { PAY_MODE_LABEL, SETTLEMENT_STATUS_META } from '../constants/exits.constants';
import type { ExitSettlement, PayMode, SettlementLine } from '../types/exits';
import { Fact, TonePill } from './parts';

function OverrideDialog({ caseId, line, onClose, onDone }: { caseId: number; line: SettlementLine | null; onClose: () => void; onDone: (s: ExitSettlement) => void }) {
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (line) { setAmount(String(line.amount)); setReason(''); setErr(null); } }, [line]);
  if (!line) return null;
  const save = async () => {
    if (!(Number(amount) >= 0) || amount === '') { setErr('Enter the amount'); return; }
    if (!reason.trim()) { setErr('Say why the amount changes'); return; }
    setBusy(true);
    try { onDone(await api.overrideSettlementLine(caseId, line.id, { amount: Number(amount), reason: reason.trim() })); showSuccess('Line updated'); } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">Override: {line.label}</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Save override</Btn></>}>
      <div className="space-y-4">
        {err && <Alert message={err} />}
        {line.computed_amount != null && <p className="text-sm text-fg-muted">Calculated amount {inr(line.computed_amount)}.</p>}
        <TextField label="Amount" required inputMode="decimal" prefix="₹" value={amount} onChange={(v) => setAmount(v.replace(/[^\d.]/g, ''))} />
        <Textarea label="Reason" required value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      </div>
    </Dialog>
  );
}

function SubmitDialog({ open, caseId, onClose, onDone }: { open: boolean; caseId: number; onClose: () => void; onDone: (s: ExitSettlement) => void }) {
  const [due, setDue] = React.useState('');
  const [mode, setMode] = React.useState<PayMode | null>('next_run');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setDue(addDays(orgToday(), 30)); setMode('next_run'); setErr(null); } }, [open]);
  const save = async () => {
    setBusy(true);
    try { onDone(await api.submitSettlement(caseId, { due_on: due || undefined, pay_mode: mode ?? undefined })); showSuccess('Sent for approval'); } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">Submit for approval</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Submit</Btn></>}>
      <div className="space-y-4">
        {err && <Alert message={err} />}
        <p className="text-sm text-fg-muted">Finance approves the settlement. After that it is paid in a payroll run or marked paid off-cycle.</p>
        <SelectField<PayMode> label="Payment" value={mode} onChange={setMode} options={(Object.keys(PAY_MODE_LABEL) as PayMode[]).map((k) => ({ value: k, label: PAY_MODE_LABEL[k] }))} />
        <TextField label="Payment due by" type="date" value={due} onChange={setDue} hint="An alert is raised when it passes unpaid" />
      </div>
    </Dialog>
  );
}

function PaidDialog({ open, caseId, onClose, onDone }: { open: boolean; caseId: number; onClose: () => void; onDone: (s: ExitSettlement) => void }) {
  const [paidOn, setPaidOn] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => { if (open) { setPaidOn(orgToday()); setErr(null); } }, [open]);
  const save = async () => {
    setBusy(true);
    try { onDone(await api.markSettlementPaid(caseId, { paid_on: paidOn || undefined })); showSuccess('Marked as paid'); } catch (e) { setErr(messageOf(e)); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title={<h2 className="text-sm font-bold text-fg sm:text-base">Mark as paid</h2>}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" busy={busy} onClick={save}>Mark paid</Btn></>}>
      <div className="space-y-4">{err && <Alert message={err} />}<TextField label="Paid on" type="date" value={paidOn} onChange={setPaidOn} max={orgToday()} /></div>
    </Dialog>
  );
}

function LinesTable({ lines, editable, onEdit }: { lines: SettlementLine[]; editable: boolean; onEdit: (l: SettlementLine) => void }) {
  const section = (kind: 'earning' | 'deduction', title: string) => {
    const rows = lines.filter((l) => l.kind === kind);
    if (rows.length === 0) return null;
    return (
      <div>
        <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-fg-muted">{title}</h3>
        <ul className="divide-y divide-line rounded-lg border border-line">
          {rows.map((l) => (
            <li key={l.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-fg">{l.label}</p>
                <p className="text-xs text-fg-muted">{[l.source, l.override_reason ? `Overridden: ${l.override_reason}` : null].filter(Boolean).join(' · ')}</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-fg">{kind === 'deduction' ? '-' : ''}{inr(l.amount)}</span>
              {editable && <button type="button" onClick={() => onEdit(l)} aria-label={`Override ${l.label}`} className="shrink-0 rounded-md p-1.5 text-fg-muted hover:bg-bg-subtle hover:text-fg"><Pencil className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      </div>
    );
  };
  return <div className="space-y-4">{section('earning', 'Earnings')}{section('deduction', 'Deductions')}</div>;
}

/** The full and final settlement of a case: calculated lines, overrides with a reason, approval, due date and payment. */
export function SettlementPanel({ caseId, settlement, canSettle, canManage, onChanged, onReview }: {
  caseId: number; settlement: ExitSettlement | null; canSettle: boolean; canManage: boolean; onChanged: () => void; onReview: (requestId: number) => void;
}) {
  const [s, setS] = React.useState<ExitSettlement | null>(settlement);
  React.useEffect(() => setS(settlement), [settlement]);
  const [override, setOverride] = React.useState<SettlementLine | null>(null);
  const [submit, setSubmit] = React.useState(false);
  const [paid, setPaid] = React.useState(false);
  const [busy, setBusy] = React.useState<'compute' | 'doc' | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const compute = async () => {
    setBusy('compute'); setErr(null);
    try { setS(await api.computeSettlement(caseId)); showSuccess('Settlement calculated'); } catch (e) { setErr(messageOf(e)); } finally { setBusy(null); }
  };
  const statement = async () => {
    setBusy('doc'); setErr(null);
    try { await api.generateDocument(caseId, 'fnf_statement'); showSuccess('Statement generated'); onChanged(); } catch (e) { setErr(messageOf(e)); } finally { setBusy(null); }
  };
  const done = (next: ExitSettlement) => { setS(next); setOverride(null); setSubmit(false); setPaid(false); onChanged(); };

  const editable = canSettle && (!s || s.status === 'draft');
  const meta = s ? SETTLEMENT_STATUS_META[s.status] : null;
  const pending = s?.approval && s.approval.status === 'pending' ? s.approval.requestId : null;

  return (
    <div className="space-y-4">
      {err && <Alert message={err} />}
      {!s ? (
        <p className="text-sm text-fg-muted">The settlement has not been calculated yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {meta && <TonePill label={meta.label} tone={meta.tone} />}
            {s.overdue && s.status !== 'paid' && <TonePill label="Payment overdue" tone="danger" />}
          </div>
          {s.lines.length === 0 ? <p className="text-sm text-fg-muted">No lines. Calculate again after clearance is done.</p> : <LinesTable lines={s.lines} editable={editable} onEdit={setOverride} />}
          <dl className="grid gap-x-6 gap-y-3 rounded-lg border border-line bg-bg-subtle/50 p-3 sm:grid-cols-3">
            <Fact label="Total earnings" value={inr(s.total_earnings)} />
            <Fact label="Total deductions" value={inr(s.total_deductions)} />
            <Fact label="Net payable" value={<span className={s.net_payable < 0 ? 'text-[var(--tt-danger)]' : ''}>{inr(s.net_payable)}</span>} />
            <Fact label="Payment" value={s.pay_mode ? PAY_MODE_LABEL[s.pay_mode] : null} />
            <Fact label="Due by" value={s.due_on ? formatDate(s.due_on) : null} />
            <Fact label="Paid on" value={s.paid_on ? formatDate(s.paid_on) : null} />
          </dl>
          {s.net_payable < 0 && <p className="text-sm text-fg-muted">The employee owes the company this amount.</p>}
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {(canSettle || canManage) && (!s || s.status === 'draft') && <Btn variant={s ? 'secondary' : 'primary'} icon={<Calculator className="h-4 w-4" />} busy={busy === 'compute'} onClick={compute}>{s ? 'Recalculate' : 'Calculate settlement'}</Btn>}
        {canSettle && s?.status === 'draft' && s.lines.length > 0 && <Btn variant="primary" onClick={() => setSubmit(true)}>Submit for approval</Btn>}
        {pending && <Btn variant="primary" onClick={() => onReview(pending)}>Review approval</Btn>}
        {canSettle && s?.status === 'approved' && <Btn variant="primary" onClick={() => setPaid(true)}>Mark as paid</Btn>}
        {canManage && s && ['approved', 'paid'].includes(s.status) && <Btn icon={<FilePlus2 className="h-4 w-4" />} busy={busy === 'doc'} onClick={statement}>Generate F&amp;F statement</Btn>}
      </div>
      {s?.status === 'draft' && s.lines.some((l) => l.override_reason) && <p className="text-xs text-fg-muted">Recalculating replaces overridden amounts with the calculated ones.</p>}
      <OverrideDialog caseId={caseId} line={override} onClose={() => setOverride(null)} onDone={done} />
      <SubmitDialog open={submit} caseId={caseId} onClose={() => setSubmit(false)} onDone={done} />
      <PaidDialog open={paid} caseId={caseId} onClose={() => setPaid(false)} onDone={done} />
    </div>
  );
}

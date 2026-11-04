'use client';

import React from 'react';
import { CalendarPlus, IndianRupee, X } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Chip, SelectField, TextField } from '@/components/ui/FormControls';
import { fieldErrorsOf } from '@/lib/api/errors';
import { formatDate } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import { cx } from '@/theme/tokens';
import * as api from '../../api/payrollRuns.api';
import { money } from '../../utils/format';

const btn = 'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-colors sm:text-sm disabled:cursor-not-allowed disabled:opacity-40';
const primary = `${btn} bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]`;
const secondary = `${btn} border border-line bg-surface text-fg hover:bg-bg-subtle`;

const periodLabel = (p: { period_start: string; period_end: string }) =>
  p.period_start.slice(8) === '01' && p.period_end.slice(0, 7) === p.period_start.slice(0, 7)
    ? formatDate(p.period_start, 'medium').replace(/^\d+\s/, '')
    : `${formatDate(p.period_start)} – ${formatDate(p.period_end)}`;
const signedMoney = (v: number) => `${v > 0 ? '+' : '−'}${money(Math.abs(v), true)}`;
const signedDays = (d: number) => `${d > 0 ? '+' : ''}${d} day${Math.abs(d) === 1 ? '' : 's'}`;
const STAGE: Record<api.AdjustablePeriodDto['status'], string> = { draft: 'Draft', finalized: 'Finalized', paid: 'Paid' };

/**
 * Payable-day adjustments of one employee: corrections of +/- days to a pay period with a reason (LOP reversal or
 * extra LOP). A draft period recalculates at once; a finalized or paid one is settled as arrears in the next payroll.
 * Nothing is edited in place: entries are added or cancelled, each with who and when.
 */
export function DayAdjustmentsCard({ employeeId, currentPeriod, canEdit, onChanged }: {
  employeeId: number; currentPeriod: { start: string; end: string } | null; canEdit: boolean; onChanged: () => void;
}) {
  const [data, setData] = React.useState<api.DayAdjustmentListDto | null>(null);
  const [adding, setAdding] = React.useState<'days' | 'amount' | null>(null);
  const [cancelling, setCancelling] = React.useState<api.DayAdjustmentDto | null>(null);

  const load = React.useCallback(() => {
    api.listDayAdjustments(employeeId).then(setData).catch(() => setData(null));
  }, [employeeId]);
  React.useEffect(() => { load(); }, [load]);

  const done = (r: api.DayAdjustmentResultDto) => {
    showSuccess(r.message);
    load();
    onChanged();
  };
  const active = (data?.adjustments || []).filter((a) => a.status === 'active');
  const cancelled = (data?.adjustments || []).filter((a) => a.status === 'cancelled').slice(0, 5);

  return (
    <section className="rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-fg">Day adjustments</h2>
          <p className="text-xs text-fg-muted">Payable days or payable amount, by pay period</p>
        </div>
        {canEdit && data && data.periods.length > 0 && (
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={secondary} onClick={() => setAdding('days')}><CalendarPlus className="h-3.5 w-3.5" /> Adjust days</button>
            <button type="button" className={secondary} onClick={() => setAdding('amount')}><IndianRupee className="h-3.5 w-3.5" /> Adjust amount</button>
          </div>
        )}
      </div>
      <ul className="divide-y divide-line">
        {active.length === 0 && <li className="px-4 py-3 text-xs text-fg-muted">No adjustments.</li>}
        {[...active, ...cancelled].map((a) => (
          <li key={a.id} className={cx('flex items-start justify-between gap-3 px-4 py-2.5', a.status === 'cancelled' && 'opacity-55')}>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">
                <span className="tabular-nums">{(a.kind === 'amount' ? signedMoney(Number(a.amount || 0)) : signedDays(a.days))}</span>
                <span className="font-normal text-fg-muted"> · {periodLabel(a)}</span>
                {a.status === 'cancelled' && <span className="ml-1.5 text-xs font-normal text-fg-muted">(cancelled)</span>}
              </p>
              <p className="truncate text-xs text-fg-muted" title={a.reason}>{a.reason}</p>
              <p className="text-[11px] text-fg-subtle">
                {a.created_by || 'Someone'} · {formatDate(String(a.created_at).slice(0, 10))}
                {a.status === 'cancelled' && a.cancel_reason ? ` · cancelled: ${a.cancel_reason}` : ''}
              </p>
            </div>
            {canEdit && a.status === 'active' && (
              <button type="button" aria-label="Cancel adjustment" onClick={() => setCancelling(a)} className="rounded-md p-1 text-fg-muted hover:bg-bg-subtle hover:text-fg"><X className="h-4 w-4" /></button>
            )}
          </li>
        ))}
      </ul>
      {adding !== null && data && (
        <AddDialog mode={adding} employeeId={employeeId} periods={data.periods} defaultPeriod={currentPeriod} onClose={() => setAdding(null)} onDone={(r) => { setAdding(null); done(r); }} />
      )}
      {cancelling && <CancelDialog adjustment={cancelling} onClose={() => setCancelling(null)} onDone={(r) => { setCancelling(null); done(r); }} />}
    </section>
  );
}

function AddDialog({ mode, employeeId, periods, defaultPeriod, onClose, onDone }: {
  mode: 'days' | 'amount'; employeeId: number; periods: api.AdjustablePeriodDto[]; defaultPeriod: { start: string; end: string } | null; onClose: () => void; onDone: (r: api.DayAdjustmentResultDto) => void;
}) {
  const keyOf = (p: { period_start: string; period_end: string }) => `${p.period_start}|${p.period_end}`;
  const initial = periods.find((p) => defaultPeriod && p.period_start === defaultPeriod.start && p.period_end === defaultPeriod.end) || periods[0];
  const [periodKey, setPeriodKey] = React.useState<string | null>(initial ? keyOf(initial) : null);
  const [direction, setDirection] = React.useState<'add' | 'deduct'>('add');
  const [days, setDays] = React.useState('1');
  const [amountText, setAmountText] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const period = periods.find((p) => keyOf(p) === periodKey) || null;
  const isAmount = mode === 'amount';
  const n = Number(isAmount ? amountText : days);
  const value = direction === 'add' ? n : -n;
  const after = !isAmount && period && period.payable_days !== null && Number.isFinite(n) ? Math.round((period.payable_days + value) * 100) / 100 : null;

  const submit = async () => {
    if (!period) return;
    setBusy(true);
    setErrors({});
    try {
      onDone(await api.addDayAdjustment({ employee_id: employeeId, period_start: period.period_start, period_end: period.period_end, reason: reason.trim(), ...(isAmount ? { kind: 'amount' as const, amount: value } : { days: value }) }));
    } catch (e) {
      const f = fieldErrorsOf(e);
      setErrors({ ...f.fields, form: f.general });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={isAmount ? 'Adjust payable amount' : 'Adjust payable days'}
      footer={<><button type="button" className={secondary} onClick={onClose}>Cancel</button><button type="button" className={primary} disabled={busy || !period || !(n > 0) || reason.trim().length < 3} onClick={submit}>{busy ? 'Saving…' : 'Save adjustment'}</button></>}>
      <div className="space-y-4">
        <SelectField<string> label="Pay period" value={periodKey} onChange={setPeriodKey} error={errors.period_start}
          options={periods.map((p) => ({ value: keyOf(p), label: `${periodLabel(p)} · ${STAGE[p.status]}${p.payable_days !== null ? ` · ${p.payable_days} payable` : ''}` }))} />
        {period && period.status !== 'draft' && (
          <p className="rounded-lg border border-line bg-bg-subtle px-3 py-2 text-xs text-fg-muted">This period is {STAGE[period.status].toLowerCase()}. Its payslip stays as it is; the difference is paid or recovered {isAmount ? '' : 'as arrears '}in the next payroll.</p>
        )}
        <div className="flex gap-2">
          <Chip active={direction === 'add'} onClick={() => setDirection('add')}>{isAmount ? 'Add to pay' : 'Add payable days (LOP reversal)'}</Chip>
          <Chip active={direction === 'deduct'} onClick={() => setDirection('deduct')}>{isAmount ? 'Take off pay' : 'Deduct days (extra LOP)'}</Chip>
        </div>
        {isAmount ? (
          <TextField label="Amount (₹)" type="number" min={0} step={0.01} value={amountText} onChange={setAmountText} error={errors.amount}
            hint="Shown on the payslip as its own line. Added amounts are taxable. A finalized or paid period is settled in the next payroll." />
        ) : (
          <TextField label="Days" type="number" min={0.5} step={0.5} value={days} onChange={setDays} error={errors.days}
            hint={after !== null && period?.period_days ? `Payable days ${period.payable_days} → ${after} of ${period.period_days}` : 'Whole or half days'} />
        )}
        <TextField label="Reason" value={reason} onChange={setReason} error={errors.reason} placeholder="e.g. Leave approved after payroll, wrong absent on 12 Oct" />
        {errors.form && <p className="text-xs text-[var(--tt-danger)]">{errors.form}</p>}
      </div>
    </Dialog>
  );
}

function CancelDialog({ adjustment, onClose, onDone }: { adjustment: api.DayAdjustmentDto; onClose: () => void; onDone: (r: api.DayAdjustmentResultDto) => void }) {
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      onDone(await api.cancelDayAdjustment(adjustment.id, reason.trim()));
    } catch (e) {
      const f = fieldErrorsOf(e);
      setError(f.fields.reason || f.general);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title="Cancel adjustment"
      footer={<><button type="button" className={secondary} onClick={onClose}>Keep it</button><button type="button" className={primary} disabled={busy || reason.trim().length < 3} onClick={submit}>{busy ? 'Cancelling…' : 'Cancel adjustment'}</button></>}>
      <div className="space-y-3">
        <p className="text-sm text-fg-muted">{adjustment.kind === 'amount' ? signedMoney(Number(adjustment.amount || 0)) : signedDays(adjustment.days)} for {periodLabel(adjustment)}: “{adjustment.reason}”. It stays in the history as cancelled.</p>
        <TextField label="Why" value={reason} onChange={setReason} error={error || undefined} />
      </div>
    </Dialog>
  );
}

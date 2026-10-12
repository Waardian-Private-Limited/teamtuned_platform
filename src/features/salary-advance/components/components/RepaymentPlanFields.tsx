'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FieldLabel, FieldMessage, OptionCard, TextField } from '@/components/ui/FormControls';
import type { DisbursementMode, MergeableAdvance, PlanContext, PlanInput, SchedulePreview } from '../../types/salaryAdvance.model';
import { money, monthLabel, parseAmount } from '../../utils/format';
import { InstallmentStepper } from './InstallmentStepper';
import { SchedulePreviewTable } from './SchedulePreviewTable';

interface RepaymentPlanFieldsProps {
  context: PlanContext;
  value: PlanInput;
  onChange: (next: PlanInput) => void;
  loading?: boolean;
  /** Approved advances have a payout mode already chosen; it can still change until paid out. */
  showPayout?: boolean;
}

/**
 * The repayment plan an approver or HR decides: amount, one go or instalments, the first deduction
 * month, how it is paid out, and whether open advances are merged into it or kept separate.
 */
export function RepaymentPlanFields({ context, value, onChange, loading = false, showPayout = true }: RepaymentPlanFieldsProps) {
  const errors = context.errors;
  const [amountText, setAmountText] = React.useState(String(value.approvedAmount || ''));
  const set = (patch: Partial<PlanInput>) => onChange({ ...value, ...patch });
  const oneGo = value.installments === 1;
  const earliest = value.disbursementMode === 'payroll' ? context.earliestStart.payroll : context.earliestStart.manual;
  const merged = new Set(value.mergeAdvanceIds);

  const toggleMerge = (id: number) => {
    const next = new Set(merged);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ mergeAdvanceIds: [...next] });
  };

  const preview: SchedulePreview = {
    schedule: context.plan.schedule,
    totalRepayable: context.plan.totalRepayable,
    interestAmount: context.plan.interestAmount,
    installmentAmount: context.plan.installmentAmount,
    startMonth: context.plan.startMonth,
    errors: [],
    fieldErrors: {},
  };

  return (
    <div className="space-y-4">
      <TextField
        label="Amount to approve"
        required
        inputMode="decimal"
        prefix="₹"
        value={amountText}
        onChange={(v) => {
          const clean = parseAmount(v);
          setAmountText(clean);
          const n = Number(clean);
          if (Number.isFinite(n) && n > 0) set({ approvedAmount: n });
        }}
        error={errors.approved_amount}
        hint={`Asked for ${money(context.requestedAmount)}`}
      />

      <div>
        <FieldLabel label="Repayment" required />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <OptionCard selected={oneGo} onClick={() => set({ installments: 1 })} title="In one go" description="The full amount from one payroll" />
          <OptionCard selected={!oneGo} onClick={() => set({ installments: Math.max(2, value.installments) })} title="In instalments" description="Spread over several months" />
        </div>
        {!oneGo && (
          <div className="mt-3">
            <InstallmentStepper
              value={value.installments}
              min={2}
              max={context.maxInstallments}
              onChange={(n) => set({ installments: n })}
              error={errors.installments}
              hint="Change it as you decide"
            />
          </div>
        )}
        {oneGo && <FieldMessage error={errors.installments} />}
      </div>

      <TextField
        label="First deduction month"
        type="month"
        min={earliest}
        value={value.startMonth ?? ''}
        onChange={(v) => set({ startMonth: v || null })}
        error={errors.start_month}
        hint={
          value.startMonth
            ? value.startMonth === context.currentMonth
              ? 'Recovered from this month’s payroll if it is not finalized yet.'
              : undefined
            : `Empty: the payroll after it is paid out (earliest ${monthLabel(earliest, 'short')}).`
        }
      />

      {showPayout && (
        <div>
          <FieldLabel label="Paid out" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(['manual', 'payroll'] as DisbursementMode[]).map((m) => (
              <OptionCard
                key={m}
                selected={value.disbursementMode === m}
                onClick={() => set({ disbursementMode: m })}
                title={m === 'manual' ? 'By Accounts' : 'With payroll'}
                description={m === 'manual' ? 'Bank transfer, recorded here' : 'Added as an earning; recovery starts the month after'}
              />
            ))}
          </div>
          <FieldMessage error={errors.disbursement_mode} />
        </div>
      )}

      {context.mergeable.length > 0 && (
        <MergeChooser items={context.mergeable} selected={merged} onToggle={toggleMerge} error={errors.merge_advance_ids} />
      )}

      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-bg-subtle/50 p-3 text-xs sm:grid-cols-3 sm:text-sm">
        <Figure label={oneGo ? 'Recovered' : 'Each instalment'} value={money(context.plan.installmentAmount)} />
        <Figure label="Starts" value={monthLabel(context.plan.startMonth, 'short')} />
        <Figure
          label="Total a month"
          value={money(context.plan.monthlyDeduction)}
          hint={context.mergeable.length > merged.size ? 'Includes the advances kept separate' : undefined}
        />
      </div>

      <SchedulePreviewTable
        preview={preview}
        loading={loading}
        note={context.plan.mergedOutstanding > 0 ? `Includes ${money(context.plan.mergedOutstanding)} left on merged advances, as it stands today.` : 'Months assume it is paid out this month.'}
      />
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className="truncate font-semibold tabular-nums text-fg">{value}</p>
      {hint && <p className="text-[10px] text-fg-subtle">{hint}</p>}
    </div>
  );
}

export function MergeChooser({ items, selected, onToggle, error }: { items: MergeableAdvance[]; selected: Set<number>; onToggle: (id: number) => void; error?: string }) {
  return (
    <div>
      <FieldLabel label="Other advances being repaid" />
      <p className="mb-2 text-[11px] text-fg-muted sm:text-xs">
        Tick one to merge it: what is left is added to this advance and recovered on one schedule. Leave unticked to keep it separate on its own schedule.
      </p>
      <div className="space-y-1.5">
        {items.map((a) => {
          const on = selected.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(a.id)}
              className={cx(
                'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                on ? 'border-fg bg-bg-subtle' : 'border-line bg-surface hover:border-line-strong'
              )}
            >
              <span className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-fg bg-fg text-[var(--tt-on-primary)]' : 'border-line-strong')}>
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-fg sm:text-sm">{a.typeName} #{a.id}</span>
                <span className="block text-[11px] text-fg-muted">
                  {money(a.outstanding)} left · {money(a.installmentAmount)} a month
                </span>
              </span>
              <span className="text-[11px] font-semibold text-fg-muted">{on ? 'Merge' : 'Separate'}</span>
            </button>
          );
        })}
      </div>
      <FieldMessage error={error} />
    </div>
  );
}

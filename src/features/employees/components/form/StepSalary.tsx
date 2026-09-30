'use client';

import React from 'react';
import { Check, Lock } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { PAYMENT_MODES } from '../../constants/employees.constants';
import { formatInr, type ComponentInput, type SalaryPlan } from '../../utils/salary';
import { Chip, FieldLabel, FieldMessage, InfoRow, Section, shellClass } from '@/components/ui/FormControls';
import type { EmployeeFormController } from './types';

function numberValue(v: string) {
  const n = Number(v.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function MoneyInput({ label, value, onChange, hint, error }: { label: string; value: number; onChange: (n: number) => void; hint?: string; error?: string }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className={shellClass(Boolean(error))}>
        <span className="text-xs font-semibold text-fg-muted">₹</span>
        <input
          inputMode="numeric"
          value={value ? Math.round(value).toLocaleString('en-IN') : ''}
          onChange={(e) => onChange(numberValue(e.target.value))}
          placeholder="0"
          className="w-full min-w-0 border-none bg-transparent text-base font-semibold text-fg outline-none placeholder:text-fg-subtle focus:ring-0"
        />
      </div>
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

function ComponentRow({ line, onChange }: { line: SalaryPlan['lines'][number]; onChange: (input: ComponentInput) => void }) {
  const editable = !line.balancing;
  const isPercent = line.input.mode === 'percent';
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[1fr_220px_120px]">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-fg sm:text-sm">{line.name}</p>
        <p className="text-[11px] text-fg-muted">{line.balancing ? 'Balance of gross' : line.configured ? `% ${line.basisLabel}` : isPercent ? '% of gross' : 'Fixed amount'}</p>
      </div>
      <div className="col-span-2 row-start-2 flex items-center gap-2 sm:col-span-1 sm:row-start-auto">
        {editable ? (
          <>
            {!line.configured && (
              <div className="inline-flex h-9 shrink-0 rounded-lg border border-line bg-bg-subtle p-0.5">
                {(['percent', 'amount'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ mode: m, value: m === line.input.mode ? line.input.value : 0 })}
                    className={cx('rounded-md px-2.5 text-xs font-semibold transition-colors', line.input.mode === m ? 'bg-surface text-fg shadow-xs' : 'text-fg-muted')}
                  >
                    {m === 'percent' ? '%' : '₹'}
                  </button>
                ))}
              </div>
            )}
            <div className={cx(shellClass(false), 'h-9')}>
              <input
                inputMode="decimal"
                value={line.input.value ? String(line.input.value) : ''}
                onChange={(e) => onChange({ mode: line.input.mode, value: numberValue(e.target.value) })}
                placeholder="0"
                className="w-full min-w-0 border-none bg-transparent text-sm text-fg outline-none focus:ring-0"
              />
              <span className="text-[11px] text-fg-muted">{isPercent ? '%' : '₹'}</span>
            </div>
          </>
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-line px-3 text-[11px] font-semibold text-fg-muted">
            <Lock className="h-3 w-3" />
            Auto
          </span>
        )}
      </div>
      <p className={cx('text-right text-sm font-bold', line.amount < 0 ? 'text-[var(--tt-danger)]' : 'text-fg')}>{formatInr(line.amount)}</p>
    </div>
  );
}

export function StepSalary({ c }: { c: EmployeeFormController }) {
  const { form, set, errors, plan, options, siteState } = c;
  const hasComponents = (options?.salary_components.length || 0) > 0;
  const selectedDebits = plan.debits.filter((d) => d.selected);

  const setInput = (componentId: number, input: ComponentInput) => {
    set('componentInputs', { ...form.componentInputs, [componentId]: input });
  };

  const toggleDebit = (id: number, selected: boolean) => {
    set('debitOverrides', { ...form.debitOverrides, [id]: selected });
  };

  return (
    <div className="space-y-4">
      <Section title="Compensation" description="Enter CTC or monthly gross. Monthly gross is CTC / 12, before any deduction.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyInput
            label="CTC (per year)"
            value={form.driver.source === 'ctc' ? form.driver.value : plan.ctcAnnual}
            onChange={(n) => set('driver', { source: 'ctc', value: n })}
          />
          <MoneyInput
            label="Monthly gross"
            value={form.driver.source === 'gross' ? form.driver.value : plan.gross}
            onChange={(n) => set('driver', { source: 'gross', value: n })}
            hint="Before deductions"
          />
        </div>
        {plan.gross > 0 && (
          <div className="mt-4 rounded-lg border border-line bg-bg-subtle/50 px-4 py-2">
            <InfoRow label="Monthly gross" value={formatInr(plan.gross)} />
            {selectedDebits.map((d) => (
              <React.Fragment key={d.rule.id}>
                <InfoRow
                  label={d.employerInCtc ? `${d.rule.name} (employee)` : d.rule.name}
                  value={d.employee === null ? 'Calculated in payroll' : `− ${formatInr(d.employee)}`}
                />
                {d.employerInCtc && d.employer ? <InfoRow label={`${d.rule.name} (employer, in CTC)`} value={`− ${formatInr(d.employer)}`} /> : null}
              </React.Fragment>
            ))}
            <InfoRow label="Gross after deductions" value={formatInr(plan.takeHome)} />
            {plan.employerOnTop > 0 && <InfoRow label="Employer PF/ESI on top of CTC" value={`+ ${formatInr(plan.employerOnTop)}`} />}
          </div>
        )}
      </Section>

      <Section title="Salary structure" description={hasComponents ? 'Split of monthly gross (CTC / 12). The balancing component absorbs the rest.' : undefined}>
        {!hasComponents ? (
          <p className="text-xs text-fg-muted sm:text-sm">No salary components are set up for this sub-organization. Add them in Payroll Setup.</p>
        ) : (
          <div className="divide-y divide-line/60">
            {plan.lines.map((line) => (
              <ComponentRow key={line.componentId} line={line} onChange={(input) => setInput(line.componentId, input)} />
            ))}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-xs font-bold uppercase tracking-wide text-fg-muted">Monthly gross</span>
              <span className="text-sm font-bold text-fg">{formatInr(plan.gross)}</span>
            </div>
          </div>
        )}
        <FieldMessage error={errors.salary_breakdown} />
      </Section>

      <Section
        title="Deductions"
        description={siteState ? `Auto-selected by wage and primary site state (${siteState}). Change if needed.` : 'Auto-selected by wage. Change if needed.'}
      >
        {plan.debits.length === 0 ? (
          <p className="text-xs text-fg-muted sm:text-sm">No debit rules for this sub-organization.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {plan.debits.map((d) => (
              <li key={d.rule.id}>
                <button
                  type="button"
                  disabled={!d.eligible}
                  onClick={() => toggleDebit(d.rule.id, !d.selected)}
                  aria-pressed={d.selected}
                  className={cx(
                    'flex w-full items-start gap-2.5 rounded-lg border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50',
                    d.selected ? 'border-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]' : 'border-line hover:bg-bg-subtle'
                  )}
                >
                  <span className={cx('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border', d.selected ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]' : 'border-line-strong')}>
                    {d.selected && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-fg sm:text-sm">
                      {d.rule.name}
                      {d.rule.is_statutory ? <span className="rounded border border-line px-1 text-[9px] font-bold uppercase text-fg-muted">Statutory</span> : null}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-fg-muted">{d.reason}</span>
                    {d.selected && d.employer ? (
                      <span className="mt-0.5 block text-[11px] text-fg-muted">
                        Employer {formatInr(d.employer)} · {d.employerInCtc ? 'part of CTC, deducted from gross' : 'paid on top of CTC'}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Payment mode">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_MODES.map((m) => (
            <Chip key={m.value} active={form.paymentMode === m.value} onClick={() => set('paymentMode', m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </Section>
    </div>
  );
}

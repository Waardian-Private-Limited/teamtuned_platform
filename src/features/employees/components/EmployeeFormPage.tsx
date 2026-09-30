'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { FORM_STEPS } from '../constants/employees.constants';
import { useEmployeeForm } from '../hooks/useEmployeeForm';
import { useEmployeeRoutes } from '../hooks/useEmployeeRoutes';
import { StepBasic } from './form/StepBasic';
import { StepJob } from './form/StepJob';
import { StepSchedule } from './form/StepSchedule';
import { StepSalary } from './form/StepSalary';
import { StepBank } from './form/StepBank';

function Stepper({ step, maxStep, onGo }: { step: number; maxStep: number; onGo: (i: number) => void }) {
  return (
    <ol className="hidden gap-1 lg:flex lg:flex-col">
      {FORM_STEPS.map((s, i) => {
        const done = i < step || (i <= maxStep && i !== step);
        const active = i === step;
        return (
          <li key={s.key}>
            <button
              type="button"
              disabled={i > maxStep}
              onClick={() => onGo(i)}
              className={cx(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed',
                active ? 'bg-bg-subtle' : 'hover:bg-bg-subtle/60'
              )}
            >
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                  active
                    ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'
                    : done
                      ? 'border-[var(--tt-primary)] text-fg'
                      : 'border-line text-fg-subtle'
                )}
              >
                {done && !active ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={cx('block text-sm font-semibold', active || done ? 'text-fg' : 'text-fg-subtle')}>{s.label}</span>
                <span className="block truncate text-[11px] text-fg-muted">{s.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function MobileProgress({ step }: { step: number }) {
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-fg">{FORM_STEPS[step].label}</span>
        <span className="text-fg-muted">Step {step + 1} of {FORM_STEPS.length}</span>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {FORM_STEPS.map((s, i) => (
          <span key={s.key} className={cx('h-1 rounded-full transition-colors', i <= step ? 'bg-[var(--tt-primary)]' : 'bg-line')} />
        ))}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((k) => (
        <div key={k} className="rounded-xl border border-line bg-surface p-5">
          <div className="h-4 w-40 animate-pulse rounded bg-bg-subtle" />
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-bg-subtle" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmployeeFormPage({ employeeId }: { employeeId: number | null }) {
  const c = useEmployeeForm(employeeId);
  const routes = useEmployeeRoutes();
  const last = c.step === FORM_STEPS.length - 1;
  const title = c.isEdit ? 'Edit employee' : 'Add employee';
  const name = [c.form.firstName, c.form.lastName].filter(Boolean).join(' ');

  const onPrimary = () => (last ? c.submit() : c.next());

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 sm:p-3.5 2xl:p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link href={routes.list} aria-label="Back to employees" className="rounded-lg p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-lg 2xl:text-xl">{name || title}</h1>
            <p className="truncate text-[11px] text-fg-muted sm:text-xs">
              {name ? title : 'Fill the essentials. The employee completes the rest during onboarding.'}
              {c.form.employeeCode ? ` · ${c.form.employeeCode}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <aside className="shrink-0 rounded-xl border border-line bg-surface p-3 lg:w-60 2xl:w-72">
          <Stepper step={c.step} maxStep={c.maxStep} onGo={c.goTo} />
          <MobileProgress step={c.step} />
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-bg-subtle/40">
          <form
            noValidate
            className="min-h-0 flex-1 overflow-y-auto p-3 tt-scroll-hidden sm:p-4 2xl:p-6"
            onSubmit={(e) => {
              e.preventDefault();
              onPrimary();
            }}
          >
            {c.loadError ? (
              <p className="rounded-xl border border-line bg-surface p-5 text-sm text-[var(--tt-danger)]">{c.loadError}</p>
            ) : c.loading ? (
              <FormSkeleton />
            ) : (
              <div className={cx('mx-auto max-w-4xl transition-opacity duration-150', c.optionsLoading && 'opacity-60')}>
                {c.step === 0 && <StepBasic c={c} />}
                {c.step === 1 && <StepJob c={c} employeeId={employeeId} />}
                {c.step === 2 && <StepSchedule c={c} />}
                {c.step === 3 && <StepSalary c={c} />}
                {c.step === 4 && <StepBank c={c} />}
              </div>
            )}
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>

          <div className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2.5 sm:px-4">
            <button
              type="button"
              onClick={c.back}
              disabled={c.step === 0 || c.saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40 sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div className="flex items-center gap-2">
              {c.isEdit && !last && (
                <button
                  type="button"
                  onClick={c.submit}
                  disabled={c.saving || c.loading}
                  className="hidden h-9 items-center justify-center rounded-lg border border-line bg-surface px-3.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:opacity-40 sm:inline-flex sm:text-sm"
                >
                  Save changes
                </button>
              )}
              <button
                type="button"
                onClick={onPrimary}
                disabled={c.saving || c.loading || Boolean(c.loadError)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
              >
                {c.saving ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : last ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                <span>{last ? (c.isEdit ? 'Save changes' : 'Add employee') : 'Continue'}</span>
                {!last && !c.saving && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

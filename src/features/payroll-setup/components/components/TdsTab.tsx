'use client';

import React from 'react';
import { AlertTriangle, ArrowRight, Download, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { cx, text } from '@/theme/tokens';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { showError } from '@/lib/toast';
import * as api from '../../api/payrollSetup.api';
import { useTdsAdmin } from '../../hooks/useTdsAdmin';
import { useTdsReadiness } from '../../hooks/useTdsReadiness';
import type { TdsChallan, TdsSettings } from '../../types/payroll-setup.model';
import { currentFinancialYear } from '../../constants/payroll-setup.constants';
import { formatCurrency, formatDate, validateChallan, validateTdsSettings } from '../../utils/validators';
import { FlowStep, type StepStatus } from '../tds/FlowStep';
import { TaxRatesStep } from '../tds/TaxRatesStep';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const errorInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--tt-danger)] bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';
const fieldErrorClass = 'mt-1 text-[11px] font-medium text-[var(--tt-danger)]';
const primaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40';

const EMPTY_SETTINGS: TdsSettings = {
  employerTan: '',
  employerPan: '',
  signatoryName: '',
  signatoryDesignation: '',
  place: '',
};

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Apr–Jun)' },
  { value: 'Q2', label: 'Q2 (Jul–Sep)' },
  { value: 'Q3', label: 'Q3 (Oct–Dec)' },
  { value: 'Q4', label: 'Q4 (Jan–Mar)' },
] as const;

function fyOptions(): string[] {
  const current = currentFinancialYear();
  const start = Number(current.split('-')[0]);
  return [0, -1, -2].map((delta) => `${start + delta}-${String((start + delta + 1) % 100).padStart(2, '0')}`);
}

export function TdsTab({
  canEdit,
  onNavigateToRules,
}: {
  canEdit: boolean;
  onNavigateToRules?: () => void;
}) {
  const tds = useTdsAdmin();
  const readinessState = useTdsReadiness(tds.financialYear);
  const readiness = readinessState.readiness;

  const [editChallan, setEditChallan] = React.useState<TdsChallan | null>(null);
  const [challanOpen, setChallanOpen] = React.useState(false);
  const [settingsErrors, setSettingsErrors] = React.useState<Record<string, string>>({});
  const [showPrimer, setShowPrimer] = React.useState(false);

  // The employer may not have saved settings yet, and the load can fail. Either way the
  // form stays editable instead of silently swallowing every keystroke.
  const settings = tds.settings ?? EMPTY_SETTINGS;
  const patchSettings = (patch: Partial<TdsSettings>) =>
    tds.setSettings((prev) => ({ ...(prev ?? EMPTY_SETTINGS), ...patch }));

  const submitSettings = async () => {
    const errors = validateTdsSettings(settings);
    setSettingsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const ok = await tds.saveSettings({
      ...settings,
      employerTan: settings.employerTan.trim().toUpperCase(),
      employerPan: settings.employerPan.trim().toUpperCase(),
    });
    // Completing a step changes the badges on the others.
    if (ok) readinessState.reload();
  };

  const totalDeposited = tds.challans.reduce((sum, challan) => sum + Number(challan.amount || 0), 0);

  const [form16EmployeeId, setForm16EmployeeId] = React.useState<number | null>(null);
  const [form16EmployeeQuery, setForm16EmployeeQuery] = React.useState('');
  const [form16Candidates, setForm16Candidates] = React.useState<Array<{ id: number; name: string; designation: string | null }>>([]);
  const [form16Searching, setForm16Searching] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    if (!form16EmployeeQuery.trim()) {
      setForm16Candidates([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setForm16Searching(true);
      try {
        const dto = await api.searchEmployees(form16EmployeeQuery);
        setForm16Candidates(dto.employees || []);
      } catch {
        setForm16Candidates([]);
      } finally {
        setForm16Searching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [form16EmployeeQuery]);

  const downloadForm16 = async () => {
    if (!form16EmployeeId) return;
    setDownloading(true);
    try {
      const { blob } = await api.downloadForm16(form16EmployeeId, tds.financialYear);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form16_${tds.financialYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to generate Form 16');
    } finally {
      setDownloading(false);
    }
  };

  if (tds.isLoading || readinessState.isLoading) {
    return (
      <div className="animate-pulse space-y-3 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-bg-subtle" />
        ))}
      </div>
    );
  }

  // Each step reports one of three states so the sequence reads at a glance.
  const identityStatus: StepStatus = readiness?.employerIdentity.complete
    ? 'done'
    : settings.employerTan || settings.signatoryName ? 'attention' : 'pending';
  const ratesStatus: StepStatus = readiness?.taxRates.configured ? 'done' : 'attention';
  const ruleStatus: StepStatus = !readiness?.deductionRule.exists
    ? 'pending'
    : readiness.deductionRule.active && readiness.deductionRule.assignedEmployees > 0
      ? 'done'
      : 'attention';
  const profilesStatus: StepStatus = !readiness?.deductionRule.active
    ? 'pending'
    : readiness.taxProfiles.missing === 0 && readiness.taxProfiles.assigned > 0
      ? 'done'
      : 'attention';
  const challanStatus: StepStatus = (readiness?.challans.count ?? 0) > 0 ? 'done' : 'pending';
  const form16Status: StepStatus = readiness?.form16.ready ? 'done' : 'pending';

  const completed = [identityStatus, ratesStatus, ruleStatus, profilesStatus, challanStatus]
    .filter((s) => s === 'done').length;

  return (
    <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto tt-scroll-hidden pb-2">
      {(tds.error || readinessState.error) && (
        <Alert message={tds.error || readinessState.error} tone="error" />
      )}

      {/* Orientation: where the org is, and what TDS actually is. */}
      <div className="rounded-xl border border-line bg-surface p-3.5 shadow-xs sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-fg sm:text-base">TDS setup — FY {tds.financialYear}</h2>
            <p className={cx(text.caption, 'mt-0.5')}>{completed} of 5 setup steps complete</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={tds.financialYear}
              onChange={(e) => tds.setFinancialYear(e.target.value)}
              className="h-9 rounded-lg border border-line bg-surface px-2.5 text-xs text-fg outline-none focus:border-[var(--tt-primary)]"
            >
              {fyOptions().map((fy) => (
                <option key={fy} value={fy}>FY {fy}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowPrimer((v) => !v)}
              className="inline-flex h-9 items-center rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
            >
              {showPrimer ? 'Hide' : 'How TDS works'}
            </button>
          </div>
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-[var(--tt-primary)] transition-all"
            style={{ width: `${(completed / 5) * 100}%` }}
          />
        </div>

        {showPrimer && (
          <div className="mt-3 space-y-1.5 border-t border-line pt-3 text-[11px] leading-relaxed text-fg-muted sm:text-xs">
            <p>
              <span className="font-semibold text-fg">TDS is income tax you withhold from salary</span> and pay to the
              government on the employee&apos;s behalf, rather than them paying it themselves at year end.
            </p>
            <p>
              You identify yourself as the deductor (step 1), the year&apos;s tax rates must be loaded (step 2), you
              create a TDS deduction rule and assign it to employees (step 3), and each employee tells you their tax
              regime and investment declarations (step 4). Payroll then deducts the right amount every month on its own.
            </p>
            <p>
              Every quarter you deposit what you withheld and record the challan (step 5). After the year ends you issue
              each employee a Form 16 — their proof that the tax was deducted and paid (step 6).
            </p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- 1 */}
      <FlowStep
        index={1}
        title="Employer TDS identity"
        intent="Your TAN is the tax ID the Income Tax Department issues to an employer who deducts TDS. It and the authorised signatory print on every Form 16 — without them no certificate can be issued."
        status={identityStatus}
        summary={settings.employerTan ? `TAN ${settings.employerTan}` : undefined}
      >
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          noValidate
          onSubmit={(e) => { e.preventDefault(); submitSettings(); }}
        >
          <div>
            <label className={labelClass}>
              Employer TAN <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <input
              value={settings.employerTan}
              onChange={(e) => patchSettings({ employerTan: e.target.value.toUpperCase() })}
              placeholder="MUMT12345E"
              maxLength={10}
              className={settingsErrors.employerTan ? errorInputClass : inputClass}
            />
            {settingsErrors.employerTan
              ? <p className={fieldErrorClass}>{settingsErrors.employerTan}</p>
              : <p className="mt-1 text-[11px] text-fg-muted">4 letters, 5 digits, 1 letter.</p>}
          </div>
          <div>
            <label className={labelClass}>Employer PAN</label>
            <input
              value={settings.employerPan}
              onChange={(e) => patchSettings({ employerPan: e.target.value.toUpperCase() })}
              placeholder="AAACA1234Z"
              maxLength={10}
              className={settingsErrors.employerPan ? errorInputClass : inputClass}
            />
            {settingsErrors.employerPan && <p className={fieldErrorClass}>{settingsErrors.employerPan}</p>}
          </div>
          <div>
            <label className={labelClass}>
              Signatory name <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <input
              value={settings.signatoryName}
              onChange={(e) => patchSettings({ signatoryName: e.target.value })}
              placeholder="Authorized signatory"
              maxLength={150}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-fg-muted">The person who certifies the Form 16.</p>
          </div>
          <div>
            <label className={labelClass}>Designation</label>
            <input
              value={settings.signatoryDesignation}
              onChange={(e) => patchSettings({ signatoryDesignation: e.target.value })}
              placeholder="Finance Manager"
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Place</label>
            <input
              value={settings.place}
              onChange={(e) => patchSettings({ place: e.target.value })}
              placeholder="Mumbai"
              maxLength={100}
              className={inputClass}
            />
          </div>
          {canEdit && (
            <div className="sm:col-span-2">
              <button type="submit" disabled={tds.isSaving} className={primaryButton}>
                {tds.isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                <span>Save employer details</span>
              </button>
            </div>
          )}
        </form>
      </FlowStep>

      {/* ---------------------------------------------------------------- 2 */}
      <FlowStep
        index={2}
        title={`Tax rates for FY ${tds.financialYear}`}
        intent="Slabs, the 87A rebate and surcharge bands change with each Budget, so every financial year is loaded once. Payroll refuses to guess: without these, a TDS run stops with an error rather than using last year's law."
        status={ratesStatus}
        summary={readiness?.taxRates.configured ? 'Rates loaded' : 'Not configured'}
      >
        <TaxRatesStep
          financialYear={tds.financialYear}
          configuredYears={readiness?.taxRates.configuredYears ?? []}
          onChanged={readinessState.reload}
        />
      </FlowStep>

      {/* ---------------------------------------------------------------- 3 */}
      <FlowStep
        index={3}
        title="TDS deduction rule"
        intent="A deduction rule of type TDS is what actually takes tax off a payslip. Create it once, then assign it to every employee whose salary is taxable."
        status={ruleStatus}
        summary={
          readiness?.deductionRule.active
            ? `${readiness.deductionRule.ruleName} · ${readiness.deductionRule.assignedEmployees} assigned`
            : undefined
        }
      >
        <div className="space-y-2.5">
          {!readiness?.deductionRule.exists ? (
            <p className="text-xs leading-relaxed text-fg-muted">
              No TDS rule exists yet. Create one in Deduction Rules — choose the <strong>TDS (Income Tax)</strong>
              {' '}category. It needs no amount: the figure is computed per employee from their regime, projected income
              and declarations.
            </p>
          ) : !readiness.deductionRule.active ? (
            <p className="text-xs leading-relaxed text-[var(--tt-danger)]">
              A TDS rule exists but is inactive, so no tax is being deducted. Activate it in Deduction Rules.
            </p>
          ) : readiness.deductionRule.assignedEmployees === 0 ? (
            <p className="text-xs leading-relaxed text-[var(--tt-danger)]">
              <strong>{readiness.deductionRule.ruleName}</strong> is active but assigned to nobody, so no tax is being
              deducted. Assign it to the employees whose salary is taxable.
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-fg-muted">
              <strong>{readiness.deductionRule.ruleName}</strong> is active and assigned to{' '}
              {readiness.deductionRule.assignedEmployees} employee
              {readiness.deductionRule.assignedEmployees === 1 ? '' : 's'}.
            </p>
          )}

          {onNavigateToRules && (
            <button
              type="button"
              onClick={onNavigateToRules}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
            >
              <span>Go to Deduction Rules</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </FlowStep>

      {/* ---------------------------------------------------------------- 4 */}
      <FlowStep
        index={4}
        title="Employee tax profiles"
        intent="Each employee picks the old or new tax regime and declares investments like 80C or rent. Anyone without a profile is taxed under the new regime with no declarations, which usually over-deducts."
        status={profilesStatus}
        summary={
          readiness?.deductionRule.active
            ? `${readiness.taxProfiles.withProfile} of ${readiness.taxProfiles.assigned} set`
            : undefined
        }
      >
        <div className="space-y-2.5">
          {!readiness?.deductionRule.active ? (
            <p className="text-xs leading-relaxed text-fg-muted">
              Complete step 3 first — tax profiles apply to the employees assigned the TDS rule.
            </p>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-fg-muted">
                <strong>{readiness.taxProfiles.withProfile}</strong> of {readiness.taxProfiles.assigned} assigned
                employees have a profile for FY {tds.financialYear}.
                {readiness.taxProfiles.missing > 0 && (
                  <>
                    {' '}
                    <span className="font-semibold text-[var(--tt-danger)]">
                      {readiness.taxProfiles.missing} still missing.
                    </span>
                  </>
                )}
              </p>
              <p className="text-[11px] leading-relaxed text-fg-muted">
                Open the TDS rule&apos;s assignments in Deduction Rules and set each employee&apos;s tax profile from
                there. The dialog compares both regimes so you can see which costs them less.
              </p>
            </>
          )}

          {onNavigateToRules && readiness?.deductionRule.active && (
            <button
              type="button"
              onClick={onNavigateToRules}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
            >
              <span>Open assignments</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </FlowStep>

      {/* ---------------------------------------------------------------- 5 */}
      <FlowStep
        index={5}
        title="Quarterly deposits"
        intent="Tax you withhold must be paid to the Income Tax Department each quarter. Record the challan you get back — it becomes Part A of every Form 16, the employee's proof the money reached the government."
        status={challanStatus}
        summary={
          (readiness?.challans.count ?? 0) > 0
            ? `${readiness?.challans.count} challan(s) · ${formatCurrency(totalDeposited)}`
            : undefined
        }
      >
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-fg-muted">
              Deposited in FY {tds.financialYear}: <span className="font-semibold text-fg">{formatCurrency(totalDeposited)}</span>
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={() => { setEditChallan(null); setChallanOpen(true); }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Challan</span>
              </button>
            )}
          </div>

          {tds.challans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line p-5 text-center">
              <AlertTriangle className="mx-auto h-5 w-5 text-fg-subtle" />
              <p className={cx(text.caption, 'mt-2')}>
                No challans recorded for FY {tds.financialYear}. Form 16 cannot be issued until at least one deposit is
                recorded.
              </p>
            </div>
          ) : (
            QUARTERS.filter((q) => tds.challans.some((c) => c.quarter === q.value)).map((quarter) => {
              const rows = tds.challans.filter((c) => c.quarter === quarter.value);
              const subtotal = rows.reduce((sum, c) => sum + Number(c.amount || 0), 0);
              return (
                <div key={quarter.value} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 px-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      {quarter.label}
                    </span>
                    <span className="text-[11px] font-semibold tabular-nums text-fg">{formatCurrency(subtotal)}</span>
                  </div>
                  {rows.map((challan) => (
                    <div key={challan.id} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-fg sm:text-sm">{formatCurrency(challan.amount)}</div>
                        <div className={cx(text.caption, 'text-[11px]')}>
                          {challan.challanSerialNo ? `Serial ${challan.challanSerialNo}` : ''}
                          {challan.bsrCode ? `${challan.challanSerialNo ? ' · ' : ''}BSR ${challan.bsrCode}` : ''}
                          {challan.depositDate ? ` · ${formatDate(challan.depositDate)}` : ''}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditChallan(challan); setChallanOpen(true); }}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => { await tds.deleteChallan(challan.id); readinessState.reload(); }}
                            className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-bg-subtle hover:text-[var(--tt-danger)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </FlowStep>

      {/* ---------------------------------------------------------------- 6 */}
      <FlowStep
        index={6}
        title="Issue Form 16"
        intent="The annual certificate each employee files their return with. It shows what you deducted, what you deposited, and is signed by your authorised signatory."
        status={form16Status}
      >
        <div className="space-y-2.5">
          {!readiness?.form16.ready && (
            <div className="rounded-lg border border-[var(--tt-danger)] bg-surface p-3">
              <p className="text-[11px] font-semibold text-fg">Not ready to issue yet</p>
              <ul className="mt-1 list-inside list-disc text-[11px] leading-relaxed text-fg-muted">
                {readiness?.form16.blockedBy.includes('employerIdentity') && (
                  <li>Set the employer TAN and signatory name in step 1 — the certificate cannot be signed without them.</li>
                )}
                {readiness?.form16.blockedBy.includes('challans') && (
                  <li>Record at least one deposit challan in step 5 — Part A needs proof the tax was paid.</li>
                )}
              </ul>
            </div>
          )}

          <div className="relative">
            <label className={labelClass}>Employee</label>
            <input
              value={form16EmployeeQuery}
              onChange={(e) => { setForm16EmployeeQuery(e.target.value); setForm16EmployeeId(null); }}
              placeholder="Search employee by name…"
              className={inputClass}
            />
            {form16Searching && (
              <Loader2 className="absolute right-2.5 top-9 h-3.5 w-3.5 animate-spin text-fg-subtle" />
            )}
            {form16Candidates.length > 0 && !form16EmployeeId && (
              <div className="absolute inset-x-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface shadow-lg tt-scroll-hidden">
                {form16Candidates.map((candidate) => (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setForm16EmployeeId(candidate.id);
                      setForm16EmployeeQuery(candidate.name);
                      setForm16Candidates([]);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
                  >
                    {candidate.name}
                    <span className="ml-2 text-fg-subtle">{candidate.designation || ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!form16EmployeeId || downloading || !readiness?.form16.ready}
            onClick={downloadForm16}
            className={primaryButton}
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span>{downloading ? 'Generating…' : `Download Form 16 for FY ${tds.financialYear}`}</span>
          </button>
        </div>
      </FlowStep>

      <ChallanDialog
        open={challanOpen}
        initial={editChallan}
        defaultFy={tds.financialYear}
        isSaving={tds.isSaving}
        onClose={() => setChallanOpen(false)}
        onSubmit={async (payload) => {
          const ok = await tds.saveChallan(payload);
          if (ok) {
            setChallanOpen(false);
            readinessState.reload();
          }
        }}
      />
    </div>
  );
}

function ChallanDialog({
  open,
  initial,
  defaultFy,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initial: TdsChallan | null;
  defaultFy: string;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    id?: number;
    financial_year: string;
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    bsr_code?: string;
    challan_serial_no?: string;
    deposit_date?: string;
    amount: number;
  }) => Promise<void> | void;
}) {
  const [financialYear, setFinancialYear] = React.useState(defaultFy);
  const [quarter, setQuarter] = React.useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [bsrCode, setBsrCode] = React.useState('');
  const [serial, setSerial] = React.useState('');
  const [depositDate, setDepositDate] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setError('');
    setFinancialYear(initial?.financialYear ?? defaultFy);
    setQuarter(initial?.quarter ?? 'Q1');
    setBsrCode(initial?.bsrCode ?? '');
    setSerial(initial?.challanSerialNo ?? '');
    setDepositDate(initial?.depositDate ? String(initial.depositDate).slice(0, 10) : '');
    setAmount(initial ? String(initial.amount) : '');
  }, [open, initial, defaultFy]);

  const submit = () => {
    const message = validateChallan({ amount, financialYear, quarter, depositDate });
    if (message) { setError(message); return; }
    setError('');
    onSubmit({
      id: initial?.id,
      financial_year: financialYear,
      quarter,
      bsr_code: bsrCode.trim() || undefined,
      challan_serial_no: serial.trim() || undefined,
      deposit_date: depositDate || undefined,
      amount: Number(amount),
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Challan' : 'Add Challan'}
      footer={
        <>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm">
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={isSaving} className={primaryButton}>
            {isSaving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            <span>{initial ? 'Save changes' : 'Add Challan'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-3.5">
        {error && <Alert message={error} tone="error" />}
        <p className="text-[11px] leading-relaxed text-fg-muted">
          Enter the challan exactly as it appears on the receipt from the bank or the e-payment portal. The BSR code and
          serial number are what let the department match your deposit to this employee&apos;s Form 16.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Financial Year</label>
            <select value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} className={inputClass}>
              {fyOptions().map((fy) => (
                <option key={fy} value={fy}>{fy}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quarter</label>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value as typeof quarter)} className={inputClass}>
              {QUARTERS.map((q) => (
                <option key={q.value} value={q.value}>{q.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Amount (₹)</label>
          <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 12500" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>BSR Code</label>
            <input value={bsrCode} onChange={(e) => setBsrCode(e.target.value)} placeholder="e.g., 0123456" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Challan serial no.</label>
            <input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="e.g., 00091" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Deposit date</label>
          <input type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} className={inputClass} />
        </div>
      </div>
    </Dialog>
  );
}

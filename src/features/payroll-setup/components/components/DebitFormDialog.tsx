'use client';

import React from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import { DEBIT_CATEGORIES, LWF_FREQUENCY_MONTHS } from '../../constants/payroll-setup.constants';
import type { DebitRule, DebitFormInput } from '../../types/payroll-setup.model';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-fg-subtle';
const hintClass = 'mt-1 text-[11px] text-fg-muted';
const errorClass = 'mt-1 text-[11px] font-medium text-[var(--tt-danger)]';

interface DebitFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: DebitRule;
  components: Array<{ id: number; name: string }>;
  isSaving: boolean;
  fieldError: { field: string; message: string } | null;
  onClose: () => void;
  onSubmit: (input: DebitFormInput) => void;
}

interface FormState {
  name: string;
  description: string;
  category: string;
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[];
  oneTimeMonth: string;
  debitType: 'fixed' | 'percentage';
  fixedAmount: string;
  percentageValue: string;
  referenceAmount: 'net' | 'before_deduction' | 'breakdown_item';
  breakdownItemId: number | null;
  enableMaxCap: boolean;
  maxCapAmount: string;
  enableAdditionalCharges: boolean;
  additionalChargeType: 'fixed' | 'percentage';
  additionalChargeValue: string;
  config: Record<string, string | number | boolean | number[]>;
  status: 'active' | 'inactive';
}

function initialState(initial?: DebitRule): FormState {
  if (!initial) {
    return {
      name: '',
      description: '',
      category: 'custom',
      frequency: 'monthly',
      applicableMonths: [],
      oneTimeMonth: '',
      debitType: 'fixed',
      fixedAmount: '',
      percentageValue: '',
      referenceAmount: 'net',
      breakdownItemId: null,
      enableMaxCap: false,
      maxCapAmount: '',
      enableAdditionalCharges: false,
      additionalChargeType: 'fixed',
      additionalChargeValue: '',
      config: {},
      status: 'active',
    };
  }
  return {
    name: initial.name,
    description: initial.description ?? '',
    category: initial.category,
    frequency: initial.frequency || 'monthly',
    applicableMonths: initial.applicableMonths || [],
    oneTimeMonth: initial.oneTimeMonth || '',
    debitType: initial.debitType,
    fixedAmount: initial.fixedAmount !== null ? String(initial.fixedAmount) : '',
    percentageValue: initial.percentageValue !== null ? String(initial.percentageValue) : '',
    referenceAmount: (initial.referenceAmount as FormState['referenceAmount']) || 'net',
    breakdownItemId: initial.breakdownItemId,
    enableMaxCap: initial.enableMaxCap,
    maxCapAmount: initial.maxCapAmount !== null ? String(initial.maxCapAmount) : '',
    enableAdditionalCharges: initial.enableAdditionalCharges,
    additionalChargeType: initial.additionalChargeType || 'fixed',
    additionalChargeValue: initial.additionalChargeValue !== null ? String(initial.additionalChargeValue) : '',
    config: (initial.config as FormState['config']) || {},
    status: initial.status,
  };
}

export function DebitFormDialog({
  open,
  mode,
  initial,
  components,
  isSaving,
  fieldError,
  onClose,
  onSubmit,
}: DebitFormDialogProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [form, setForm] = React.useState<FormState>(initialState());

  React.useEffect(() => {
    if (!open) return;
    setForm(initialState(initial));
    setStep(mode === 'create' ? 1 : 2);
  }, [open, initial, mode]);

  const categoryMeta = DEBIT_CATEGORIES.find((c) => c.value === form.category);

  // Picking a category seeds the whole form from that category's preset — name,
  // description and every statutory setting — so the admin edits real values rather
  // than an empty form. Anything they have already typed is preserved; only a field
  // still holding the previous category's preset is replaced.
  const pickCategory = (category: string) => {
    const next = DEBIT_CATEGORIES.find((c) => c.value === category);
    if (!next) return;
    setForm((prev) => {
      const previous = DEBIT_CATEGORIES.find((c) => c.value === prev.category);
      const nameIsUntouched = !prev.name.trim() || prev.name.trim() === (previous?.defaultName ?? '');
      const descriptionIsUntouched =
        !prev.description.trim() || prev.description.trim() === (previous?.description ?? '');
      return {
        ...prev,
        category,
        name: nameIsUntouched ? next.defaultName : prev.name,
        description: descriptionIsUntouched ? next.description : prev.description,
        config: { ...next.defaults },
        debitType: next.statutary ? 'fixed' : prev.debitType,
      };
    });
  };

  const setConfig = (key: string, value: string | number | boolean | number[]) =>
    setForm((prev) => {
      const config = { ...prev.config, [key]: value };
      // LWF is due only in specific months once the frequency stops being monthly;
      // without the matching month list the backend would deduct it every cycle.
      if (prev.category === 'lwf' && key === 'frequency') {
        const months = LWF_FREQUENCY_MONTHS[String(value)];
        if (months) config.months = months;
        else delete config.months;
      }
      return { ...prev, config };
    });

  const submit = () => {
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  const isCustomLike = !categoryMeta?.statutary;
  const isTds = form.category === 'tds';

  const titleNode = (
    <div>
      <h2 className="text-sm font-bold text-fg sm:text-base">
        {mode === 'create' ? 'Add Deduction Rule' : 'Edit Deduction Rule'}
      </h2>
      <p className="mt-0.5 text-[11px] text-fg-muted sm:text-xs">
        {step === 1 && mode === 'create'
          ? 'Pick the type of deduction'
          : categoryMeta
            ? `${categoryMeta.label} — ${categoryMeta.description}`
            : 'Configure the deduction'}
      </p>
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleNode}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          {mode === 'create' && step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-surface px-4 text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle sm:text-sm"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={step === 1 ? !form.category : isSaving || !form.name.trim()}
            onClick={() => {
              if (mode === 'create' && step === 1) setStep(2);
              else submit();
            }}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--tt-primary)] px-4.5 text-xs font-semibold text-[var(--tt-on-primary)] shadow-xs transition-all hover:bg-[var(--tt-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            <span>{step === 1 ? 'Continue' : mode === 'create' ? 'Create Rule' : 'Save changes'}</span>
          </button>
        </>
      }
    >
      {step === 1 && mode === 'create' ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DEBIT_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => pickCategory(category.value)}
              className={cx(
                'rounded-lg border p-3 text-left transition-all',
                form.category === category.value
                  ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                  : 'border-line bg-surface hover:bg-bg-subtle'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg sm:text-sm">{category.label}</span>
                {category.statutary && (
                  <span className="rounded-full bg-[var(--tt-primary)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--tt-primary)]">
                    Statutory
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] leading-relaxed text-fg-muted">{category.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {mode === 'edit' && (initial?.assignedEmployeeCount ?? 0) > 0 && (
            <div className="rounded-lg border border-[var(--tt-danger)] bg-surface p-3">
              <p className="text-xs leading-relaxed text-fg">
                <span className="font-semibold">
                  Assigned to {initial?.assignedEmployeeCount} employee
                  {(initial?.assignedEmployeeCount ?? 0) === 1 ? '' : 's'}.
                </span>{' '}
                Changes apply from the next payroll cycle that has not been generated yet. Payslips already generated
                keep the values they were calculated with.
                {isTds && ' TDS self-corrects: the next cycle absorbs the difference against tax already deducted this year.'}
              </p>
            </div>
          )}

          <div>
            <label className={labelClass}>
              Rule Name <span className="text-[var(--tt-danger)]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g., EPF, Professional Tax, Meal Deduction"
              className={inputClass}
              autoFocus
            />
            {fieldError?.field === 'debit_name' ? (
              <p className={errorClass}>{fieldError.message}</p>
            ) : (
              <p className={hintClass}>Must be unique within your organization.</p>
            )}
          </div>

          {!isCustomLike && !isTds && <StatutoryConfigFields form={form} setConfig={setConfig} components={components} fieldError={fieldError} />}

          {isTds && (
            <div className="rounded-lg border border-line bg-bg-subtle/60 p-3">
              <p className="text-xs leading-relaxed text-fg-muted">
                TDS is computed per employee from their projected annual income, tax regime, and declared deductions.
                Assign this rule to an employee, then set their tax profile from the Assignments drawer.
              </p>
            </div>
          )}

          {isCustomLike && (
            <>
              <div>
                <label className={labelClass}>Calculation</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['fixed', 'percentage'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, debitType: t }))}
                      className={cx(
                        'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                        form.debitType === t
                          ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                          : 'border-line bg-surface hover:bg-bg-subtle'
                      )}
                    >
                      <div>
                        <div className="text-xs font-semibold text-fg">{t === 'fixed' ? 'Fixed amount' : 'Percentage'}</div>
                        <div className="text-[11px] text-fg-muted">
                          {t === 'fixed' ? 'Same amount every cycle' : 'Percent of a salary base'}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.debitType === 'fixed' ? (
                <div>
                  <label className={labelClass}>
                    Amount (₹) <span className="text-[var(--tt-danger)]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.fixedAmount}
                    onChange={(e) => setForm((p) => ({ ...p, fixedAmount: e.target.value }))}
                    placeholder="e.g., 500"
                    className={inputClass}
                  />
                  {fieldError?.field === 'fixed_amount' && <p className={errorClass}>{fieldError.message}</p>}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Percentage (%) <span className="text-[var(--tt-danger)]">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.percentageValue}
                      onChange={(e) => setForm((p) => ({ ...p, percentageValue: e.target.value }))}
                      placeholder="e.g., 12"
                      className={inputClass}
                    />
                    {fieldError?.field === 'percentage_value' && <p className={errorClass}>{fieldError.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Of</label>
                    <select
                      value={form.referenceAmount}
                      onChange={(e) => setForm((p) => ({ ...p, referenceAmount: e.target.value as FormState['referenceAmount'], breakdownItemId: null }))}
                      className={inputClass}
                    >
                      <option value="net">Net salary</option>
                      <option value="before_deduction">Gross (before deductions)</option>
                      <option value="breakdown_item">Specific component</option>
                    </select>
                  </div>
                  {form.referenceAmount === 'breakdown_item' && (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Salary Component</label>
                      <select
                        value={form.breakdownItemId ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, breakdownItemId: e.target.value ? Number(e.target.value) : null }))}
                        className={inputClass}
                      >
                        <option value="">Select a component…</option>
                        {components.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {fieldError?.field === 'breakdown_item_id' && <p className={errorClass}>{fieldError.message}</p>}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2.5">
                <ToggleRow
                  checked={form.enableMaxCap}
                  onChange={(v) => setForm((p) => ({ ...p, enableMaxCap: v }))}
                  title="Monthly cap"
                  description="Never deduct more than this amount in a cycle"
                />
                {form.enableMaxCap && (
                  <div>
                    <label className={labelClass}>Cap Amount (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.maxCapAmount}
                      onChange={(e) => setForm((p) => ({ ...p, maxCapAmount: e.target.value }))}
                      placeholder="e.g., 2000"
                      className={inputClass}
                    />
                    {fieldError?.field === 'max_cap_amount' && <p className={errorClass}>{fieldError.message}</p>}
                  </div>
                )}

                <ToggleRow
                  checked={form.enableAdditionalCharges}
                  onChange={(v) => setForm((p) => ({ ...p, enableAdditionalCharges: v }))}
                  title="Extra charge on top"
                  description="Add a surcharge on the calculated deduction"
                />
                {form.enableAdditionalCharges && (
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={form.additionalChargeType}
                      onChange={(e) => setForm((p) => ({ ...p, additionalChargeType: e.target.value as 'fixed' | 'percentage' }))}
                      className={inputClass}
                    >
                      <option value="fixed">Fixed (₹)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.additionalChargeValue}
                      onChange={(e) => setForm((p) => ({ ...p, additionalChargeValue: e.target.value }))}
                      placeholder={form.additionalChargeType === 'percentage' ? '%' : '₹'}
                      className={inputClass}
                    />
                    {fieldError?.field === 'additional_charge_value' && (
                      <p className={errorClass}>{fieldError.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Deduction Schedule (When to debit)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, frequency: 'monthly' }))}
                    className={cx(
                      'rounded-lg border p-2.5 text-center transition-all',
                      form.frequency === 'monthly'
                        ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 font-semibold text-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]'
                        : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                    )}
                  >
                    <div className="text-xs font-semibold">Every Month</div>
                    <div className="text-[10px] text-fg-muted mt-0.5">Recurring</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, frequency: 'selected_months' }))}
                    className={cx(
                      'rounded-lg border p-2.5 text-center transition-all',
                      form.frequency === 'selected_months'
                        ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 font-semibold text-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]'
                        : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                    )}
                  >
                    <div className="text-xs font-semibold">Specific Months</div>
                    <div className="text-[10px] text-fg-muted mt-0.5">e.g. Nov & Dec</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, frequency: 'one_time' }))}
                    className={cx(
                      'rounded-lg border p-2.5 text-center transition-all',
                      form.frequency === 'one_time'
                        ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 font-semibold text-[var(--tt-primary)] ring-1 ring-[var(--tt-primary)]'
                        : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                    )}
                  >
                    <div className="text-xs font-semibold">One-Time</div>
                    <div className="text-[10px] text-fg-muted mt-0.5">Single cycle</div>
                  </button>
                </div>

                {form.frequency === 'selected_months' && (
                  <div className="mt-2.5 rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                    <div className="text-xs font-medium text-fg mb-2">Select Active Months:</div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((name, idx) => {
                        const mNum = idx + 1;
                        const isSelected = form.applicableMonths.includes(mNum);
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => {
                              setForm((p) => {
                                const months = p.applicableMonths.includes(mNum)
                                  ? p.applicableMonths.filter((m) => m !== mNum)
                                  : [...p.applicableMonths, mNum].sort((a, b) => a - b);
                                return { ...p, applicableMonths: months };
                              });
                            }}
                            className={cx(
                              'rounded-md py-1.5 text-xs font-medium border transition-colors',
                              isSelected
                                ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)] text-[var(--tt-on-primary)] shadow-xs'
                                : 'border-line bg-surface text-fg hover:bg-bg-subtle'
                            )}
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                    {form.applicableMonths.length === 0 && (
                      <p className="mt-1.5 text-[11px] text-[var(--tt-danger)]">Please select at least one applicable month.</p>
                    )}
                  </div>
                )}

                {form.frequency === 'one_time' && (
                  <div className="mt-2.5 rounded-lg border border-line bg-bg-subtle/50 p-2.5">
                    <label className={labelClass}>Target Month (YYYY-MM)</label>
                    <input
                      type="month"
                      value={form.oneTimeMonth}
                      onChange={(e) => setForm((p) => ({ ...p, oneTimeMonth: e.target.value }))}
                      className={inputClass}
                    />
                    {!form.oneTimeMonth && (
                      <p className="mt-1 text-[11px] text-[var(--tt-danger)]">Please select the target payroll cycle month.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold text-fg sm:text-[13px]">Description</label>
              <span className="text-[11px] text-fg-subtle">Optional</span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="What is this deduction for?"
              rows={2}
              className="w-full resize-none rounded-lg border border-line bg-surface p-3 text-xs text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)] sm:text-sm"
            />
          </div>
        </form>
      )}
    </Dialog>
  );
}

function ToggleRow({ checked, onChange, title, description }: { checked: boolean; onChange: (v: boolean) => void; title: string; description: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
        checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]' : 'border-line bg-surface hover:bg-bg-subtle'
      )}
    >
      <span
        className={cx(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border',
          checked ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]' : 'border-line-strong bg-surface'
        )}
      >
        {checked && <Check className="h-3 w-3 text-[var(--tt-on-primary)]" />}
      </span>
      <div>
        <div className="text-xs font-semibold text-fg">{title}</div>
        <div className="text-[11px] text-fg-muted">{description}</div>
      </div>
    </button>
  );
}

function lwfScheduleHint(frequency: unknown): string {
  const months = LWF_FREQUENCY_MONTHS[String(frequency ?? 'monthly')];
  if (!months) return 'Deducted in every payroll cycle.';
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Deducted only in ${months.map((m) => names[m - 1]).join(' and ')}.`;
}

function StatutoryConfigFields({
  form,
  setConfig,
  components,
  fieldError,
}: {
  form: FormState;
  setConfig: (key: string, value: string | number | boolean | number[]) => void;
  components: Array<{ id: number; name: string }>;
  fieldError: { field: string; message: string } | null;
}) {
  const config = form.config;

  if (form.category === 'epf') {
    return (
      <div className="space-y-3.5">
        <h3 className={sectionTitle}>Provident Fund settings</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>Employee rate (%)</label>
            <input type="number" min={0} step="0.01" value={String(config.rate ?? 12)} onChange={(e) => setConfig('rate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Wage ceiling (₹/month)</label>
            <input type="number" min={0} value={String(config.wageCeiling ?? 15000)} onChange={(e) => setConfig('wageCeiling', e.target.value)} className={inputClass} />
            <p className={hintClass}>EPF applies on Basic up to this ceiling (default ₹15,000).</p>
          </div>
        </div>
        <div>
          <label className={labelClass}>Based on component</label>
          <select
            value={String(config.componentName ?? 'Basic')}
            onChange={(e) => setConfig('componentName', e.target.value)}
            className={inputClass}
          >
            {components.length === 0 ? <option value="Basic">Basic</option> : components.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <ToggleRow
          checked={Boolean(config.applyCeiling ?? true)}
          onChange={(v) => setConfig('applyCeiling', v)}
          title="Apply ₹15,000 wage ceiling"
          description="When off, PF is 12% of the full Basic wage"
        />
        {fieldError?.field === 'config' && <p className={errorClass}>{fieldError.message}</p>}
      </div>
    );
  }

  if (form.category === 'esi') {
    return (
      <div className="space-y-3.5">
        <h3 className={sectionTitle}>ESI settings</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>Employee rate (%)</label>
            <input type="number" min={0} step="0.01" value={String(config.rate ?? 0.75)} onChange={(e) => setConfig('rate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Eligibility ceiling (₹ gross/month)</label>
            <input type="number" min={0} value={String(config.eligibilityCeiling ?? 21000)} onChange={(e) => setConfig('eligibilityCeiling', e.target.value)} className={inputClass} />
            <p className={hintClass}>ESI applies only when monthly gross is within this amount.</p>
          </div>
        </div>
        {fieldError?.field === 'config' && <p className={errorClass}>{fieldError.message}</p>}
      </div>
    );
  }

  if (form.category === 'professional_tax') {
    return (
      <div className="space-y-3.5">
        <h3 className={sectionTitle}>Professional Tax settings</h3>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <label className={labelClass}>State</label>
            <input type="text" value={String(config.state ?? '')} onChange={(e) => setConfig('state', e.target.value)} placeholder="Maharashtra" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Monthly amount (₹)</label>
            <input type="number" min={0} value={String(config.monthlyAmount ?? 200)} onChange={(e) => setConfig('monthlyAmount', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>February amount (₹)</label>
            <input type="number" min={0} value={String(config.februaryAmount ?? 200)} onChange={(e) => setConfig('februaryAmount', e.target.value)} className={inputClass} />
          </div>
        </div>
        {fieldError?.field === 'config' && <p className={errorClass}>{fieldError.message}</p>}
      </div>
    );
  }

  if (form.category === 'lwf') {
    return (
      <div className="space-y-3.5">
        <h3 className={sectionTitle}>LWF settings</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className={labelClass}>Amount (₹)</label>
            <input type="number" min={0} step="0.01" value={String(config.amount ?? 0)} onChange={(e) => setConfig('amount', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Frequency</label>
            <select value={String(config.frequency ?? 'monthly')} onChange={(e) => setConfig('frequency', e.target.value)} className={inputClass}>
              <option value="monthly">Every month</option>
              <option value="half-yearly">Half-yearly (June & December)</option>
              <option value="annual">Annual (December)</option>
            </select>
            <p className={hintClass}>{lwfScheduleHint(config.frequency)}</p>
          </div>
        </div>
        {fieldError?.field === 'config' && <p className={errorClass}>{fieldError.message}</p>}
      </div>
    );
  }

  return null;
}

'use client';

import React from 'react';
import { Check, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Dialog } from '@/components/ui/Dialog';
import {
  CHANGE_REASON_MAX,
  DEBIT_CATEGORIES,
  INDIAN_STATES,
  LWF_FREQUENCY_MONTHS,
  REFERENCE_AMOUNT_OPTIONS,
} from '../../constants/payroll-setup.constants';
import type { DebitRule, DebitFormInput, DebitConfigValue, DebitSlab, DebitType } from '../../types/payroll-setup.model';
import { MONTH_NAMES, PT_GENDERS, ptGender, ptSlabs, ptSpecialMonth, type PtSlab } from '../../utils/professionalTax';
import { SLAB_BASES, describeSlab, emptySlab, slabBasisLabel, slabOf, validateSlab } from '../../utils/deductionSlabs';
import { useDebitVersions } from '../../hooks/useDebitVersions';
import { SubOrgPicker } from '@/features/sub-organizations/components/SubOrgPicker';
import { usePermission } from '@/lib/hooks/usePermission';

const inputClass =
  'w-full min-w-0 rounded-lg border border-line bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-primary)] focus:ring-1 focus:ring-[var(--tt-primary)]';
const labelClass = 'mb-1.5 block text-xs font-semibold text-fg sm:text-[13px]';
const sectionTitle = 'text-[11px] font-semibold uppercase tracking-wider text-fg-subtle';
const hintClass = 'mt-1 text-[11px] text-fg-muted';
const errorClass = 'mt-1 text-[11px] font-medium text-[var(--tt-danger)]';
const errorInputClass =
  'w-full min-w-0 rounded-lg border border-[var(--tt-danger)] bg-surface px-3 h-10 text-sm text-fg placeholder:text-fg-subtle outline-none transition-colors focus:border-[var(--tt-danger)] focus:ring-1 focus:ring-[var(--tt-danger)]';

const CALCULATION_TYPES: Array<{ value: DebitType; title: string; hint: string }> = [
  { value: 'fixed', title: 'Fixed amount', hint: 'Same amount every cycle' },
  { value: 'percentage', title: 'Percentage', hint: 'Percent of a salary base' },
  { value: 'slab', title: 'Slabs', hint: 'Amount depends on salary' },
];

interface DebitFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: DebitRule;
  components: Array<{ id: number; name: string; type?: 'credit' | 'debit' }>;
  isSaving: boolean;
  fieldError: { field: string; message: string } | null;
  onClose: () => void;
  onSubmit: (input: DebitFormInput) => void;
}

interface FormState {
  name: string;
  description: string;
  category: string;
  subOrganizationId: number | null;
  frequency: 'monthly' | 'selected_months' | 'one_time';
  applicableMonths: number[];
  oneTimeMonth: string;
  debitType: DebitType;
  fixedAmount: string;
  percentageValue: string;
  referenceAmount: 'net' | 'before_deduction' | 'breakdown_item';
  breakdownItemId: number | null;
  enableMaxCap: boolean;
  maxCapAmount: string;
  enableAdditionalCharges: boolean;
  additionalChargeType: 'fixed' | 'percentage';
  additionalChargeValue: string;
  config: Record<string, DebitConfigValue>;
  prorateByAttendance: boolean;
  slab: DebitSlab;
  status: 'active' | 'inactive';
  effectiveFrom: string;
  changeReason: string;
}

function withPtShape(category: string, config: FormState['config']): FormState['config'] {
  if (category === 'epf' || category === 'esi') return { ...config, employerInCtc: config.employerInCtc === true };
  if (category !== 'professional_tax') return config;
  const rest = { ...config };
  delete rest.monthlyAmount;
  delete rest.februaryAmount;
  return { ...rest, slabs: ptSlabs(config), specialMonth: ptSpecialMonth(config) };
}

function initialState(initial?: DebitRule): FormState {
  if (!initial) {
    return {
      name: '',
      description: '',
      category: 'custom',
      subOrganizationId: null,
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
      prorateByAttendance: false,
      slab: emptySlab(),
      status: 'active',
      effectiveFrom: '',
      changeReason: '',
    };
  }
  const config = (initial.config as FormState['config']) || {};
  return {
    name: initial.name,
    description: initial.description ?? '',
    category: initial.category,
    subOrganizationId: initial.subOrganizationId ?? null,
    frequency: initial.frequency || 'monthly',
    applicableMonths: initial.applicableMonths || [],
    oneTimeMonth: initial.oneTimeMonth || '',
    debitType: initial.debitType,
    fixedAmount: initial.fixedAmount !== null ? String(initial.fixedAmount) : '',
    percentageValue: initial.percentageValue !== null ? String(initial.percentageValue) : '',
    // 'after_deduction' always meant net pay; the server now stores it as 'net'.
    referenceAmount: initial.referenceAmount === 'after_deduction' || !initial.referenceAmount ? 'net' : initial.referenceAmount,
    breakdownItemId: initial.breakdownItemId,
    enableMaxCap: initial.enableMaxCap,
    maxCapAmount: initial.maxCapAmount !== null ? String(initial.maxCapAmount) : '',
    enableAdditionalCharges: initial.enableAdditionalCharges,
    additionalChargeType: initial.additionalChargeType || 'fixed',
    additionalChargeValue: initial.additionalChargeValue !== null ? String(initial.additionalChargeValue) : '',
    config: withPtShape(initial.category, config),
    prorateByAttendance: config.prorateByAttendance === true,
    slab: slabOf(initial.config) ?? emptySlab(),
    status: initial.status,
    effectiveFrom: '',
    changeReason: '',
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
  const { isOrgAdmin } = usePermission();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [form, setForm] = React.useState<FormState>(initialState());
  const isEdit = mode === 'edit';
  // Only an edit needs the default "Applies from" date (the first day no finalized payroll froze).
  const versions = useDebitVersions(open && isEdit && initial ? initial.id : null);

  React.useEffect(() => {
    if (!open) return;
    setForm(initialState(initial));
    setStep(mode === 'create' ? 1 : 2);
  }, [open, initial, mode]);

  React.useEffect(() => {
    if (!open || !isEdit || !versions.defaultEffectiveFrom) return;
    setForm((prev) => (prev.effectiveFrom ? prev : { ...prev, effectiveFrom: versions.defaultEffectiveFrom }));
  }, [open, isEdit, versions.defaultEffectiveFrom]);

  const errorOf = (field: string) => (fieldError?.field === field ? fieldError.message : null);
  const inputFor = (field: string) => (errorOf(field) ? errorInputClass : inputClass);

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

  const setConfig = (key: string, value: DebitConfigValue) =>
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
  const earningComponents = components.filter((c) => !c.type || c.type === 'credit');

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
                Amount changes apply from the date below. Earlier pay periods keep the old amount.
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
              className={inputFor('debit_name')}
              autoFocus
            />
            {fieldError?.field === 'debit_name' ? (
              <p className={errorClass}>{fieldError.message}</p>
            ) : (
              <p className={hintClass}>Must be unique within your organization.</p>
            )}
          </div>

          {isEdit && (
            <div>
              <label className={labelClass}>Category</label>
              <select value={form.category} disabled className={cx(inputFor('category'), 'cursor-not-allowed opacity-60')}>
                <option value={form.category}>{categoryMeta?.label ?? form.category}</option>
              </select>
              {errorOf('category') ? (
                <p className={errorClass}>{errorOf('category')}</p>
              ) : (
                <p className={hintClass}>The category cannot change. Create a new rule instead.</p>
              )}
            </div>
          )}

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
                <div className="grid grid-cols-3 gap-2.5">
                  {CALCULATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, debitType: t.value }))}
                      className={cx(
                        'flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all',
                        form.debitType === t.value
                          ? 'border-[var(--tt-primary)] bg-[var(--tt-primary)]/5 ring-1 ring-[var(--tt-primary)]'
                          : 'border-line bg-surface hover:bg-bg-subtle'
                      )}
                    >
                      <div>
                        <div className="text-xs font-semibold text-fg">{t.title}</div>
                        <div className="text-[11px] text-fg-muted">{t.hint}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {form.debitType === 'slab' ? (
                <SlabEditor
                  slab={form.slab}
                  components={earningComponents}
                  error={errorOf('config')}
                  onChange={(slab) => setForm((p) => ({ ...p, slab }))}
                />
              ) : form.debitType === 'fixed' ? (
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
                    className={inputFor('fixed_amount')}
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
                      className={inputFor('percentage_value')}
                    />
                    {fieldError?.field === 'percentage_value' && <p className={errorClass}>{fieldError.message}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Of</label>
                    <select
                      value={form.referenceAmount}
                      onChange={(e) => setForm((p) => ({ ...p, referenceAmount: e.target.value as FormState['referenceAmount'], breakdownItemId: null }))}
                      className={inputFor('reference_amount')}
                    >
                      {REFERENCE_AMOUNT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {errorOf('reference_amount') && <p className={errorClass}>{errorOf('reference_amount')}</p>}
                  </div>
                  {form.referenceAmount === 'breakdown_item' && (
                    <div className="sm:col-span-2">
                      <label className={labelClass}>Salary Component</label>
                      <select
                        value={form.breakdownItemId ?? ''}
                        onChange={(e) => setForm((p) => ({ ...p, breakdownItemId: e.target.value ? Number(e.target.value) : null }))}
                        className={inputFor('breakdown_item_id')}
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
                {form.debitType !== 'percentage' && (
                  <ToggleRow
                    checked={form.prorateByAttendance}
                    onChange={(v) => setForm((p) => ({ ...p, prorateByAttendance: v }))}
                    title="Reduce for unpaid days (charge only for payable days)"
                    description="Leave it off to charge the full amount every cycle"
                  />
                )}
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
                      className={inputFor('max_cap_amount')}
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
                      className={inputFor('additional_charge_value')}
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

          {isEdit && (
            <div className="space-y-3.5 rounded-lg border border-line bg-bg-subtle/50 p-3">
              <div>
                <label className={labelClass}>Applies from</label>
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))}
                  className={inputFor('effective_from')}
                />
                {errorOf('effective_from') ? (
                  <p className={errorClass}>{errorOf('effective_from')}</p>
                ) : (
                  <p className={hintClass}>
                    Earlier pay periods keep the old amount. A date inside a finalized month is settled as arrears in
                    the next payroll. A date in the middle of a pay period splits that period.
                  </p>
                )}
                {versions.error && <p className={errorClass}>Could not load the default date. {versions.error}</p>}
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-fg sm:text-[13px]">Reason for change</label>
                  <span className="text-[11px] text-fg-subtle">Optional</span>
                </div>
                <input
                  type="text"
                  value={form.changeReason}
                  maxLength={CHANGE_REASON_MAX}
                  onChange={(e) => setForm((p) => ({ ...p, changeReason: e.target.value }))}
                  placeholder="e.g., Canteen rate revised"
                  className={inputFor('change_reason')}
                />
                {errorOf('change_reason') ? (
                  <p className={errorClass}>{errorOf('change_reason')}</p>
                ) : (
                  <p className={hintClass}>Shown in the rule&apos;s history. Name, description and company change right away.</p>
                )}
              </div>
            </div>
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

          {/* Sub-organization */}
          <SubOrgPicker
            value={form.subOrganizationId}
            onChange={(val) => setForm((p) => ({ ...p, subOrganizationId: val }))}
            allowShared={isOrgAdmin}
          />
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

function SlabEditor({
  slab,
  components,
  error,
  onChange,
}: {
  slab: DebitSlab;
  components: Array<{ id: number; name: string }>;
  error: string | null;
  onChange: (slab: DebitSlab) => void;
}) {
  const update = (index: number, patch: Partial<DebitSlab['bands'][number]>) =>
    onChange({ ...slab, bands: slab.bands.map((b, i) => (i === index ? { ...b, ...patch } : b)) });
  const remove = (index: number) => {
    const bands = slab.bands.filter((_, i) => i !== index);
    // The first band always starts at 0, so the one that moves up takes its place.
    if (index === 0 && bands.length) bands[0] = { ...bands[0], from: 0 };
    onChange({ ...slab, bands });
  };
  const add = () => {
    const last = slab.bands[slab.bands.length - 1];
    const from = last ? (Number.isFinite(last.from) ? last.from : 0) + 10000 : 0;
    onChange({ ...slab, bands: [...slab.bands, { from, type: last?.type ?? 'fixed', value: 0 }] });
  };
  const numberOf = (value: string) => (value === '' ? Number.NaN : Number(value));
  const shown = (value: number) => (Number.isFinite(value) ? String(value) : '');

  // Which row to mark: only once there is an error to show.
  const problem = error ? validateSlab(slab) : null;
  const basisMissing = Boolean(error) && slab.basis === 'component' && !slab.componentId;
  const cell = 'w-full min-w-0 rounded-md border bg-surface px-2 h-9 text-sm text-fg outline-none';
  const cellClass = (bad: boolean) =>
    cx(cell, bad ? 'border-[var(--tt-danger)] focus:border-[var(--tt-danger)]' : 'border-line focus:border-[var(--tt-primary)]');
  const componentName = components.find((c) => c.id === slab.componentId)?.name;
  const validForPreview = slab.bands.every((b) => Number.isFinite(b.from) && Number.isFinite(b.value));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Slabs based on</label>
          <select
            value={slab.basis}
            onChange={(e) => onChange({ ...slab, basis: e.target.value as DebitSlab['basis'], componentId: null })}
            className={inputClass}
          >
            {SLAB_BASES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        {slab.basis === 'component' && (
          <div>
            <label className={labelClass}>Salary component</label>
            <select
              value={slab.componentId ?? ''}
              onChange={(e) => onChange({ ...slab, componentId: e.target.value ? Number(e.target.value) : null })}
              className={basisMissing ? errorInputClass : inputClass}
            >
              <option value="">Select a component…</option>
              {components.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={labelClass}>Slabs</span>
          <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
            <Plus className="h-3.5 w-3.5" />
            Add slab
          </button>
        </div>
        <div className="grid grid-cols-[1fr_7.5rem_1fr_2rem] gap-2 text-[11px] font-semibold text-fg-muted">
          <span>From (₹)</span>
          <span>Type</span>
          <span>Amount</span>
          <span />
        </div>
        {slab.bands.map((band, i) => {
          const bad = problem?.band === i;
          return (
            <div key={i} className="grid grid-cols-[1fr_7.5rem_1fr_2rem] items-center gap-2">
              <input
                type="number"
                min={0}
                value={i === 0 ? '0' : shown(band.from)}
                disabled={i === 0}
                onChange={(e) => update(i, { from: numberOf(e.target.value) })}
                className={cx(cellClass(bad), i === 0 && 'opacity-60')}
                aria-label={`Slab ${i + 1} from`}
              />
              <select
                value={band.type}
                onChange={(e) => update(i, { type: e.target.value === 'percentage' ? 'percentage' : 'fixed' })}
                className={cellClass(false)}
                aria-label={`Slab ${i + 1} type`}
              >
                <option value="fixed">Fixed (₹)</option>
                <option value="percentage">Percent (%)</option>
              </select>
              <input
                type="number"
                min={0}
                max={band.type === 'percentage' ? 100 : undefined}
                step="0.01"
                value={shown(band.value)}
                onChange={(e) => update(i, { value: numberOf(e.target.value) })}
                placeholder={band.type === 'percentage' ? '%' : '₹'}
                className={cellClass(bad)}
                aria-label={`Slab ${i + 1} amount`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={slab.bands.length === 1}
                aria-label={`Remove slab ${i + 1}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-30"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {error ? (
        <p className={errorClass}>{error}</p>
      ) : (
        validForPreview && (
          <p className="text-xs text-fg">
            <span className="text-fg-muted">On monthly {slabBasisLabel(slab, componentName)}: </span>
            {describeSlab(slab)}
          </p>
        )
      )}
      <p className={hintClass}>
        Each slab runs from its amount up to the next one; the last covers everything above. The slab is picked on the
        employee&apos;s full monthly {slabBasisLabel(slab, componentName)}. A percentage applies to what was earned.
      </p>
    </div>
  );
}

function PtSlabEditor({ slabs, specialMonth, onChange }: { slabs: PtSlab[]; specialMonth: number | null; onChange: (slabs: PtSlab[]) => void }) {
  const update = (index: number, patch: Partial<PtSlab>) => onChange(slabs.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const remove = (index: number) => onChange(slabs.filter((_, i) => i !== index));
  const add = () => {
    const last = slabs[slabs.length - 1];
    onChange([...slabs, { gender: last?.gender ?? 'all', minGross: last ? last.minGross + 1 : 0, amount: 0, specialAmount: null }]);
  };
  const cell = 'w-full min-w-0 rounded-md border border-line bg-surface px-2 h-9 text-sm text-fg outline-none focus:border-[var(--tt-primary)]';
  const special = specialMonth ? `${MONTH_NAMES[specialMonth - 1]} (₹)` : 'Special (₹)';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={labelClass}>Slabs on monthly gross</span>
        <button type="button" onClick={add} className="inline-flex items-center gap-1 text-xs font-semibold text-fg hover:underline">
          <Plus className="h-3.5 w-3.5" />
          Add slab
        </button>
      </div>
      {slabs.length === 0 ? (
        <p className={hintClass}>No slabs. Add one to deduct PT.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[5.5rem_1fr_1fr_1fr_2rem] gap-2 text-[11px] font-semibold text-fg-muted">
            <span>Applies to</span>
            <span>Gross from (₹)</span>
            <span>Monthly (₹)</span>
            <span>{special}</span>
            <span />
          </div>
          {slabs.map((s, i) => (
            <div key={i} className="grid grid-cols-[5.5rem_1fr_1fr_1fr_2rem] items-center gap-2">
              <select value={s.gender} onChange={(e) => update(i, { gender: ptGender(e.target.value) })} className={cell} aria-label={`Slab ${i + 1} applies to`}>
                {PT_GENDERS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              <input type="number" min={0} value={String(s.minGross)} onChange={(e) => update(i, { minGross: Number(e.target.value) || 0 })} className={cell} aria-label={`Slab ${i + 1} gross from`} />
              <input type="number" min={0} value={String(s.amount)} onChange={(e) => update(i, { amount: Number(e.target.value) || 0 })} className={cell} aria-label={`Slab ${i + 1} monthly amount`} />
              <input
                type="number"
                min={0}
                value={s.specialAmount === null ? '' : String(s.specialAmount)}
                onChange={(e) => update(i, { specialAmount: e.target.value === '' ? null : Number(e.target.value) })}
                disabled={!specialMonth}
                placeholder="Same"
                className={cx(cell, !specialMonth && 'opacity-50')}
                aria-label={`Slab ${i + 1} special month amount`}
              />
              <button type="button" onClick={() => remove(i)} aria-label={`Remove slab ${i + 1}`} className="flex h-8 w-8 items-center justify-center rounded-md text-fg-muted hover:bg-bg-subtle hover:text-fg">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <p className={hintClass}>Each slab applies from its gross up to the next slab of the same group. Gender slabs replace the Everyone slabs for that gender, e.g. Female nil up to ₹25,000 in Maharashtra. Leave the special amount empty to use the monthly amount.</p>
        </div>
      )}
    </div>
  );
}

/** State picker shared by PT and LWF; an older free-text value not in the list still shows. */
function StateSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const known = !value || INDIAN_STATES.includes(value);
  return (
    <div>
      <label className={labelClass}>State</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">All states</option>
        {!known && <option value={value}>{value}</option>}
        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <p className={hintClass}>Applies to employees whose work state is this state.</p>
    </div>
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
  setConfig: (key: string, value: DebitConfigValue) => void;
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
            <label className={labelClass}>Employer rate (%)</label>
            <input type="number" min={0} step="0.01" value={String(config.employerRate ?? 12)} onChange={(e) => setConfig('employerRate', e.target.value)} className={inputClass} />
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
          checked={config.employerInCtc === true}
          onChange={(v) => setConfig('employerInCtc', v)}
          title="Employer share is part of CTC"
          description={config.employerInCtc === true
            ? 'Employee and employer share are both deducted from monthly gross (CTC / 12).'
            : 'Only the employee share is deducted. The employer share is paid on top of CTC.'}
        />
        <ToggleRow
          checked={Boolean(config.applyCeiling ?? true)}
          onChange={(v) => setConfig('applyCeiling', v)}
          title={`Apply ₹${Number(config.wageCeiling ?? 15000).toLocaleString('en-IN')} wage ceiling`}
          description={`When off, PF is ${config.rate ?? 12}% of the full ${String(config.componentName ?? 'Basic')} wage`}
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
            <label className={labelClass}>Employer rate (%)</label>
            <input type="number" min={0} step="0.01" value={String(config.employerRate ?? 3.25)} onChange={(e) => setConfig('employerRate', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Eligibility ceiling (₹ gross/month)</label>
            <input type="number" min={0} value={String(config.eligibilityCeiling ?? 21000)} onChange={(e) => setConfig('eligibilityCeiling', e.target.value)} className={inputClass} />
            <p className={hintClass}>ESI applies only when monthly gross is within this amount.</p>
          </div>
        </div>
        <ToggleRow
          checked={config.employerInCtc === true}
          onChange={(v) => setConfig('employerInCtc', v)}
          title="Employer share is part of CTC"
          description={config.employerInCtc === true
            ? 'Employee and employer share are both deducted from monthly gross (CTC / 12).'
            : 'Only the employee share is deducted. The employer share is paid on top of CTC.'}
        />
        {fieldError?.field === 'config' && <p className={errorClass}>{fieldError.message}</p>}
      </div>
    );
  }

  if (form.category === 'professional_tax') {
    return (
      <div className="space-y-3.5">
        <h3 className={sectionTitle}>Professional Tax settings</h3>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <StateSelect value={String(config.state ?? '')} onChange={(v) => setConfig('state', v)} />
          <div>
            <label className={labelClass}>Special month</label>
            <select
              value={config.specialMonth === null || config.specialMonth === undefined ? '' : String(config.specialMonth)}
              onChange={(e) => setConfig('specialMonth', e.target.value ? Number(e.target.value) : null)}
              className={inputClass}
            >
              <option value="">None</option>
              {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
            </select>
            <p className={hintClass}>Month with a different amount, e.g. Feb ₹300 in Maharashtra.</p>
          </div>
        </div>
        <PtSlabEditor
          slabs={Array.isArray(config.slabs) ? (config.slabs as PtSlab[]) : []}
          specialMonth={typeof config.specialMonth === 'number' ? config.specialMonth : null}
          onChange={(slabs) => setConfig('slabs', slabs)}
        />
        {fieldError?.field === 'config' && <p className={errorClass}>{fieldError.message}</p>}
      </div>
    );
  }

  if (form.category === 'lwf') {
    return (
      <div className="space-y-3.5">
        <h3 className={sectionTitle}>LWF settings</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <StateSelect value={String(config.state ?? '')} onChange={(v) => setConfig('state', v)} />
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

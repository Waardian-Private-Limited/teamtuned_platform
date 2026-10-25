'use client';

import React from 'react';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, OptionCard, SelectField, TextField } from '@/components/ui/FormControls';
import { DateRangeFields, DeliveryFooter, EmailsField, FILES_HELP, FormatField, parseEmails, plural, ToggleRow, useExportJob, type Delivery } from '@/features/expense-bills/components/ExportParts';
import { PAYMENT_MODES } from '@/features/expense-bills/constants/bill.constants';
import type { ExportFormatDto } from '@/features/expense-bills/types/bill.dto';
import type { PaymentMode } from '@/features/expense-bills/types/bill.model';
import { parseDecimal } from '@/features/expense-bills/utils/format';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import * as api from '../../api/petty-cash.api';
import { EXPENSE_TABS, EXPORT_PDF_LIMIT, EXPORT_XLSX_LIMIT, EXPORT_XLSX_PHOTO_LIMIT, INWARD_FILTERS, PHYSICAL_FILTERS } from '../../constants/petty-cash.constants';
import { emptyFilters, filtersQuery } from '../../hooks/useExpenseList';
import { useExpenseMatchCount } from '../../hooks/useExpenseMatchCount';
import { useFilterLists } from '../../hooks/useFilterLists';
import type { ExpenseFilters, ExpenseTab } from '../../types/petty-cash.model';
import { FormError } from './Primitives';

const END_BEFORE_START = 'The end date is before the start date';

const PLACED_FIELDS = new Set([
  'status', 'wallet_id', 'site_id', 'category_id', 'spent_by', 'payment_mode', 'physical', 'inward', 'from', 'to', 'min_amount', 'max_amount', 'flagged', 'search', 'format', 'emails', 'filters', 'ids',
]);

function limitFor(format: ExportFormatDto, files: boolean) {
  if (format === 'pdf') return EXPORT_PDF_LIMIT;
  return files ? EXPORT_XLSX_PHOTO_LIMIT : EXPORT_XLSX_LIMIT;
}

function limitText(format: ExportFormatDto, files: boolean) {
  const big = EXPORT_XLSX_LIMIT.toLocaleString('en-IN');
  if (format === 'pdf') return `A PDF holds up to ${EXPORT_PDF_LIMIT} expenses. Narrow the filters, or choose Excel without photos (up to ${big}).`;
  if (files) return `Excel with photos holds up to ${EXPORT_XLSX_PHOTO_LIMIT} expenses. Turn off photos (up to ${big}) or narrow the filters.`;
  return `Excel holds up to ${big} expenses. Narrow the filters.`;
}

function ComboField({ label, value, onChange, options, allLabel, error }: { label: string; value: number | null; onChange: (v: number | null) => void; options: ComboboxOption[]; allLabel: string; error?: string }) {
  return (
    <div>
      <FieldLabel label={label} />
      <Combobox options={options} value={value} onChange={(v) => onChange(v === null ? null : Number(v))} placeholder={allLabel} searchPlaceholder={`Search ${label.toLowerCase()}…`} ariaLabel={label} invalid={Boolean(error)} />
      <FieldMessage error={error} />
    </div>
  );
}

type Kind = 'expenses' | 'register';

interface ExportFiltersDialogProps {
  open: boolean;
  onClose: () => void;
  kind: Kind;
  /** `hr` → `petty-cash-expenses`; `me` → `my-petty-cash-expenses`. The register is HR only. */
  scope: 'hr' | 'me';
  /** The page's filters, shown (and editable) in the dialog. */
  initial?: Partial<ExpenseFilters>;
  /** Rows checked on the page; offers "Selected expenses (N)". */
  ids?: number[];
}

function ExportFiltersDialog({ open, onClose, kind, scope, initial, ids = [] }: ExportFiltersDialogProps) {
  const hr = scope === 'hr';
  const register = kind === 'register';
  const job = useExportJob(PLACED_FIELDS);
  const { reset, clearField } = job;
  const hasSelection = ids.length > 0;
  const [f, setF] = React.useState<ExpenseFilters>(() => emptyFilters('all'));
  const [spender, setSpender] = React.useState<CompEmployeeDto | null>(null);
  const [onlySelected, setOnlySelected] = React.useState(false);
  const [format, setFormat] = React.useState<ExportFormatDto>('xlsx');
  const [files, setFiles] = React.useState(true);
  const [emailOpen, setEmailOpen] = React.useState(false);
  const [emails, setEmails] = React.useState('');
  const emailRef = React.useRef<HTMLInputElement>(null);

  // Snapshot of the page when the dialog opens; later page changes do not reset what was edited here.
  const initialRef = React.useRef(initial);
  initialRef.current = initial;
  React.useEffect(() => {
    if (!open) return;
    reset();
    setF({ ...emptyFilters('all'), ...initialRef.current });
    setSpender(null);
    setOnlySelected(hasSelection);
    setFormat(hasSelection || scope === 'me' ? 'pdf' : 'xlsx');
    setFiles(true);
    setEmailOpen(false);
    setEmails('');
  }, [open, reset, hasSelection, scope]);

  React.useEffect(() => {
    if (open && emailOpen) emailRef.current?.focus();
  }, [open, emailOpen]);

  const usingFilters = !(hasSelection && onlySelected);
  const lists = useFilterLists(scope, open && usingFilters);
  // The goods register always reads one goods state: the export defaults to received goods, so the count does too.
  const inward = register ? f.inward ?? 'received' : f.inward;
  const query = React.useMemo(() => filtersQuery({ ...f, inward, physical: register ? null : f.physical, spentBy: spender?.id ?? null }, register ? 'inward' : scope), [f, inward, spender, register, scope]);
  const dateErr = f.from && f.to && f.from > f.to ? END_BEFORE_START : '';
  const amountErr = f.minAmount && f.maxAmount && Number(f.minAmount) > Number(f.maxAmount) ? 'The largest amount is below the smallest' : '';
  const match = useExpenseMatchCount(scope, open && usingFilters && !dateErr && !amountErr ? query : null, register);

  const count = !usingFilters ? ids.length : match.count;
  const limit = limitFor(format, files);
  const overLimit = count !== null && count > limit;
  const noMatch = usingFilters && match.count === 0 && !match.loading;
  const err = (key: string, own = '') => own || job.fields[key] || (usingFilters ? match.fields[key] : '') || undefined;

  const set = (patch: Partial<ExpenseFilters>, ...keys: string[]) => {
    setF((cur) => ({ ...cur, ...patch }));
    clearField(...keys, 'filters', 'format');
  };

  const statusOptions = EXPENSE_TABS.filter((t) => t.value !== 'all').map((t) => ({ value: t.value as ExpenseTab, label: t.label === 'Pending' ? 'Waiting for approval' : t.label }));

  const submit = (delivery: Delivery) => {
    if (delivery === 'email' && !emailOpen) {
      setEmailOpen(true);
      return;
    }
    const errs: Record<string, string> = {};
    if (usingFilters && dateErr) errs.to = dateErr;
    if (usingFilters && amountErr) errs.max_amount = amountErr;
    let list: string[] = [];
    if (delivery === 'email') {
      const parsed = parseEmails(emails);
      list = parsed.emails;
      if (parsed.error) errs.emails = parsed.error;
    }
    if (overLimit) errs.format = limitText(format, files);
    if (Object.keys(errs).length) {
      job.setFields(errs);
      return;
    }
    const base = { format, include_files: files, emails: delivery === 'email' ? list : undefined };
    const body = !usingFilters ? { ...base, ids } : { ...base, ...api.expenseQuery(query) };
    job.run(delivery, () => (register ? api.exportInwardRegister(body) : api.exportExpenses(scope, body)), list, onClose);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={register ? 'Export the goods inward register' : 'Export expenses'}
      footer={<DeliveryFooter emailOpen={emailOpen} busy={job.busy} disabled={noMatch} onCancel={onClose} onDownload={() => submit('download')} onEmail={() => submit('email')} />}
    >
      <div className="space-y-5">
        {hasSelection && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Which expenses">
            <OptionCard selected={!onlySelected} onClick={() => { setOnlySelected(false); clearField('format', 'filters', 'ids'); }} title="All matching filters" description="Every expense that matches the filters below" />
            <OptionCard selected={onlySelected} onClick={() => { setOnlySelected(true); clearField('format', 'filters', 'ids'); }} title={`Selected expenses (${ids.length})`} description="Only the rows checked in the list" />
          </div>
        )}

        {usingFilters && (
          <section aria-label="Filters">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-fg">Filters</h3>
              <button
                type="button"
                onClick={() => {
                  // The company comes from the page's picker and is not shown here: it stays.
                  setF((cur) => ({ ...emptyFilters('all'), subOrgId: cur.subOrgId }));
                  setSpender(null);
                  reset();
                }}
                className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline"
              >
                Reset filters
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!register && <SelectField<ExpenseTab> label="Status" value={f.tab === 'all' ? null : f.tab} onChange={(v) => set({ tab: v ?? 'all' }, 'status')} options={statusOptions} placeholder="All statuses" error={err('status')} />}
              {register ? (
                <SelectField<'waiting' | 'partial' | 'received'>
                  label="Goods"
                  value={inward as 'waiting' | 'partial' | 'received' | null}
                  onChange={(v) => set({ inward: v || null }, 'inward')}
                  options={INWARD_FILTERS.filter((o) => o.value === 'waiting' || o.value === 'partial' || o.value === 'received') as Array<{ value: 'waiting' | 'partial' | 'received'; label: string }>}
                  placeholder="Received"
                  error={err('inward')}
                />
              ) : (
                <SelectField<'' | 'pending' | 'received' | 'receivable' | 'none'>
                  label="Paper bill"
                  value={f.physical}
                  onChange={(physical) => set({ physical: physical || null }, 'physical')}
                  options={PHYSICAL_FILTERS.filter((o) => o.value !== '') as Array<{ value: 'pending' | 'received' | 'receivable' | 'none'; label: string }>}
                  placeholder="All"
                  error={err('physical')}
                />
              )}
              <ComboField label="Wallet" value={f.walletId} onChange={(walletId) => set({ walletId }, 'wallet_id')} options={lists.wallets} allLabel="All wallets" error={err('wallet_id')} />
              {hr && <ComboField label="Site" value={f.siteId} onChange={(siteId) => set({ siteId }, 'site_id')} options={lists.sites} allLabel="All sites" error={err('site_id')} />}
              <ComboField label="Category" value={f.categoryId} onChange={(categoryId) => set({ categoryId }, 'category_id')} options={lists.categories} allLabel="All categories" error={err('category_id')} />
              <SelectField<PaymentMode> label="Payment mode" value={f.paymentMode} onChange={(paymentMode) => set({ paymentMode }, 'payment_mode')} options={[...PAYMENT_MODES]} placeholder="All" error={err('payment_mode')} />
              {hr && (
                <div className="sm:col-span-2">
                  <EmployeePicker label="Spent by" required={false} value={spender ? [spender] : []} onChange={(v) => { setSpender(v[v.length - 1] ?? null); clearField('spent_by', 'filters', 'format'); }} error={err('spent_by')} />
                </div>
              )}
              <DateRangeFields label="Expense date" from={f.from} to={f.to} onChange={(from, to) => set({ from, to }, 'from', 'to')} fromError={err('from')} toError={err('to', dateErr)} />
              <TextField label="Smallest amount" inputMode="decimal" prefix="₹" value={f.minAmount} onChange={(v) => set({ minAmount: parseDecimal(v) }, 'min_amount')} error={err('min_amount')} />
              <TextField label="Largest amount" inputMode="decimal" prefix="₹" value={f.maxAmount} onChange={(v) => set({ maxAmount: parseDecimal(v) }, 'max_amount')} error={err('max_amount', amountErr)} />
              <div className="sm:col-span-2">
                <ToggleRow title="Only flagged expenses" description="Expenses the checks flagged: duplicates, limits, bill mismatches." checked={f.flagged} onChange={(flagged) => set({ flagged }, 'flagged')} />
              </div>
              <div className="sm:col-span-2">
                <TextField label="Search" value={f.search} onChange={(search) => set({ search }, 'search')} placeholder="Merchant, number, bill or inward number" error={err('search')} />
              </div>
            </div>

            <div className="mt-4 space-y-1 border-t border-line pt-3" aria-live="polite">
              {match.loading || (count === null && !match.error && !dateErr && !amountErr) ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                  Counting…
                </p>
              ) : noMatch ? (
                <p className="text-sm font-semibold text-[var(--tt-danger)]">No expenses match — change the filters</p>
              ) : count !== null ? (
                <p className="text-sm font-semibold text-fg">{plural(count, 'expense matches', 'expenses match')}</p>
              ) : null}
              {match.error && <p className="text-xs font-medium text-[var(--tt-danger)]">{match.error}</p>}
              {job.fields.filters && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{job.fields.filters}</p>}
              {overLimit && !job.fields.format && <p className="text-xs text-fg-muted">{limitText(format, files)}</p>}
            </div>
          </section>
        )}

        {!usingFilters && <p className="text-sm text-fg-muted">{plural(ids.length, 'expense', 'expenses')} checked in the list.</p>}
        {job.fields.ids && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{job.fields.ids}</p>}

        <div className="space-y-3">
          <FormatField
            value={format}
            onChange={(v) => { setFormat(v); clearField('format'); }}
            error={job.fields.format}
            hint={
              format === 'pdf'
                ? `Each expense laid out like an invoice. Up to ${EXPORT_PDF_LIMIT}.`
                : `One sheet with category bands, wallet, seller, GST, inward number and totals. Up to ${(files ? EXPORT_XLSX_PHOTO_LIMIT : EXPORT_XLSX_LIMIT).toLocaleString('en-IN')}${files ? ' with photos' : ''}.`
            }
          />
          {!register && <ToggleRow title="Include bill photos and payment proofs" description={FILES_HELP[format]} checked={files} onChange={(v) => { setFiles(v); clearField('format'); }} />}
          {emailOpen && <EmailsField value={emails} onChange={(v) => { setEmails(v); clearField('emails'); }} error={job.fields.emails} onHide={() => { setEmailOpen(false); clearField('emails'); }} inputRef={emailRef} />}
        </div>
        <FormError message={job.form} />
      </div>
    </Dialog>
  );
}

interface ExportExpensesDialogProps {
  open: boolean;
  onClose: () => void;
  scope: 'hr' | 'me';
  initial?: Partial<ExpenseFilters>;
  /** Rows checked on the page. */
  ids?: number[];
}

/** Exports expenses through the Download Centre: every filter inside the dialog, a live count, Download or email. */
export function ExportExpensesDialog(props: ExportExpensesDialogProps) {
  return <ExportFiltersDialog {...props} kind="expenses" />;
}

/** Exports the inward register (`petty-cash-inward-register`). */
export function ExportInwardDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Partial<ExpenseFilters> }) {
  return <ExportFiltersDialog open={open} onClose={onClose} kind="register" scope="hr" initial={initial} />;
}

'use client';

import React from 'react';
import { ChevronDown, FileDown, FileSpreadsheet, FileText, Mail } from 'lucide-react';
import { cx } from '@/theme/tokens';
import { Combobox, type ComboboxOption } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { FieldLabel, FieldMessage, OptionCard, SelectField, TextField } from '@/components/ui/FormControls';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import { listDepartments } from '@/features/departments/api/departments.api';
import { useDownloadCenter } from '@/features/downloads/context/DownloadCenterContext';
import { listSites } from '@/features/sites/api/sites.api';
import { monthRange, orgMonth } from '@/lib/datetime';
import { messageOf } from '@/lib/api/errors';
import { showError } from '@/lib/toast';
import * as api from '../../api/reimbursement.api';
import {
  EXPORT_PDF_CLAIM_LIMIT,
  EXPORT_PDF_WALLET_LIMIT,
  EXPORT_PHYSICAL_OPTIONS,
  EXPORT_XLSX_CLAIM_LIMIT,
  EXPORT_XLSX_PHOTO_CLAIM_LIMIT,
  PAYMENT_MODES,
} from '../../constants/reimbursement.constants';
import { useClaimMatchCount } from '../../hooks/useClaimMatchCount';
import { useExpenseFeatures } from '../../hooks/useExpenseFeatures';
import type { ClaimsExportRequestDto, ExportFormatDto } from '../../types/reimbursement.dto';
import type { Category, Channel, PaymentMode, PayoutMode } from '../../types/reimbursement.model';
import { categoryOptions } from './LineEditor';
import { DateRangeFields, DeliveryFooter, EmailsField, FILES_HELP, FormatField, parseEmails, plural, ToggleRow, useExportJob, type Delivery } from '@/features/expense-bills/components/ExportParts';
import { FormError } from './Primitives';

const END_BEFORE_START = 'The end date is before the start date';

// ── Claims ──────────────────────────────────────────────────────────────────

/** Everything the export dialog can filter on. Empty string / null = any. */
export interface ClaimExportFilters {
  status: string;
  channel: Channel | null;
  payoutMode: PayoutMode | null;
  paymentMode: PaymentMode | null;
  categoryId: number | null;
  departmentId: number | null;
  siteId: number | null;
  employee: CompEmployeeDto | null;
  physical: 'pending' | 'collected' | 'optional' | null;
  /** Expense (line) date. */
  spentFrom: string;
  spentTo: string;
  /** Bill (invoice) date. */
  billFrom: string;
  billTo: string;
  /** Submitted on. */
  from: string;
  to: string;
  search: string;
}

const EMPTY_FILTERS: ClaimExportFilters = {
  status: '',
  channel: null,
  payoutMode: null,
  paymentMode: null,
  categoryId: null,
  departmentId: null,
  siteId: null,
  employee: null,
  physical: null,
  spentFrom: '',
  spentTo: '',
  billFrom: '',
  billTo: '',
  from: '',
  to: '',
  search: '',
};

/** Date pairs: state keys and the API (error) keys. */
const DATE_PAIRS = [
  ['spentFrom', 'spentTo', 'spent_from', 'spent_to'],
  ['billFrom', 'billTo', 'bill_from', 'bill_to'],
  ['from', 'to', 'from', 'to'],
] as const;

const PLACED_CLAIM_FIELDS = new Set([
  'status', 'channel', 'payout_mode', 'payment_mode', 'category_id', 'department_id', 'site_id', 'employee_id', 'physical',
  'from', 'to', 'spent_from', 'spent_to', 'bill_from', 'bill_to', 'search', 'format', 'emails', 'filters', 'ids',
]);

function dateErrors(f: ClaimExportFilters): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [a, b, , toKey] of DATE_PAIRS) if (f[a] && f[b] && f[a] > f[b]) out[toKey] = END_BEFORE_START;
  return out;
}

function toListParams(f: ClaimExportFilters, scope: 'hr' | 'me'): api.ClaimFilterParams {
  const hr = scope === 'hr';
  return {
    status: f.status || 'all',
    channel: f.channel,
    payoutMode: f.payoutMode,
    paymentMode: f.paymentMode,
    categoryId: f.categoryId,
    departmentId: hr ? f.departmentId : null,
    siteId: hr ? f.siteId : null,
    employeeId: hr ? f.employee?.id ?? null : null,
    physical: f.physical,
    from: f.from,
    to: f.to,
    spentFrom: f.spentFrom,
    spentTo: f.spentTo,
    billFrom: f.billFrom,
    billTo: f.billTo,
    search: f.search.trim(),
  };
}

function toExportBody(f: ClaimExportFilters, scope: 'hr' | 'me'): Omit<ClaimsExportRequestDto, 'format'> {
  const p = toListParams(f, scope);
  return {
    status: p.status === 'all' ? undefined : p.status,
    channel: p.channel || undefined,
    payout_mode: p.payoutMode || undefined,
    payment_mode: p.paymentMode || undefined,
    category_id: p.categoryId ?? undefined,
    department_id: p.departmentId ?? undefined,
    site_id: p.siteId ?? undefined,
    employee_id: p.employeeId ?? undefined,
    physical: p.physical || undefined,
    from: p.from || undefined,
    to: p.to || undefined,
    spent_from: p.spentFrom || undefined,
    spent_to: p.spentTo || undefined,
    bill_from: p.billFrom || undefined,
    bill_to: p.billTo || undefined,
    search: p.search || undefined,
  };
}

function claimLimit(format: ExportFormatDto, files: boolean) {
  if (format === 'pdf') return EXPORT_PDF_CLAIM_LIMIT;
  return files ? EXPORT_XLSX_PHOTO_CLAIM_LIMIT : EXPORT_XLSX_CLAIM_LIMIT;
}

function claimLimitText(format: ExportFormatDto, files: boolean) {
  const big = EXPORT_XLSX_CLAIM_LIMIT.toLocaleString('en-IN');
  if (format === 'pdf') return `A PDF holds up to ${EXPORT_PDF_CLAIM_LIMIT} expenses. Narrow the filters, or choose Excel without photos (up to ${big}).`;
  if (files) return `Excel with photos holds up to ${EXPORT_XLSX_PHOTO_CLAIM_LIMIT} expenses. Turn off photos (up to ${big}) or narrow the filters.`;
  return `Excel holds up to ${big} expenses. Narrow the filters.`;
}

/** Sites and departments for the HR filters, loaded only while the dialog is open. */
function useOrgOptions(enabled: boolean, subOrgId: number | null) {
  const [opts, setOpts] = React.useState<{ sites: ComboboxOption[]; departments: ComboboxOption[] }>({ sites: [], departments: [] });
  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    Promise.allSettled([listSites({ pageSize: 200, subOrgId }), listDepartments({ pageSize: 200, subOrgId })]).then(([s, d]) => {
      if (cancelled) return;
      setOpts({
        sites: s.status === 'fulfilled' ? (s.value.sites || []).map((x) => ({ value: x.id, label: x.name })) : [],
        departments: d.status === 'fulfilled' ? (d.value.departments || []).map((x) => ({ value: x.id, label: x.name })) : [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, subOrgId]);
  return opts;
}

function ComboField({ label, value, onChange, options, allLabel, error }: { label: string; value: number | null; onChange: (v: number | null) => void; options: ComboboxOption[]; allLabel: string; error?: string }) {
  return (
    <div>
      <FieldLabel label={label} />
      <Combobox
        options={options}
        value={value}
        onChange={(v) => onChange(v === null ? null : Number(v))}
        placeholder={allLabel}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
        ariaLabel={label}
        invalid={Boolean(error)}
      />
      <FieldMessage error={error} />
    </div>
  );
}

interface ExportClaimsDialogProps {
  open: boolean;
  onClose: () => void;
  /** `hr` → `expense-claims`; `me` → `my-expenses` (own claims; no department, site or employee filters). */
  scope: 'hr' | 'me';
  /** The page's filters, shown (and editable) in the dialog. */
  initial?: Partial<ClaimExportFilters>;
  /** Sub-company of the page (HR). */
  subOrgId?: number | null;
  categories?: Category[];
  /** Rows checked on the page; offers "Selected claims (N)". */
  selectedIds?: number[];
  /** One claim: no filters, `ids:[id]`. */
  claim?: { id: number; number?: string };
  initialFormat?: ExportFormatDto;
  /** Open with the email field showing. */
  startWithEmail?: boolean;
}

export function ExportClaimsDialog({ open, onClose, scope, initial, subOrgId = null, categories = [], selectedIds = [], claim, initialFormat, startWithEmail = false }: ExportClaimsDialogProps) {
  const features = useExpenseFeatures();
  const job = useExportJob(PLACED_CLAIM_FIELDS);
  const { reset, clearField } = job;
  const hr = scope === 'hr';
  const claimId = claim?.id ?? null;
  const hasSelection = selectedIds.length > 0 && claimId === null;
  const [f, setF] = React.useState<ClaimExportFilters>(EMPTY_FILTERS);
  const [onlySelected, setOnlySelected] = React.useState(false);
  const [moreDates, setMoreDates] = React.useState(false);
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
    const start = { ...EMPTY_FILTERS, ...initialRef.current };
    reset();
    setF(start);
    setMoreDates(Boolean(start.from || start.to));
    setOnlySelected(hasSelection);
    setFormat(initialFormat ?? (claimId !== null || scope === 'me' || hasSelection ? 'pdf' : 'xlsx'));
    setFiles(true);
    setEmailOpen(startWithEmail);
    setEmails('');
  }, [open, reset, hasSelection, initialFormat, claimId, scope, startWithEmail]);

  React.useEffect(() => {
    if (open && emailOpen) emailRef.current?.focus();
  }, [open, emailOpen]);

  const usingFilters = !claim && !(hasSelection && onlySelected);
  const dateErrs = React.useMemo(() => dateErrors(f), [f]);
  const countParams = open && usingFilters && !Object.keys(dateErrs).length ? toListParams(f, scope) : null;
  const match = useClaimMatchCount(scope, countParams, hr ? subOrgId : null);
  const orgOptions = useOrgOptions(open && hr && usingFilters, subOrgId);
  const catOptions = React.useMemo(() => categoryOptions(categories), [categories]);

  const count = claim ? 1 : !usingFilters ? selectedIds.length : match.count;
  const limit = claimLimit(format, files);
  const overLimit = count !== null && count > limit;
  const noMatch = usingFilters && match.count === 0 && !match.loading;
  const err = (key: string) => dateErrs[key] || job.fields[key] || (usingFilters ? match.fields[key] : '') || undefined;

  const set = (patch: Partial<ClaimExportFilters>, ...keys: string[]) => {
    setF((cur) => ({ ...cur, ...patch }));
    clearField(...keys, 'filters', 'format');
  };
  const setRange = (fromKey: keyof ClaimExportFilters, toKey: keyof ClaimExportFilters, apiFrom: string, apiTo: string) => (from: string, to: string) =>
    set({ [fromKey]: from, [toKey]: to } as Partial<ClaimExportFilters>, apiFrom, apiTo);

  const statusOptions = [
    ...(scope === 'me' ? [{ value: 'draft', label: 'Draft' }] : []),
    { value: 'pending', label: 'Waiting for approval' },
    { value: 'approved', label: 'Approved' },
    ...(features.claims ? [{ value: 'to_pay', label: 'To be paid' }, { value: 'paid', label: 'Paid' }] : []),
    { value: 'rejected', label: 'Rejected' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const submit = (delivery: Delivery) => {
    if (delivery === 'email' && !emailOpen) {
      setEmailOpen(true);
      return;
    }
    const errs: Record<string, string> = usingFilters ? { ...dateErrs } : {};
    let list: string[] = [];
    if (delivery === 'email') {
      const parsed = parseEmails(emails);
      list = parsed.emails;
      if (parsed.error) errs.emails = parsed.error;
    }
    if (overLimit) errs.format = claimLimitText(format, files);
    if (Object.keys(errs).length) {
      job.setFields(errs);
      return;
    }
    const base: ClaimsExportRequestDto = { format, include_files: files, emails: delivery === 'email' ? list : undefined };
    const body: ClaimsExportRequestDto = claim
      ? { ...base, ids: [claim.id] }
      : !usingFilters
        ? { ...base, ids: selectedIds }
        : { ...base, ...toExportBody(f, scope), subOrgId: hr ? subOrgId ?? undefined : undefined };
    job.run(delivery, () => api.exportClaims(scope, body), list, onClose);
  };

  const title = claim ? `Export expense${claim.number ? ` ${claim.number}` : ''}` : 'Export expenses';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      title={title}
      footer={<DeliveryFooter emailOpen={emailOpen} busy={job.busy} disabled={noMatch} onCancel={onClose} onDownload={() => submit('download')} onEmail={() => submit('email')} />}
    >
      <div className="space-y-5">
        {hasSelection && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Which expenses">
            <OptionCard selected={!onlySelected} onClick={() => { setOnlySelected(false); clearField('format', 'filters', 'ids'); }} title="All matching filters" description="Every expense that matches the filters below" />
            <OptionCard selected={onlySelected} onClick={() => { setOnlySelected(true); clearField('format', 'filters', 'ids'); }} title={`Selected claims (${selectedIds.length})`} description="Only the rows checked in the list" />
          </div>
        )}

        {usingFilters && (
          <section aria-label="Filters">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-fg">Filters</h3>
              <button
                type="button"
                onClick={() => {
                  setF(EMPTY_FILTERS);
                  setMoreDates(false);
                  reset();
                }}
                className="text-xs font-semibold text-fg-muted underline-offset-2 hover:text-fg hover:underline"
              >
                Reset filters
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField label="Status" value={f.status || null} onChange={(v) => set({ status: v ?? '' }, 'status')} options={statusOptions} placeholder="All statuses" error={err('status')} />
              {features.claims && features.wallet && (
                <SelectField<Channel>
                  label="Paid from"
                  value={f.channel}
                  onChange={(channel) => set({ channel }, 'channel')}
                  options={[{ value: 'wallet', label: 'Wallet' }, { value: 'claim', label: 'Claim (own money)' }]}
                  placeholder="All"
                  error={err('channel')}
                />
              )}
              {features.claims && (
                <SelectField<PayoutMode>
                  label="Payout"
                  value={f.payoutMode}
                  onChange={(payoutMode) => set({ payoutMode }, 'payout_mode')}
                  options={[{ value: 'manual', label: 'By Accounts' }, { value: 'payroll', label: 'With payroll' }]}
                  placeholder="All"
                  error={err('payout_mode')}
                />
              )}
              <SelectField<PaymentMode> label="Payment mode" value={f.paymentMode} onChange={(paymentMode) => set({ paymentMode }, 'payment_mode')} options={[...PAYMENT_MODES]} placeholder="All" error={err('payment_mode')} />
              <ComboField label="Category" value={f.categoryId} onChange={(categoryId) => set({ categoryId }, 'category_id')} options={catOptions} allLabel="All categories" error={err('category_id')} />
              <SelectField<'pending' | 'collected' | 'optional'>
                label="Paper bill"
                value={f.physical}
                onChange={(physical) => set({ physical }, 'physical')}
                options={[...EXPORT_PHYSICAL_OPTIONS]}
                placeholder="All"
                error={err('physical')}
              />
              {hr && (
                <>
                  <ComboField label="Department" value={f.departmentId} onChange={(departmentId) => set({ departmentId }, 'department_id')} options={orgOptions.departments} allLabel="All departments" error={err('department_id')} />
                  <ComboField label="Site" value={f.siteId} onChange={(siteId) => set({ siteId }, 'site_id')} options={orgOptions.sites} allLabel="All sites" error={err('site_id')} />
                  <div className="sm:col-span-2">
                    <EmployeePicker label="Employee" required={false} value={f.employee ? [f.employee] : []} onChange={(v) => set({ employee: v[v.length - 1] ?? null }, 'employee_id')} error={err('employee_id')} />
                  </div>
                </>
              )}
              <DateRangeFields label="Expense date" from={f.spentFrom} to={f.spentTo} onChange={setRange('spentFrom', 'spentTo', 'spent_from', 'spent_to')} fromError={err('spent_from')} toError={err('spent_to')} />
              <DateRangeFields label="Bill date" from={f.billFrom} to={f.billTo} onChange={setRange('billFrom', 'billTo', 'bill_from', 'bill_to')} fromError={err('bill_from')} toError={err('bill_to')} />
              <div className="sm:col-span-2">
                <button
                  type="button"
                  aria-expanded={moreDates}
                  onClick={() => setMoreDates((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-fg-muted hover:text-fg"
                >
                  <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', moreDates && 'rotate-180')} aria-hidden />
                  More dates
                </button>
              </div>
              {moreDates && <DateRangeFields label="Submitted" from={f.from} to={f.to} onChange={setRange('from', 'to', 'from', 'to')} fromError={err('from')} toError={err('to')} />}
              <div className="sm:col-span-2">
                <TextField label="Search" value={f.search} onChange={(search) => set({ search }, 'search')} placeholder={hr ? 'Name, code, title or bill number' : 'Title or bill number'} error={err('search')} />
              </div>
            </div>

            <div className="mt-4 space-y-1 border-t border-line pt-3" aria-live="polite">
              {match.loading || (count === null && !match.error && !Object.keys(dateErrs).length) ? (
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
              {overLimit && !job.fields.format && <p className="text-xs text-fg-muted">{claimLimitText(format, files)}</p>}
            </div>
          </section>
        )}

        {claim && <p className="text-sm text-fg-muted">This expense with its lines, bills, payment and history.</p>}
        {!usingFilters && !claim && <p className="text-sm text-fg-muted">{plural(selectedIds.length, 'expense', 'expenses')} checked in the list.</p>}
        {job.fields.ids && <p role="alert" className="text-xs font-medium text-[var(--tt-danger)]">{job.fields.ids}</p>}

        <div className="space-y-3">
          <FormatField
            value={format}
            onChange={(v) => { setFormat(v); clearField('format'); }}
            error={job.fields.format}
            hint={format === 'pdf' ? `Each expense laid out like an invoice. Up to ${EXPORT_PDF_CLAIM_LIMIT}.` : `Sheets of expenses, lines and bill items. Up to ${(files ? EXPORT_XLSX_PHOTO_CLAIM_LIMIT : EXPORT_XLSX_CLAIM_LIMIT).toLocaleString('en-IN')}${files ? ' with photos' : ''}.`}
          />
          <ToggleRow title="Include bill photos and payment proofs" description={FILES_HELP[format]} checked={files} onChange={(v) => { setFiles(v); clearField('format'); }} />
          {emailOpen && <EmailsField value={emails} onChange={(v) => { setEmails(v); clearField('emails'); }} error={job.fields.emails} onHide={() => { setEmailOpen(false); clearField('emails'); }} inputRef={emailRef} />}
        </div>
        <FormError message={job.form} />
      </div>
    </Dialog>
  );
}

// ── Wallet statement ────────────────────────────────────────────────────────

const PLACED_STATEMENT_FIELDS = new Set(['from', 'to', 'wallet_id', 'format', 'emails']);

interface ExportStatementDialogProps {
  open: boolean;
  onClose: () => void;
  /** `hr` → `expense-wallet-statement`; `me` → `my-expense-wallet`. */
  scope: 'hr' | 'me';
  /** HR: start with this wallet picked. */
  walletId?: number;
  employeeName?: string;
  /** HR: how many wallets there are (for the PDF limit when all are picked). */
  walletCount?: number;
  subOrgId?: number | null;
}

export function ExportStatementDialog({ open, onClose, scope, walletId, employeeName, walletCount, subOrgId = null }: ExportStatementDialogProps) {
  const job = useExportJob(PLACED_STATEMENT_FIELDS);
  const { reset, clearField } = job;
  const hr = scope === 'hr';
  const [format, setFormat] = React.useState<ExportFormatDto>('pdf');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [which, setWhich] = React.useState<'all' | 'one'>('all');
  const [wallet, setWallet] = React.useState<number | null>(null);
  const [walletOptions, setWalletOptions] = React.useState<ComboboxOption[]>([]);
  const [walletTerm, setWalletTerm] = React.useState('');
  const [walletsLoading, setWalletsLoading] = React.useState(false);
  const [expenses, setExpenses] = React.useState(true);
  const [files, setFiles] = React.useState(true);
  const [emailOpen, setEmailOpen] = React.useState(false);
  const [emails, setEmails] = React.useState('');
  const emailRef = React.useRef<HTMLInputElement>(null);
  const preset = React.useRef<ComboboxOption | null>(null);
  preset.current = walletId ? { value: walletId, label: employeeName || `Wallet #${walletId}` } : null;

  React.useEffect(() => {
    if (!open) return;
    reset();
    const month = monthRange(orgMonth());
    setFormat('pdf');
    setFrom(month.from);
    setTo(month.to);
    setWhich(walletId ? 'one' : 'all');
    setWallet(walletId ?? null);
    setWalletTerm('');
    setExpenses(true);
    setFiles(true);
    setEmailOpen(false);
    setEmails('');
  }, [open, reset, walletId]);

  React.useEffect(() => {
    if (open && emailOpen) emailRef.current?.focus();
  }, [open, emailOpen]);

  // Wallet search (HR, "One wallet").
  React.useEffect(() => {
    if (!open || !hr || which !== 'one') return;
    let cancelled = false;
    setWalletsLoading(true);
    const t = setTimeout(() => {
      api
        .listWallets({ search: walletTerm.trim(), subOrgId, sort: 'name', page: 1, pageSize: 25 })
        .then((dto) => {
          if (cancelled) return;
          const found = (dto.items || []).map((w) => ({ value: w.id, label: w.employee?.name || `Wallet #${w.id}`, description: w.employee?.code || undefined }));
          const keep = preset.current && !found.some((o) => o.value === preset.current?.value) ? [preset.current] : [];
          setWalletOptions([...keep, ...found]);
        })
        .catch(() => !cancelled && setWalletOptions(preset.current ? [preset.current] : []))
        .finally(() => !cancelled && setWalletsLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, hr, which, walletTerm, subOrgId]);

  const rangeError = from && to && from > to ? END_BEFORE_START : '';
  const allWallets = hr && which === 'all';
  const overLimit = allWallets && format === 'pdf' && walletCount !== undefined && walletCount > EXPORT_PDF_WALLET_LIMIT;
  const limitText = `A PDF holds up to ${EXPORT_PDF_WALLET_LIMIT} wallets; there are ${(walletCount ?? 0).toLocaleString('en-IN')}. Choose Excel or one wallet.`;

  const submit = (delivery: Delivery) => {
    if (delivery === 'email' && !emailOpen) {
      setEmailOpen(true);
      return;
    }
    const errs: Record<string, string> = {};
    if (rangeError) errs.to = rangeError;
    if (hr && which === 'one' && !wallet) errs.wallet_id = 'Pick a wallet';
    if (overLimit) errs.format = limitText;
    let list: string[] = [];
    if (delivery === 'email') {
      const parsed = parseEmails(emails);
      list = parsed.emails;
      if (parsed.error) errs.emails = parsed.error;
    }
    if (Object.keys(errs).length) {
      job.setFields(errs);
      return;
    }
    job.run(
      delivery,
      () =>
        api.exportWalletStatement(scope, {
          format,
          from: from || undefined,
          to: to || undefined,
          include_expenses: expenses,
          include_files: expenses ? files : false,
          wallet_id: hr && which === 'one' ? wallet ?? undefined : undefined,
          emails: delivery === 'email' ? list : undefined,
        }),
      list,
      onClose
    );
  };

  const formatHint = format === 'pdf' ? `Opening, added, spent and closing balance, every entry, then the expenses.${allWallets ? ` Up to ${EXPORT_PDF_WALLET_LIMIT} wallets.` : ''}` : 'Sheets of wallets and entries, plus the expenses with their lines and bill items.';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      title={hr ? 'Wallet statement' : 'Download statement'}
      footer={<DeliveryFooter emailOpen={emailOpen} busy={job.busy} onCancel={onClose} onDownload={() => submit('download')} onEmail={() => submit('email')} />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <DateRangeFields
            label="Dated"
            from={from}
            to={to}
            onChange={(a, b) => { setFrom(a); setTo(b); clearField('from', 'to'); }}
            fromError={job.fields.from}
            toError={rangeError || job.fields.to}
          />
        </div>
        {hr && (
          <div className="space-y-2">
            <FieldLabel label="Wallets" />
            <SegmentedControl<'all' | 'one'>
              options={[{ value: 'all', label: 'All wallets' }, { value: 'one', label: 'One wallet' }]}
              value={which}
              onChange={(v) => { setWhich(v); clearField('wallet_id', 'format'); }}
            />
            {which === 'one' && (
              <div>
                <Combobox
                  options={walletOptions}
                  value={wallet}
                  onChange={(v) => { setWallet(v === null ? null : Number(v)); clearField('wallet_id'); }}
                  onSearch={setWalletTerm}
                  loading={walletsLoading}
                  placeholder="Pick a wallet"
                  searchPlaceholder="Search employee name or code…"
                  emptyLabel="No wallets match"
                  ariaLabel="Wallet"
                  invalid={Boolean(job.fields.wallet_id)}
                />
                <FieldMessage error={job.fields.wallet_id} />
              </div>
            )}
          </div>
        )}
        <FormatField value={format} onChange={(v) => { setFormat(v); clearField('format'); }} error={job.fields.format} hint={overLimit ? limitText : formatHint} />
        <ToggleRow title="Include expenses" description="Each wallet expense in these dates, with its lines and bills." checked={expenses} onChange={setExpenses} />
        <ToggleRow
          title="Include bill photos and payment proofs"
          description={expenses ? FILES_HELP[format] : 'Turn on “Include expenses” to add their files.'}
          checked={expenses && files}
          onChange={setFiles}
          disabled={!expenses}
        />
        {emailOpen && <EmailsField value={emails} onChange={(v) => { setEmails(v); clearField('emails'); }} error={job.fields.emails} onHide={() => { setEmailOpen(false); clearField('emails'); }} inputRef={emailRef} />}
        <FormError message={job.form} />
      </div>
    </Dialog>
  );
}

// ── One claim ───────────────────────────────────────────────────────────────

/** "Download PDF" on a claim: a single-claim PDF with its files, tracked in Downloads. */
function useClaimPdf(scope: 'hr' | 'me') {
  const { track } = useDownloadCenter();
  const [busy, setBusy] = React.useState(false);
  const download = async (id: number) => {
    setBusy(true);
    try {
      track(await api.exportClaims(scope, { format: 'pdf', ids: [id], include_files: true }));
    } catch (err) {
      showError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, download };
}

const splitBase =
  'inline-flex h-9 items-center justify-center gap-1.5 border border-line bg-surface text-xs font-semibold text-fg transition-colors hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm';

/** One-click "Download PDF" plus a menu: PDF… / Excel… / Email… opening the export dialog for this claim. */
export function ClaimExportButton({ scope, claimId, number }: { scope: 'hr' | 'me'; claimId: number; number?: string }) {
  const pdf = useClaimPdf(scope);
  const [menu, setMenu] = React.useState(false);
  const [dialog, setDialog] = React.useState<{ format: ExportFormatDto; email: boolean } | null>(null);
  const root = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menu) return;
    const onDown = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setMenu(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const items: Array<{ key: string; label: string; icon: React.ReactNode; pick: { format: ExportFormatDto; email: boolean } }> = [
    { key: 'pdf', label: 'PDF…', icon: <FileText className="h-4 w-4" />, pick: { format: 'pdf', email: false } },
    { key: 'xlsx', label: 'Excel…', icon: <FileSpreadsheet className="h-4 w-4" />, pick: { format: 'xlsx', email: false } },
    { key: 'email', label: 'Email…', icon: <Mail className="h-4 w-4" />, pick: { format: 'pdf', email: true } },
  ];

  return (
    <div ref={root} className="relative inline-flex">
      <button type="button" disabled={pdf.busy} onClick={() => pdf.download(claimId)} className={cx(splitBase, 'rounded-l-lg px-3.5')}>
        {pdf.busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <FileDown className="h-3.5 w-3.5" />}
        Download PDF
      </button>
      <button type="button" aria-label="More export options" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)} className={cx(splitBase, '-ml-px rounded-r-lg px-2')}>
        <ChevronDown className={cx('h-3.5 w-3.5 transition-transform', menu && 'rotate-180')} />
      </button>
      {menu && (
        <div role="menu" className="tt-fade-in absolute right-0 top-full z-30 mt-1.5 w-44 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[var(--tt-shadow-lg)]">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                setDialog(it.pick);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-fg transition-colors hover:bg-bg-subtle"
            >
              <span className="text-fg-muted">{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
      <ExportClaimsDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        scope={scope}
        claim={{ id: claimId, number }}
        initialFormat={dialog?.format}
        startWithEmail={dialog?.email ?? false}
      />
    </div>
  );
}

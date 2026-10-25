'use client';

import React from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import { ReceiptPicker } from '@/features/expense-bills/components/ReceiptPicker';
import { ReceiptScanZone } from '@/features/expense-bills/components/ReceiptScanZone';
import { StepHeader, type Step } from '@/features/expense-bills/components/StepHeader';
import { FlagList } from '@/features/expense-bills/components/Flags';
import type { ReceiptFile, ReceiptSource } from '@/features/expense-bills/hooks/useFileLink';
import { scanPagesProblem, useBillScan } from '@/features/expense-bills/hooks/useBillScan';
import { MAX_LINE_FILES } from '@/features/expense-bills/constants/bill.constants';
import type { LineAttachment } from '@/features/expense-bills/types/bill.model';
import { placeErrors } from '@/features/expense-bills/utils/errors';
import { useRemote } from '@/features/reimbursement/hooks/useRemote';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/petty-cash.api';
import { PC_AI_FEATURE } from '../../constants/petty-cash.constants';
import { useAttachmentStore } from '../../hooks/useAttachmentStore';
import { useExpensePreview } from '../../hooks/useExpensePreview';
import { useMyOverview } from '../../hooks/useMyOverview';
import { applyScan, emptyExpense, isBlankExpense, toCategory, toExpenseBody, toExpenseDetail, toWallet } from '../../types/petty-cash.mapper';
import type { Category, ExpenseDetail, ExpenseInput, ExpenseScan, Wallet } from '../../types/petty-cash.model';
import { money, walletRoomText } from '../../utils/format';
import {
  DetailsStep,
  PaperBillNotice,
  PaymentStep,
  ReviewCard,
  WalletPicker,
  paperNeed,
  receiptRule,
  stepOfField,
  validateDetails,
  validatePayment,
  validateWalletStep,
  walletBlock,
  type Errors,
} from './ExpenseSteps';
import { FormError } from './Primitives';

const KNOWN = ['wallet_id', 'category_id', 'expense_date', 'amount', 'merchant', 'description', 'purpose', 'invoice_no', 'receipts', 'payment_mode', 'payment_reference', 'payment_proofs', 'spent_by', 'bill'];

export interface ExpenseFormDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: (detail: ExpenseDetail) => void;
  mode: 'me' | 'hr';
  /** Wallet to start with. */
  walletId?: number | null;
}

/** Fields a preview error may show on while the user is still typing (blank fields stay quiet until Next). */
function livePreviewErrors(errors: Errors, input: ExpenseInput): Errors {
  const blank: Record<string, boolean> = { wallet_id: !input.walletId, category_id: !input.categoryId, expense_date: !input.expenseDate, amount: !(Number(input.amount) > 0) };
  return Object.fromEntries(Object.entries(errors).filter(([k, v]) => v && !blank[k]));
}

/**
 * New petty cash expense as steps: 1 Bill (wallet, then scan or enter by hand) → 2 Details & items →
 * 3 Payment → 4 Review & submit. One bill is one expense. HR (`mode` hr) enters it for an employee.
 */
export function ExpenseFormDrawer({ open, onClose, onSaved, mode, walletId = null }: ExpenseFormDrawerProps) {
  const { hasFeature } = useFeatures();
  const scope = mode === 'hr' ? 'hr' : 'me';

  const mine = useMyOverview(open && mode === 'me');
  const hrFetcher = React.useCallback(async () => {
    const [w, c] = await Promise.all([api.listWallets({ status: 'active', page: 1, pageSize: 100 }), api.listCategories()]);
    const cats = Array.isArray(c) ? c : c.items || [];
    return { wallets: (w.items || []).map(toWallet), categories: cats.map(toCategory) };
  }, []);
  const hr = useRemote(open && mode === 'hr' ? hrFetcher : null, 'pc-hr-form');
  const wallets: Wallet[] = React.useMemo(() => (mode === 'me' ? mine.data?.wallets ?? [] : hr.data?.wallets ?? []), [mode, mine.data, hr.data]);
  const categories: Category[] = React.useMemo(() => (mode === 'me' ? mine.data?.categories ?? [] : hr.data?.categories ?? []), [mode, mine.data, hr.data]);
  const loading = mode === 'me' ? mine.isLoading : hr.isLoading;
  const loadError = mode === 'me' ? mine.error : hr.error;
  const today = (mode === 'me' && mine.data?.today) || orgToday();
  const receiptScan = mode === 'me' ? Boolean(mine.data?.receiptScan) : hasFeature(PC_AI_FEATURE);

  const [step, setStep] = React.useState<Step>(1);
  const [input, setInput] = React.useState<ExpenseInput>(() => emptyExpense(orgToday()));
  const [employee, setEmployee] = React.useState<CompEmployeeDto[]>([]);
  const [pages, setPages] = React.useState<File[]>([]);
  const [scan, setScan] = React.useState<ExpenseScan | null>(null);
  const [scanError, setScanError] = React.useState('');
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [uploads, setUploads] = React.useState<Record<string, boolean>>({});
  const bodyRef = React.useRef<HTMLDivElement>(null);

  // Files uploaded from this browser are previewed from the local copy: stored key → object URL.
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  const previewUrls = React.useRef<string[]>([]);
  const rememberFile = React.useCallback((key: string, file: File) => {
    const url = URL.createObjectURL(file);
    previewUrls.current.push(url);
    setPreviews((p) => ({ ...p, [key]: url }));
  }, []);
  React.useEffect(
    () => () => {
      previewUrls.current.forEach((u) => URL.revokeObjectURL(u));
      previewUrls.current = [];
    },
    []
  );

  const employeeId = mode === 'hr' ? employee[0]?.id ?? null : null;
  // HR's uploads go into the spender's folder: the expense refuses files stored anywhere else.
  const store = useAttachmentStore(scope, employeeId);
  const readScan = React.useCallback((files: File[], signal: AbortSignal) => api.scanReceipt(files, scope, employeeId, signal), [scope, employeeId]);
  const scanner = useBillScan(readScan);
  const { cancel: cancelScan } = scanner;

  // Start blank each time the drawer opens.
  React.useEffect(() => {
    cancelScan();
    if (!open) return;
    previewUrls.current.forEach((u) => URL.revokeObjectURL(u));
    previewUrls.current = [];
    setPreviews({});
    setInput(emptyExpense(orgToday(), walletId));
    setEmployee([]);
    setPages([]);
    setScan(null);
    setScanError('');
    setErrors({});
    setFormError('');
    setUploads({});
    setStep(1);
    // Reset only when the drawer opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Preselect the wallet: the one asked for, or the only one that can be used.
  React.useEffect(() => {
    if (!open || input.walletId) return;
    const usable = wallets.filter((w) => !walletBlock(w));
    const pick = (walletId && usable.find((w) => w.id === walletId)) || (usable.length === 1 ? usable[0] : null);
    if (pick) setInput((i) => (i.walletId ? i : { ...i, walletId: pick.id }));
  }, [open, wallets, walletId, input.walletId]);

  // A single category is chosen for the user.
  React.useEffect(() => {
    if (open && categories.length === 1) setInput((i) => (i.categoryId ? i : { ...i, categoryId: categories[0].id }));
  }, [open, categories]);

  React.useEffect(() => {
    bodyRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
  }, [step]);

  const wallet = wallets.find((w) => w.id === input.walletId) ?? null;
  const category = categories.find((c) => c.id === input.categoryId);
  const amount = Number(input.amount) || 0;
  const needsEmployee = mode === 'hr' && !employee[0];

  // ── Live preview ──────────────────────────────────────────────────────────
  const withEmployee = React.useMemo<ExpenseInput>(() => ({ ...input, spentBy: employeeId }), [input, employeeId]);
  const previewBody = React.useMemo(() => {
    if (mode === 'hr' && !employeeId) return null;
    if (!input.walletId || !input.categoryId || !input.expenseDate) return null;
    return toExpenseBody(withEmployee);
  }, [mode, employeeId, input.walletId, input.categoryId, input.expenseDate, withEmployee]);
  const { preview, isLoading: previewing } = useExpensePreview(previewBody, open, scope);
  const shownErrors = React.useMemo<Errors>(() => ({ ...livePreviewErrors(preview?.errors ?? {}, input), ...errors }), [preview, input, errors]);

  const need = paperNeed(wallet, amount, preview);
  const position = preview?.wallet ?? (wallet ? { balance: wallet.balance, held: wallet.held, available: wallet.available, spendable: wallet.spendable } : null);
  const room = position ? position.spendable : null;
  const after = position ? position.available - amount : null;
  const overLimit = position !== null && room !== null && amount > room;

  // ── Editing ───────────────────────────────────────────────────────────────
  const clearError = React.useCallback((field: string) => setErrors((e) => (e[field] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== field)) : e)), []);
  const patch = (p: Partial<ExpenseInput>) => setInput((i) => ({ ...i, ...p }));
  const setBusyFor = React.useCallback((key: string, v: boolean) => setUploads((u) => (u[key] === v ? u : { ...u, [key]: v })), []);
  const onBillBusy = React.useCallback((v: boolean) => setBusyFor('bill', v), [setBusyFor]);
  const onProofBusy = React.useCallback((v: boolean) => setBusyFor('proof', v), [setBusyFor]);
  const uploading = Object.values(uploads).some(Boolean);

  const receipts = React.useMemo(() => {
    const toFile = (a: LineAttachment, i: number, kind: 'b' | 'p'): ReceiptFile => {
      const local = a.key ? previews[a.key] : undefined;
      const source: ReceiptSource | null = local ? { kind: 'local', url: local } : null;
      return { id: `${kind}-${a.key ?? `old-${a.index}`}-${i}`, name: a.name, size: a.size, type: a.type, source };
    };
    return { bills: input.receipts.map((a, i) => toFile(a, i, 'b')), proofs: input.paymentProofs.map((a, i) => toFile(a, i, 'p')) };
  }, [input.receipts, input.paymentProofs, previews]);

  const walletStepErrors = () => validateWalletStep(input, needsEmployee);

  const scanBill = async () => {
    const found = walletStepErrors();
    if (Object.keys(found).length) {
      setErrors((e) => ({ ...e, ...found }));
      return;
    }
    const problem = scanPagesProblem(pages);
    if (problem) return setScanError(problem);
    setScanError('');
    const outcome = await scanner.scan(pages);
    if (!outcome) return;
    if (!outcome.ok) {
      setScanError(`Could not scan it: ${outcome.message.trim().replace(/[.!]*$/, '.')} Try again or enter it manually.`);
      return;
    }
    const dto = outcome.dto;
    const stored = dto.expense?.receipts?.length ? dto.expense.receipts : dto.attachments || [];
    if (stored.length === pages.length) stored.forEach((f, i) => f.key && rememberFile(f.key, pages[i]));
    // Scanning again replaces what the last scan filled.
    const base = scan ? { ...emptyExpense(input.expenseDate, input.walletId, input.categoryId), paymentProofs: input.paymentProofs, paymentReference: input.paymentReference, spentBy: input.spentBy } : input;
    const applied = applyScan(base, dto, (id) => categories.some((c) => c.id === id));
    setInput(applied.input);
    setScan(applied.scan);
    setPages([]);
    setStep(2);
  };

  const next = () => {
    if (step === 1) {
      const found = walletStepErrors();
      setErrors((e) => ({ ...e, ...found }));
      if (!Object.keys(found).length) {
        setScanError('');
        setStep(2);
      }
      return;
    }
    if (step === 2) {
      const found = validateDetails(input, today);
      setErrors((e) => ({ ...e, ...found }));
      if (!Object.keys(found).length) setStep(3);
      return;
    }
    if (step === 3) {
      const found = validatePayment(input);
      setErrors((e) => ({ ...e, ...found }));
      if (!Object.keys(found).length) setStep(4);
    }
  };

  const back = () => {
    if (step === 2 && isBlankExpense(input) && !pages.length) setScan(null);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const save = async () => {
    const found = { ...walletStepErrors(), ...validateDetails(input, today), ...validatePayment(input), ...Object.fromEntries(Object.entries(preview?.errors ?? {}).filter(([, v]) => v)) };
    setErrors(found);
    setFormError('');
    const keys = Object.keys(found);
    if (keys.length) {
      setStep(Math.min(...keys.map((k) => stepOfField(k))) as Step);
      return;
    }
    setBusy(true);
    try {
      const body = toExpenseBody(withEmployee);
      const dto = mode === 'hr' ? await api.createExpense(body) : await api.createMyExpense(body);
      showSuccess(mode === 'hr' ? 'Expense entered' : 'Expense submitted');
      onSaved(toExpenseDetail(dto));
    } catch (err) {
      const placed = placeErrors(err, (k) => KNOWN.includes(k));
      setErrors(placed.fields);
      setFormError(placed.form);
      const fields = Object.keys(placed.fields);
      setStep(fields.length ? (Math.min(...fields.map((k) => stepOfField(k))) as Step) : 4);
    } finally {
      setBusy(false);
    }
  };

  const noWallets = !loading && !loadError && wallets.length === 0;
  const noCategories = !loading && !loadError && wallets.length > 0 && categories.length === 0;
  const blocked = busy || scanner.scanning;
  const showScan = receiptScan && categories.length > 0;
  const rule = receiptRule(wallet, amount);

  const stepOne = (
    <div className="space-y-4">
      {mode === 'hr' && (
        <EmployeePicker
          value={employee}
          onChange={(v) => {
            // Files already stored are in the previous employee's folder: they cannot go on this one's expense.
            if ((v[0]?.id ?? null) !== employeeId && (input.receipts.length || input.paymentProofs.length)) patch({ receipts: [], paymentProofs: [] });
            setEmployee(v);
            clearError('spent_by');
          }}
          error={shownErrors.spent_by}
          label="Spent by"
        />
      )}
      <WalletPicker wallets={wallets} value={input.walletId} onChange={(id) => { patch({ walletId: id }); clearError('wallet_id'); }} error={shownErrors.wallet_id} />
      {showScan ? (
        <ReceiptScanZone
          pages={pages}
          onPagesChange={(p) => {
            setPages(p);
            setScanError('');
          }}
          scanning={scanner.scanning}
          onScan={scanBill}
          onManual={next}
          disabled={needsEmployee || !input.walletId}
          disabledHint={needsEmployee ? 'Choose the employee first so the bill goes into their folder.' : 'Choose the wallet first.'}
          error={scanError}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-fg-muted sm:text-sm">Attach a photo or PDF of the bill, then fill in the details.</p>
          {!needsEmployee && (
            <ReceiptPicker
              label="Bill copies"
              value={input.receipts}
              onChange={(r) => patch({ receipts: r })}
              max={MAX_LINE_FILES}
              required={rule.required}
              store={store}
              onBusyChange={onBillBusy}
              onUploaded={rememberFile}
              addLabel="Attach the bill"
            />
          )}
        </div>
      )}
    </div>
  );

  const review = (
    <div className="tt-fade-in space-y-4">
      {mode === 'hr' && (
        <p className="text-xs text-fg-muted sm:text-sm">
          Entering for <span className="font-semibold text-fg">{employee[0]?.name ?? 'no employee chosen'}</span>
        </p>
      )}
      <ReviewCard input={input} wallet={wallet} category={category} preview={preview} errors={shownErrors} onEdit={(s) => setStep(s)} receipts={receipts} />
      <PaperBillNotice need={need} />
      <div className="rounded-xl border border-line bg-bg-subtle/60 p-3 sm:p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold text-fg-muted">Total {previewing && <span className="font-normal">· checking…</span>}</span>
          <span className="text-xl font-extrabold tabular-nums text-fg">{money(amount)}</span>
        </div>
        {wallet && position && after !== null && (
          <div className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
            <div className="flex justify-between gap-3 text-fg-muted">
              <span>{wallet.name} available now</span>
              <span className="tabular-nums">{money(position.available)}</span>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <span className="text-fg">After this expense</span>
              <span className={after < 0 ? 'tabular-nums text-[var(--tt-danger)]' : 'tabular-nums text-fg'}>{money(after)}</span>
            </div>
            <p className="text-fg-muted">{walletRoomText(wallet, money)}.</p>
            {overLimit && <p className="font-medium text-[var(--tt-danger)]">This is more than the wallet allows.</p>}
          </div>
        )}
        {preview && preview.flags.length > 0 && (
          <div className="mt-2 border-t border-line pt-2">
            <FlagList flags={preview.flags} compact />
          </div>
        )}
      </div>
    </div>
  );

  let body: React.ReactNode;
  if (loading) body = <div aria-hidden className="h-40 animate-pulse rounded-xl bg-bg-subtle" />;
  else if (loadError) body = <p role="alert" className="text-sm font-medium text-[var(--tt-danger)]">{loadError}</p>;
  else if (noWallets) body = <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-fg-muted">{mode === 'hr' ? 'There are no active petty cash wallets yet.' : 'You cannot spend from any petty cash wallet yet.'}</p>;
  else if (noCategories) body = <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-fg-muted">No expense categories are set up for petty cash yet. Add them under Petty cash, Categories.</p>;
  else if (step === 1) body = stepOne;
  else if (step === 2)
    body = (
      <DetailsStep
        input={input}
        wallet={wallet}
        categories={categories}
        errors={shownErrors}
        today={today}
        preview={preview}
        previewing={previewing}
        scan={scan}
        store={store}
        onChange={patch}
        onClearError={clearError}
        onBusyChange={onBillBusy}
        receipts={receipts}
        onLocalFile={rememberFile}
      />
    );
  else if (step === 3) body = <PaymentStep input={input} errors={shownErrors} store={store} onChange={patch} onClearError={clearError} onBusyChange={onProofBusy} onLocalFile={rememberFile} />;
  else body = review;

  const unusable = noWallets || noCategories || Boolean(loadError) || loading;
  const stepOneNext = step === 1 && (!showScan || !isBlankExpense(input) || input.receipts.length > 0);

  return (
    <Drawer open={open} onClose={onClose} title={mode === 'hr' ? 'New expense for an employee' : 'New expense'} maxWidthClassName="sm:max-w-4xl">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 4) save();
          else next();
        }}
        className="flex min-h-full flex-col gap-4"
      >
        <div ref={bodyRef}>{!unusable && <StepHeader step={step} bill={null} />}</div>
        <div key={step} className="flex-1">
          {body}
        </div>
        <FormError message={formError} />
        <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:-mb-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step === 1 ? <Btn onClick={onClose}>Cancel</Btn> : <Btn onClick={back} disabled={blocked}>Back</Btn>}
          {!unusable &&
            (step === 4 ? (
              <Btn type="submit" variant="primary" busy={busy} disabled={uploading || scanner.scanning}>
                {mode === 'hr' ? 'Enter expense' : 'Submit'}
              </Btn>
            ) : step === 1 ? (
              stepOneNext && (
                <Btn type="submit" variant="primary" disabled={blocked || uploading}>
                  Next
                </Btn>
              )
            ) : (
              <Btn type="submit" variant="primary" disabled={blocked || uploading}>
                {step === 3 ? 'Review' : 'Next'}
              </Btn>
            ))}
        </div>
      </form>
    </Drawer>
  );
}

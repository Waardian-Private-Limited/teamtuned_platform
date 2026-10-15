'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
import { OptionCard, SelectField, TextField } from '@/components/ui/FormControls';
import { Textarea } from '@/components/ui/Textarea';
import { Btn } from '@/features/compensation/components/shared/Buttons';
import { EmployeePicker } from '@/features/compensation/components/shared/EmployeePicker';
import type { CompEmployeeDto } from '@/features/compensation/types/compensation.dto';
import { orgToday } from '@/lib/datetime';
import { showSuccess } from '@/lib/toast';
import * as api from '../../api/reimbursement.api';
import { CHANNEL_HELP, MAX_LINES, MAX_LINE_FILES, PAYOUT_MODE_LABEL } from '../../constants/reimbursement.constants';
import { useClaimPreview } from '../../hooks/useClaimPreview';
import { scanPagesProblem, useReceiptScan } from '../../hooks/useReceiptScan';
import { applyScan, emptyLine, isBlankLine, lineInputOf, toClaimBody, toClaimDetail } from '../../types/reimbursement.mapper';
import type { Category, Channel, ClaimDetail, ClaimFormErrors, ClaimPreviewLine, LineAttachment, LineInput, MyWallet, PayoutMode } from '../../types/reimbursement.model';
import type { ReceiptFile, ReceiptSource } from '../../hooks/useFileLink';
import { placeErrors } from '../../utils/errors';
import { belowZeroText, money, walletRoom, walletRoomText } from '../../utils/format';
import { validateClaim, validateLineDetails, validateLinePayment, validateReport } from '../../utils/validators';
import { BillReviewCard, PaymentStep, StepHeader, type Step } from './ExpenseSteps';
import { LineDetails, lineAmount, receiptRule } from './LineEditor';
import { FlagList } from './StatusBadges';
import { FormError } from './Primitives';
import { ReceiptPicker } from './ReceiptPicker';
import { ReceiptScanZone } from './ReceiptScanZone';

const HEADER_FIELDS = ['title', 'purpose', 'channel', 'lines', 'employee_id', 'payout_mode'];
const isKnownKey = (k: string) => HEADER_FIELDS.includes(k) || /^lines\[\d+\]\.[a-z_]+$/.test(k);
/** Lines complete enough for the live preview. */
const previewable = (l: LineInput) => Boolean(l.categoryId && l.expenseDate);

interface BaseProps {
  open: boolean;
  onClose: () => void;
  onSaved: (detail: ClaimDetail) => void;
  categories: Category[];
  /** AI receipt scan is on (employee: `policy.receipt_scan`; HR: overview `features.ai`). */
  receiptScan?: boolean;
}

interface SelfProps extends BaseProps {
  mode: 'me';
  channels: Channel[];
  wallet: MyWallet | null;
  today: string;
  /** A draft being edited. */
  draft?: ClaimDetail | null;
}

interface HrProps extends BaseProps {
  mode: 'hr';
  /** Channels the org offers (the employee may still lack a wallet; the API says so). */
  channels: Channel[];
}

export type ExpenseFormDrawerProps = SelfProps | HrProps;

/** Drops the errors under `prefix` (and the listed keys), then adds `next`. */
function replaceErrors(prev: ClaimFormErrors, prefix: string, keys: string[], next: ClaimFormErrors): ClaimFormErrors {
  const kept = Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(prefix) && !keys.includes(k)));
  return { ...kept, ...next };
}

/**
 * New expense (or a draft, or HR filing for an employee) as steps, one bill at a time:
 * 1 Bill (scan its pages, or enter it by hand) → 2 Details & items → 3 Payment → 4 Review & submit.
 * The review lists every bill of the report; "Add another bill" starts step 1 again.
 */
export function ExpenseFormDrawer(props: ExpenseFormDrawerProps) {
  const { open, onClose, onSaved, categories, mode, channels, receiptScan = false } = props;
  const today = mode === 'me' ? props.today || orgToday() : orgToday();
  const draft = mode === 'me' ? props.draft ?? null : null;
  const wallet = mode === 'me' ? props.wallet : null;
  const scope = mode === 'hr' ? 'hr' : 'me';

  const [step, setStep] = React.useState<Step>(1);
  const [activeUid, setActiveUid] = React.useState<string | null>(null);
  const [pages, setPages] = React.useState<File[]>([]);
  const [scanError, setScanError] = React.useState('');
  const [channel, setChannel] = React.useState<Channel>(channels[0] ?? 'claim');
  const [title, setTitle] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [lines, setLines] = React.useState<LineInput[]>([]);
  const [employee, setEmployee] = React.useState<CompEmployeeDto[]>([]);
  const [payoutMode, setPayoutMode] = React.useState<PayoutMode | null>(null);
  const [errors, setErrors] = React.useState<ClaimFormErrors>({});
  const [formError, setFormError] = React.useState('');
  const [busy, setBusy] = React.useState<'draft' | 'submit' | null>(null);
  const [uploads, setUploads] = React.useState<Record<string, boolean>>({});
  const bodyRef = React.useRef<HTMLDivElement>(null);
  // Files uploaded from this browser, previewed from the local copy: stored key → object URL.
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

  const activeCategories = React.useMemo(() => categories.filter((c) => c.status === 'active'), [categories]);
  const byId = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const kindOf = React.useCallback((id: number | null) => (id && byId.get(id)?.kind === 'distance' ? 'distance' : 'amount') as 'amount' | 'distance', [byId]);
  const defaultCategory = activeCategories.length === 1 ? activeCategories[0].id : null;
  const employeeId = mode === 'hr' ? employee[0]?.id ?? null : null;
  const scanner = useReceiptScan(scope, employeeId);
  // A scan may only pick a category this form offers.
  const offeredKind = React.useCallback((id: number) => activeCategories.find((c) => c.id === id)?.kind ?? null, [activeCategories]);

  React.useEffect(() => {
    scanner.cancel();
    if (!open) return;
    previewUrls.current.forEach((u) => URL.revokeObjectURL(u));
    previewUrls.current = [];
    setPreviews({});
    setErrors({});
    setFormError('');
    setUploads({});
    setEmployee([]);
    setPayoutMode(null);
    setPages([]);
    setScanError('');
    if (draft) {
      setChannel(channels.includes(draft.channel) ? draft.channel : channels[0] ?? 'claim');
      setTitle(draft.title);
      setPurpose(draft.purpose || '');
      const ls = draft.lines.length ? draft.lines.map(lineInputOf) : [emptyLine(today)];
      setLines(ls);
      setActiveUid(draft.lines.length ? null : ls[0].uid);
      setStep(draft.lines.length ? 4 : 2);
    } else {
      const first = emptyLine(today, defaultCategory);
      setChannel(channels[0] ?? 'claim');
      setTitle('');
      setPurpose('');
      setLines([first]);
      setActiveUid(first.uid);
      setStep(1);
    }
    // Reset only when the drawer opens or switches to another draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft?.id]);

  // Each step starts at the top.
  React.useEffect(() => {
    bodyRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
  }, [step, activeUid]);

  // Files already on a reopened draft are shown through its stored links.
  const draftFiles = React.useMemo(() => {
    const byObject = new WeakMap<LineAttachment, ReceiptSource>();
    const byKey = new Map<string, ReceiptSource>();
    draft?.lines.forEach((l) => {
      const add = (a: LineAttachment, payment: boolean) => {
        const src: ReceiptSource = { kind: 'remote', scope: 'me', claimId: draft.id, lineId: l.id, index: a.index, payment };
        byObject.set(a, src);
        if (a.key) byKey.set(`${payment ? 'p' : 'b'}:${a.key}`, src);
      };
      l.attachments.forEach((a) => add(a, false));
      l.paymentProofs.forEach((a) => add(a, true));
    });
    return { byObject, byKey };
  }, [draft]);
  const receiptsOf = React.useCallback(
    (line: LineInput) => {
      const toFile = (a: LineAttachment, i: number, payment: boolean): ReceiptFile => {
        const local = a.key ? previews[a.key] : undefined;
        const source: ReceiptSource | null = local
          ? { kind: 'local', url: local }
          : draftFiles.byObject.get(a) ?? (a.key ? draftFiles.byKey.get(`${payment ? 'p' : 'b'}:${a.key}`) : undefined) ?? null;
        return { id: `${payment ? 'p' : 'b'}-${a.key ?? `old-${a.index}`}-${i}`, name: a.name, size: a.size, type: a.type, source };
      };
      return { bills: line.attachments.map((a, i) => toFile(a, i, false)), proofs: line.paymentProofs.map((a, i) => toFile(a, i, true)) };
    },
    [previews, draftFiles]
  );

  const activeIndex = lines.findIndex((l) => l.uid === activeUid);
  const active = activeIndex >= 0 ? lines[activeIndex] : null;

  // ── Live preview ──────────────────────────────────────────────────────────
  const input = React.useMemo(() => ({ channel, title, purpose, lines }), [channel, title, purpose, lines]);
  const hrPayout = mode === 'hr' && channel === 'claim' && payoutMode ? payoutMode : undefined;
  const previewBody = React.useMemo(() => {
    // HR previews for the chosen employee (their policy and limits).
    if (mode === 'hr' && !employeeId) return null;
    const usable = lines.filter(previewable);
    if (!usable.length) return null;
    return toClaimBody({ ...input, title: input.title || 'Draft', lines: usable }, kindOf, mode === 'hr' && employeeId ? { employeeId, payoutMode: hrPayout } : {});
  }, [mode, lines, input, kindOf, employeeId, hrPayout]);
  const { preview, isLoading: previewing } = useClaimPreview(previewBody, draft?.id ?? null, open, scope);

  // Preview lines line up with the lines that were sent (complete ones only).
  const previewByUid = React.useMemo(() => {
    const map = new Map<string, ClaimPreviewLine>();
    if (!preview) return map;
    lines.filter(previewable).forEach((l, i) => preview.lines[i] && map.set(l.uid, preview.lines[i]));
    return map;
  }, [preview, lines]);

  const localTotal = lines.reduce((s, l) => s + lineAmount(l, byId.get(l.categoryId ?? 0), previewByUid.get(l.uid) ?? null), 0);
  const total = preview && preview.lines.length && preview.lines.length === lines.length ? preview.total : Math.round(localTotal * 100) / 100;
  const isUploading = Object.values(uploads).some(Boolean);
  const showScan = receiptScan && activeCategories.length > 0;
  const noCategories = activeCategories.length === 0;
  const needsEmployee = mode === 'hr' && !employee[0];

  // ── Editing ───────────────────────────────────────────────────────────────
  const clearError = (key: string) => setErrors((e) => (e[key] ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== key)) : e));
  const updateLine = (uid: string, patch: Partial<LineInput>) => setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  const setBusyFor = React.useCallback((key: string, v: boolean) => setUploads((u) => (u[key] === v ? u : { ...u, [key]: v })), []);
  const busyHandlers = React.useMemo(() => {
    const cache = new Map<string, (v: boolean) => void>();
    return (key: string) => {
      if (!cache.has(key)) cache.set(key, (v: boolean) => setBusyFor(key, v));
      return cache.get(key) as (v: boolean) => void;
    };
  }, [setBusyFor]);

  const startBill = () => {
    if (lines.length >= MAX_LINES) return;
    const line = emptyLine(lines[lines.length - 1]?.expenseDate || today, defaultCategory);
    setLines((ls) => [...ls, line]);
    setActiveUid(line.uid);
    setPages([]);
    setScanError('');
    setFormError('');
    setStep(1);
  };

  const removeLine = (uid: string) => {
    setLines((ls) => ls.filter((l) => l.uid !== uid));
    setUploads((u) => Object.fromEntries(Object.entries(u).filter(([k]) => !k.endsWith(uid))));
    if (activeUid === uid) setActiveUid(null);
    // Line errors are keyed by position, which just changed.
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith('lines['))));
  };

  const edit = (uid: string, to: Step) => {
    setActiveUid(uid);
    setStep(to);
  };

  const scanBill = async () => {
    if (!active) return;
    const problem = scanPagesProblem(pages);
    if (problem) {
      setScanError(problem);
      return;
    }
    setScanError('');
    const uid = active.uid;
    const outcome = await scanner.scan(pages);
    if (!outcome) return;
    if (!outcome.ok) {
      setScanError(`Could not scan it: ${outcome.message.trim().replace(/[.!]*$/, '.')} Try again or enter it manually.`);
      return;
    }
    const dto = outcome.dto;
    // The stored pages come back in the order sent: preview each from the browser copy.
    const stored = dto.line?.attachments?.length ? dto.line.attachments : dto.attachments?.length ? dto.attachments : dto.attachment ? [dto.attachment] : [];
    if (stored.length === pages.length) stored.forEach((f, i) => f.key && rememberFile(f.key, pages[i]));
    setLines((ls) =>
      ls.map((l) => {
        if (l.uid !== uid) return l;
        // Scanning again replaces what the last scan filled.
        const base = l.scan ? { ...emptyLine(l.expenseDate, l.categoryId), uid: l.uid, paymentProofs: l.paymentProofs, paymentReference: l.paymentReference } : l;
        return applyScan(base, dto, offeredKind);
      })
    );
    if (dto.read && dto.title?.trim()) {
      const scanned = dto.title.trim().slice(0, 150);
      setTitle((t) => (t.trim() ? t : scanned));
    }
    if (dto.read && dto.purpose?.trim()) {
      const scanned = dto.purpose.trim().slice(0, 1000);
      setPurpose((p) => (p.trim() ? p : scanned));
    }
    setPages([]);
    clearError('lines');
    setStep(2);
  };

  const enterManually = () => {
    if (needsEmployee) {
      setErrors((e) => ({ ...e, employee_id: 'Choose the employee' }));
      return;
    }
    setScanError('');
    setStep(2);
  };

  const next = () => {
    if (step === 1) return enterManually();
    if (!active) return;
    const prefix = `lines[${activeIndex}].`;
    if (step === 2) {
      const report = activeIndex === 0 ? validateReport({ title, purpose }) : {};
      const found = { ...validateLineDetails(active, activeIndex, byId, today, true), ...report };
      setErrors((e) => replaceErrors(e, prefix, activeIndex === 0 ? ['title', 'purpose'] : [], found));
      if (!Object.keys(found).length) setStep(3);
      return;
    }
    if (step === 3) {
      const found = validateLinePayment(active, activeIndex);
      setErrors((e) => ({ ...Object.fromEntries(Object.entries(e).filter(([k]) => !k.startsWith(`${prefix}payment_`))), ...found }));
      if (!Object.keys(found).length) {
        setActiveUid(null);
        setStep(4);
      }
    }
  };

  const back = () => {
    if (step === 2) return setStep(1);
    if (step === 3) return setStep(2);
    if (step === 4) {
      const last = lines[lines.length - 1];
      if (last) edit(last.uid, 3);
      return;
    }
    // Step 1 of another bill: back to the review, dropping the bill if nothing was entered.
    if (active && isBlankLine(active) && !pages.length) removeLine(active.uid);
    setActiveUid(null);
    setPages([]);
    setStep(4);
  };

  const save = async (submit: boolean) => {
    const found = validateClaim(input, byId, today, submit);
    if (mode === 'hr' && !employee[0]) found.employee_id = 'Choose the employee';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(submit ? 'submit' : 'draft');
    try {
      let dto;
      if (mode === 'hr') {
        dto = await api.createClaim(toClaimBody(input, kindOf, { submit: true, employeeId: employee[0].id, payoutMode: channel === 'claim' && payoutMode ? payoutMode : undefined }));
      } else if (draft) {
        dto = await api.updateMyClaim(draft.id, toClaimBody(input, kindOf, { submit }));
      } else {
        dto = await api.createMyClaim(toClaimBody(input, kindOf, { submit }));
      }
      showSuccess(submit ? (mode === 'hr' ? 'Expense filed' : 'Expense submitted') : 'Draft saved');
      onSaved(toClaimDetail(dto));
    } catch (err) {
      const placed = placeErrors(err, isKnownKey);
      setErrors(placed.fields);
      setFormError(placed.form);
      setStep(4);
      setActiveUid(null);
    } finally {
      setBusy(null);
    }
  };

  const walletAfter = wallet && channel === 'wallet' ? (preview?.wallet?.available ?? wallet.available) - total : null;
  // The expense must fit in available + room (room 0 = stops at zero, null = no limit).
  const room = wallet ? walletRoom(wallet) : 0;
  const overLimit = wallet && walletAfter !== null && room !== null ? walletAfter < -room : false;

  const reportFields = (
    <div className="space-y-3">
      <TextField label="Title" required value={title} onChange={(v) => { setTitle(v); clearError('title'); }} placeholder="e.g. Client visit, Pune" maxLength={150} error={errors.title} />
      <Textarea label="Purpose" value={purpose} onChange={(e) => { setPurpose(e.target.value); clearError('purpose'); }} rows={2} placeholder="Why these expenses were needed" maxLength={1000} error={errors.purpose} />
    </div>
  );

  const busyKey = (kind: 'bill' | 'proof', uid: string) => `${kind}:${uid}`;
  const lineBusy = active ? Boolean(uploads[busyKey('bill', active.uid)] || uploads[busyKey('proof', active.uid)]) : false;

  // ── Steps ─────────────────────────────────────────────────────────────────
  const stepOne = active && (
    <div className="space-y-4">
      {mode === 'hr' && lines.length <= 1 && <EmployeePicker value={employee} onChange={(v) => { setEmployee(v); clearError('employee_id'); }} error={errors.employee_id} />}
      {showScan ? (
        <ReceiptScanZone
          pages={pages}
          onPagesChange={(p) => { setPages(p); setScanError(''); }}
          scanning={scanner.scanning}
          onScan={scanBill}
          onManual={enterManually}
          disabled={needsEmployee}
          disabledHint="Choose the employee first so the bill goes into their folder."
          error={scanError}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-fg-muted sm:text-sm">Attach a photo or PDF of the bill, then fill in the details.</p>
          {!needsEmployee && (
          <ReceiptPicker
            label="Bill copies"
            value={active.attachments}
            onChange={(attachments) => updateLine(active.uid, { attachments })}
            max={MAX_LINE_FILES}
            required={receiptRule(byId.get(active.categoryId ?? 0), Number(active.amount) || 0).required}
            scope={scope}
            employeeId={employeeId}
            onBusyChange={busyHandlers(busyKey('bill', active.uid))}
            onUploaded={rememberFile}
            addLabel="Attach the bill"
          />
          )}
          {needsEmployee && <p className="text-[11px] text-fg-muted">Choose the employee first so the bill goes into their folder.</p>}
        </div>
      )}
    </div>
  );

  const stepTwo = active && (
    <LineDetails
      key={active.uid}
      index={activeIndex}
      line={active}
      categories={activeCategories}
      errors={errors}
      today={today}
      preview={previewByUid.get(active.uid) ?? null}
      previewing={previewing && previewable(active)}
      uploadScope={scope}
      employeeId={employeeId}
      onChange={(patch) => updateLine(active.uid, patch)}
      onClearError={clearError}
      onBusyChange={busyHandlers(busyKey('bill', active.uid))}
      receipts={receiptsOf(active)}
      onLocalFile={rememberFile}
    >
      {activeIndex === 0 && reportFields}
    </LineDetails>
  );

  const stepThree = active && (
    <PaymentStep
      key={active.uid}
      index={activeIndex}
      line={active}
      errors={errors}
      uploadScope={scope}
      employeeId={employeeId}
      onChange={(patch) => updateLine(active.uid, patch)}
      onClearError={clearError}
      onBusyChange={busyHandlers(busyKey('proof', active.uid))}
      onLocalFile={rememberFile}
    />
  );

  const stepFour = (
    <div className="tt-fade-in space-y-5">
      {mode === 'hr' && (
        <div>
          <p className="text-xs text-fg-muted sm:text-sm">
            Filing for <span className="font-semibold text-fg">{employee[0]?.name ?? 'no employee chosen'}</span>
          </p>
          <FormError message={errors.employee_id} className="mt-1" />
        </div>
      )}
      {reportFields}

      {channels.length > 1 && (
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg sm:text-[13px]">How was it paid for</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <OptionCard
              selected={channel === 'wallet'}
              onClick={() => { setChannel('wallet'); clearError('channel'); }}
              title="From the expense wallet"
              description={wallet ? `${money(wallet.available)} available` : CHANNEL_HELP.wallet}
            />
            <OptionCard selected={channel === 'claim'} onClick={() => { setChannel('claim'); clearError('channel'); }} title="With my own money" description={mode === 'hr' ? 'Paid back to the employee' : CHANNEL_HELP.claim} />
          </div>
          <FormError message={errors.channel} className="mt-1.5" />
        </div>
      )}

      {mode === 'hr' && channel === 'claim' && (
        <SelectField<PayoutMode>
          label="Paid back"
          value={payoutMode}
          onChange={setPayoutMode}
          options={(['manual', 'payroll'] as PayoutMode[]).map((m) => ({ value: m, label: PAYOUT_MODE_LABEL[m] }))}
          placeholder="As the employee’s policy says"
          error={errors.payout_mode}
        />
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-fg sm:text-[13px]">
          {lines.length} {lines.length === 1 ? 'bill' : 'bills'}
        </p>
        <ul className="space-y-3">
          {lines.map((l, i) => (
            <BillReviewCard
              key={l.uid}
              index={i}
              line={l}
              category={byId.get(l.categoryId ?? 0)}
              preview={previewByUid.get(l.uid) ?? null}
              errors={errors}
              onEdit={(to) => edit(l.uid, to)}
              onRemove={lines.length > 1 ? () => removeLine(l.uid) : null}
              receipts={receiptsOf(l)}
            />
          ))}
        </ul>
        <FormError message={errors.lines} className="mt-2" />
        {lines.length < MAX_LINES && (
          <button
            type="button"
            onClick={startBill}
            disabled={scanner.scanning}
            className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong text-xs font-semibold text-fg-muted transition-colors hover:border-fg hover:text-fg disabled:opacity-40 sm:text-sm"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add another bill
          </button>
        )}
      </div>

      <div className="rounded-xl border border-line bg-bg-subtle/60 p-3 sm:p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold text-fg-muted">Total {previewing && <span className="font-normal">· checking…</span>}</span>
          <span className="text-xl font-extrabold tabular-nums text-fg">{money(total)}</span>
        </div>
        {wallet && channel === 'wallet' && walletAfter !== null && (
          <div className="mt-2 space-y-1 border-t border-line pt-2 text-xs">
            <div className="flex justify-between gap-3 text-fg-muted">
              <span>Wallet available now</span>
              <span className="tabular-nums">{money(preview?.wallet?.available ?? wallet.available)}</span>
            </div>
            <div className="flex justify-between gap-3 font-semibold">
              <span className="text-fg">After this expense</span>
              <span className={walletAfter < 0 ? 'tabular-nums text-[var(--tt-danger)]' : 'tabular-nums text-fg'}>{money(walletAfter)}</span>
            </div>
            {wallet.belowZero > 0 && <p className="font-medium text-[var(--tt-danger)]">{belowZeroText(wallet.belowZero, money)}.</p>}
            <p className="text-fg-muted">{walletRoomText(wallet, money)}{room === 0 ? '.' : '; the next top-up covers it.'}</p>
            {overLimit && <p className="font-medium text-[var(--tt-danger)]">This is more than your wallet allows. Submit it as a claim or ask for funds.</p>}
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

  const body = noCategories ? (
    <p className="rounded-lg border border-dashed border-line-strong p-4 text-sm text-fg-muted">
      {mode === 'hr' ? 'No expense categories are set up yet. Add them under Categories.' : 'No expense categories are available under your policy yet.'}
    </p>
  ) : step === 1 ? (
    stepOne
  ) : step === 2 ? (
    stepTwo
  ) : step === 3 ? (
    stepThree
  ) : (
    stepFour
  );

  const scanning = scanner.scanning;
  const blocked = Boolean(busy) || scanning;
  const stepOneNext = step === 1 && (!showScan || (active && !isBlankLine(active)));

  return (
    <Drawer open={open} onClose={onClose} title={draft ? 'Edit draft' : mode === 'hr' ? 'New expense for an employee' : 'New expense'} maxWidthClassName="sm:max-w-4xl">
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 4) save(true);
          else next();
        }}
        className="flex min-h-full flex-col gap-4"
      >
        <div ref={bodyRef}>{!noCategories && <StepHeader step={step} bill={step < 4 && activeIndex >= 0 ? activeIndex + 1 : null} />}</div>

        <div key={`${step}-${activeUid ?? 'review'}`} className="flex-1">
          {body}
        </div>

        <FormError message={formError} />

        <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-line bg-surface px-4 py-3 sm:-mx-6 sm:-mb-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step === 1 ? (
              lines.length > 1 ? (
                <Btn onClick={back} disabled={scanning}>Back to review</Btn>
              ) : (
                <Btn onClick={onClose}>Cancel</Btn>
              )
            ) : (
              <Btn onClick={back} disabled={blocked}>Back</Btn>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {step === 4 && mode === 'me' && (
              <Btn busy={busy === 'draft'} disabled={blocked || isUploading} onClick={() => save(false)}>
                Save draft
              </Btn>
            )}
            {step === 4 ? (
              <Btn type="submit" variant="primary" busy={busy === 'submit'} disabled={blocked || isUploading || noCategories}>
                {mode === 'hr' ? 'File expense' : 'Submit'}
              </Btn>
            ) : step === 1 ? (
              stepOneNext && (
                <Btn type="submit" variant="primary" disabled={blocked || lineBusy || noCategories}>
                  Next
                </Btn>
              )
            ) : (
              <Btn type="submit" variant="primary" disabled={blocked || lineBusy}>
                {step === 3 ? 'Review' : 'Next'}
              </Btn>
            )}
          </div>
        </div>
      </form>
    </Drawer>
  );
}

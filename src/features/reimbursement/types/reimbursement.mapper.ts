import type {
  ApprovalSummaryDto,
  BillDto,
  CategoryDto,
  ClaimDetailDto,
  ClaimDto,
  ClaimEventDto,
  ClaimPreviewDto,
  ClaimRequestDto,
  EmployeeRefDto,
  FlagDto,
  FundRequestDto,
  LedgerEntryDto,
  LineDto,
  LineAttachmentDto,
  MyOverviewDto,
  MyWalletDto,
  OverviewDto,
  PhysicalCopyDto,
  WalletDetailDto,
  WalletDto,
  WalletTotalsDto,
  ReceiptScanDto,
} from './reimbursement.dto';
import type {
  ApprovalSummary,
  Bill,
  Category,
  Claim,
  ClaimDetail,
  ClaimEvent,
  ClaimFormInput,
  ClaimLine,
  ClaimPreview,
  CountAmount,
  EmployeeRef,
  Flag,
  FundRequest,
  LedgerEntry,
  LineAttachment,
  LineInput,
  MyOverview,
  PaymentMode,
  PhysicalCopy,
  MyWallet,
  Overview,
  Wallet,
  WalletDetail,
  WalletTotals,
} from './reimbursement.model';
import { hasSplit, isEmptyItem, rowTax } from '../utils/bill';

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PAYMENT_MODE_VALUES: PaymentMode[] = ['cash', 'upi', 'card', 'net_banking', 'cheque', 'other'];
/** A known payment mode, or null. */
export function toPaymentMode(v: unknown): PaymentMode | null {
  return PAYMENT_MODE_VALUES.find((m) => m === v) ?? null;
}

function toFiles(list: LineAttachmentDto[] | undefined | null): LineAttachment[] {
  return (Array.isArray(list) ? list : []).map((a, i) => ({ index: typeof a.index === 'number' ? a.index : i, name: a.name || 'document', size: numOrNull(a.size), type: a.type ?? null, key: a.key ?? null }));
}

const sentFiles = (files: LineAttachment[]) => files.filter((a) => a.key).map((a) => ({ key: a.key as string, name: a.name, size: a.size, type: a.type }));

function countAmount(dto: { count?: unknown; amount?: unknown } | undefined | null): CountAmount {
  return { count: num(dto?.count), amount: num(dto?.amount) };
}

export function toFlag(dto: FlagDto): Flag {
  return { code: dto.code, severity: dto.severity || 'warning', message: dto.message || '', over: numOrNull(dto.over) };
}

function toEmployee(dto: EmployeeRefDto | undefined): EmployeeRef {
  return { id: dto?.id ?? 0, code: dto?.code ?? null, name: dto?.name || '—', department: dto?.department ?? null };
}

export function toLine(dto: LineDto): ClaimLine {
  return {
    id: dto.id,
    seq: num(dto.seq),
    category: {
      id: dto.category?.id ?? 0,
      name: dto.category?.name || 'Expense',
      code: dto.category?.code || '',
      kind: dto.category?.kind === 'distance' ? 'distance' : 'amount',
      icon: dto.category?.icon ?? null,
    },
    expenseDate: dto.expense_date ? String(dto.expense_date).slice(0, 10) : '',
    description: dto.description ?? null,
    merchant: dto.merchant ?? null,
    quantity: numOrNull(dto.quantity),
    rate: numOrNull(dto.rate),
    amount: num(dto.amount),
    approvedAmount: numOrNull(dto.approved_amount),
    attachments: toFiles(dto.attachments),
    flags: (dto.flags || []).map(toFlag),
    invoiceNo: dto.invoice_no || null,
    sellerGstin: dto.seller_gstin || null,
    aiScanned: Boolean(dto.ai_scanned),
    extracted: dto.extracted && typeof dto.extracted === 'object' && !Array.isArray(dto.extracted) ? dto.extracted : null,
    bill: toBillModel(dto.bill),
    paymentMode: toPaymentMode(dto.payment_mode),
    paymentReference: textOrNull(dto.payment_reference),
    paymentProofs: toFiles(dto.payment_proofs),
  };
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

const textOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : String(v).trim() || null);
const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** A bill from the API (scan or claim detail). Null when the line has none. */
export function toBillModel(dto: BillDto | null | undefined): Bill | null {
  if (!isObj(dto)) return null;
  const s = isObj(dto.seller) ? dto.seller : ({} as BillDto['seller']);
  const b = isObj(dto.buyer) ? dto.buyer : ({} as BillDto['buyer']);
  const t = isObj(dto.totals) ? dto.totals : ({} as BillDto['totals']);
  const check = isObj(s.gstin_check) ? s.gstin_check : null;
  const gstinValid = typeof s.gstin_valid === 'boolean' ? s.gstin_valid : check ? Boolean(check.valid) : null;
  const modes = ['item', 'bill', 'both', 'inclusive', 'none'] as const;
  return {
    invoiceNumber: textOrNull(dto.invoice_number),
    invoiceDate: dto.invoice_date ? String(dto.invoice_date).slice(0, 10) : null,
    placeOfSupply: textOrNull(dto.place_of_supply),
    paymentMode: textOrNull(dto.payment_mode),
    currency: textOrNull(dto.currency),
    seller: {
      name: textOrNull(s.name),
      address: textOrNull(s.address),
      state: textOrNull(s.state),
      stateCode: textOrNull(s.state_code),
      pincode: textOrNull(s.pincode),
      gstin: textOrNull(s.gstin),
      gstinValid: s.gstin ? gstinValid : null,
      gstinProblem: check && !check.valid ? textOrNull(check.problem) : null,
      pan: textOrNull(s.pan),
      phone: textOrNull(s.phone),
      email: textOrNull(s.email),
    },
    buyer: { name: textOrNull(b.name), address: textOrNull(b.address), state: textOrNull(b.state), gstin: textOrNull(b.gstin) },
    taxMode: modes.find((m) => m === dto.tax_mode) ?? 'none',
    items: (Array.isArray(dto.items) ? dto.items : []).filter(isObj).map((i) => ({
      name: textOrNull(i.name) || 'Item',
      hsn: textOrNull(i.hsn),
      qty: numOrNull(i.qty),
      unit: textOrNull(i.unit),
      rate: numOrNull(i.rate),
      discount: numOrNull(i.discount),
      taxableValue: numOrNull(i.taxable_value),
      taxRate: numOrNull(i.tax_rate),
      cgst: numOrNull(i.cgst),
      sgst: numOrNull(i.sgst),
      igst: numOrNull(i.igst),
      cess: numOrNull(i.cess),
      amount: numOrNull(i.amount),
      taxAmount: null,
    })),
    charges: (Array.isArray(dto.charges) ? dto.charges : []).filter(isObj).map((c) => ({ label: textOrNull(c.label) || 'Charge', amount: numOrNull(c.amount) })),
    totals: {
      taxable: numOrNull(t.taxable),
      discount: numOrNull(t.discount),
      cgst: numOrNull(t.cgst),
      sgst: numOrNull(t.sgst),
      igst: numOrNull(t.igst),
      cess: numOrNull(t.cess),
      otherTax: numOrNull(t.other_tax),
      tax: numOrNull(t.tax),
      charges: numOrNull(t.charges),
      roundOff: numOrNull(t.round_off),
      grand: numOrNull(t.grand),
    },
    reconciled: Boolean(dto.reconciled),
    difference: numOrNull(dto.difference),
    notes: (Array.isArray(dto.notes) ? dto.notes : []).filter(isObj).map((n) => ({ code: String(n.code || ''), message: String(n.message || '') })).filter((n) => n.message),
    source: dto.source === 'ai' ? 'ai' : 'manual',
    model: textOrNull(dto.model),
  };
}

/** The bill as sent back on preview/create/update (rows with nothing typed are left out). */
export function toBillDto(bill: Bill): BillDto {
  const s = bill.seller;
  const t = bill.totals;
  return {
    invoice_number: textOrNull(bill.invoiceNumber),
    invoice_date: bill.invoiceDate || null,
    place_of_supply: textOrNull(bill.placeOfSupply),
    payment_mode: textOrNull(bill.paymentMode),
    currency: bill.currency || 'INR',
    seller: {
      name: textOrNull(s.name),
      address: textOrNull(s.address),
      state: textOrNull(s.state),
      state_code: s.stateCode,
      pincode: textOrNull(s.pincode),
      gstin: textOrNull(s.gstin),
      pan: textOrNull(s.pan),
      phone: textOrNull(s.phone),
      email: textOrNull(s.email),
    },
    buyer: { name: textOrNull(bill.buyer.name), address: textOrNull(bill.buyer.address), state: textOrNull(bill.buyer.state), gstin: textOrNull(bill.buyer.gstin) },
    tax_mode: bill.taxMode,
    items: bill.items
      .filter((i) => !isEmptyItem(i))
      .map((i) => {
        // A row the user typed or edited (and every row of a typed bill) sends only its GST % and, when
        // typed, the row tax: the server splits it into CGST + SGST or IGST. A scanned row nobody
        // edited keeps its printed split.
        const split = bill.source === 'manual' || !hasSplit(i);
        const taxAmount = i.taxAmount ?? (hasSplit(i) && i.taxRate === null ? rowTax(i) : null);
        return {
          name: i.name.trim() || 'Item',
          hsn: textOrNull(i.hsn),
          qty: i.qty,
          unit: textOrNull(i.unit),
          rate: i.rate,
          discount: i.discount,
          taxable_value: i.taxableValue,
          tax_rate: i.taxRate,
          cgst: split ? null : i.cgst,
          sgst: split ? null : i.sgst,
          igst: split ? null : i.igst,
          cess: split ? null : i.cess,
          amount: i.amount,
          ...(split && taxAmount !== null ? { tax_amount: taxAmount } : {}),
        };
      }),
    charges: bill.charges.filter((c) => c.label.trim() || c.amount !== null).map((c) => ({ label: c.label.trim() || 'Charge', amount: c.amount })),
    totals: {
      taxable: t.taxable,
      discount: t.discount,
      cgst: t.cgst,
      sgst: t.sgst,
      igst: t.igst,
      cess: t.cess,
      other_tax: t.otherTax,
      tax: t.tax,
      charges: t.charges,
      round_off: t.roundOff,
      grand: t.grand,
    },
    reconciled: bill.reconciled,
    difference: bill.difference,
    notes: bill.notes,
    source: bill.source,
    model: bill.model,
  };
}

/** Whether `amount` (as typed) is the bill's grand total. */
export function amountMatchesBill(amount: string | number, bill: Bill | null): boolean {
  const grand = bill?.totals.grand;
  if (grand === null || grand === undefined || amount === '') return false;
  return Math.abs(Number(amount) - grand) < 0.005;
}

export function toPhysicalCopy(dto: PhysicalCopyDto | null | undefined): PhysicalCopy {
  const status = dto?.status === 'pending' || dto?.status === 'collected' || dto?.status === 'optional' ? dto.status : 'not_required';
  const by = dto?.collected_by;
  return {
    status,
    holdsPayment: Boolean(dto?.holds_payment),
    collectedAt: dto?.collected_at ?? null,
    collectedBy: typeof by === 'string' ? by || null : by && typeof by === 'object' ? by.name || null : null,
    note: dto?.note || null,
  };
}

export function toClaim(dto: ClaimDto): Claim {
  const lines = (dto.lines || []).map(toLine);
  const approved = numOrNull(dto.approved_amount);
  return {
    id: dto.id,
    number: dto.number || `EXP-${String(dto.id).padStart(5, '0')}`,
    title: dto.title || 'Expense',
    purpose: dto.purpose ?? null,
    channel: dto.channel === 'wallet' ? 'wallet' : 'claim',
    status: dto.status,
    payoutMode: dto.payout_mode ?? null,
    claimedAmount: num(dto.claimed_amount),
    approvedAmount: approved,
    amount: approved ?? num(dto.claimed_amount),
    employee: toEmployee(dto.employee),
    company: dto.company ?? null,
    flags: (dto.flags || []).map(toFlag),
    flagCount: num(dto.flag_count),
    lineCount: dto.line_count ?? lines.length,
    categories: dto.categories ?? [...new Set(lines.map((l) => l.category.name))],
    createdAt: dto.created_at ?? null,
    submittedAt: dto.submitted_at ?? null,
    decidedAt: dto.decided_at ?? null,
    decisionNote: dto.decision_note ?? null,
    paidOn: dto.paid_on ?? null,
    paidReference: dto.paid_reference ?? null,
    hasProof: Boolean(dto.has_proof),
    inPayroll: Boolean(dto.in_payroll),
    source: dto.source ?? null,
    lines,
    physicalCopy: toPhysicalCopy(dto.physical_copy),
  };
}

function toEvent(dto: ClaimEventDto): ClaimEvent {
  return { id: dto.id, action: dto.action, by: dto.by ?? null, at: dto.at ?? null, data: dto.data && typeof dto.data === 'object' ? dto.data : {} };
}

export function toApproval(dto: ApprovalSummaryDto | null | undefined): ApprovalSummary | null {
  if (!dto) return null;
  return {
    requestId: dto.request_id,
    status: dto.status,
    steps: (dto.steps || []).map((s) => ({
      index: s.index,
      name: s.name || `Step ${s.index + 1}`,
      state: s.state,
      approvers: (s.approvers || []).map((a) => ({ name: a.name || 'Approver', status: a.status, actedAt: a.acted_at ?? null, note: a.note ?? null })),
    })),
  };
}

export function toWallet(dto: WalletDto): Wallet {
  return {
    id: dto.id,
    employee: toEmployee(dto.employee),
    status: dto.status,
    statusNote: dto.status_note ?? null,
    balance: num(dto.balance),
    held: num(dto.held),
    available: num(dto.available),
    openedAt: dto.opened_at ?? null,
    closedAt: dto.closed_at ?? null,
    negativeAllowed: Boolean(dto.negative_allowed),
    // null = no limit; absent (older payloads, list rows) = no room below zero.
    negativeLimit: dto.negative_limit === undefined ? 0 : numOrNull(dto.negative_limit),
    spendable: dto.spendable === undefined ? Math.max(0, num(dto.available)) : numOrNull(dto.spendable),
    belowZero: dto.below_zero === undefined ? Math.max(0, -num(dto.balance)) : num(dto.below_zero),
  };
}

export function toClaimDetail(dto: ClaimDetailDto): ClaimDetail {
  const c = dto.can || {};
  return {
    ...toClaim(dto),
    history: (dto.history || []).map(toEvent),
    approval: toApproval(dto.approval),
    wallet: dto.wallet ? toWallet(dto.wallet) : null,
    can: {
      edit: Boolean(c.edit),
      cancel: Boolean(c.cancel),
      pay: Boolean(c.pay),
      changePayout: Boolean(c.change_payout),
      approve: Boolean(c.approve),
      collect: Boolean(c.collect),
    },
  };
}

export function toLedgerEntry(dto: LedgerEntryDto): LedgerEntry {
  return {
    id: dto.id,
    type: dto.type,
    amount: num(dto.amount),
    balanceBefore: dto.balance_before === undefined ? num(dto.balance_after) - num(dto.amount) : num(dto.balance_before),
    balanceAfter: num(dto.balance_after),
    coversNegative: num(dto.covers_negative),
    goesNegative: num(dto.goes_negative),
    date: dto.date ? String(dto.date).slice(0, 10) : '',
    ref: dto.ref ?? null,
    reference: dto.reference ?? null,
    note: dto.note ?? null,
    hasProof: Boolean(dto.has_proof),
    by: dto.by ?? null,
    at: dto.at ?? null,
  };
}

export function toFundRequest(dto: FundRequestDto): FundRequest {
  return {
    id: dto.id,
    employee: toEmployee(dto.employee),
    walletId: num(dto.wallet_id),
    amount: num(dto.amount),
    approvedAmount: numOrNull(dto.approved_amount),
    reason: dto.reason ?? null,
    status: dto.status,
    decidedAt: dto.decided_at ?? null,
    decisionNote: dto.decision_note ?? null,
    paidOn: dto.paid_on ?? null,
    paidReference: dto.paid_reference ?? null,
    createdAt: dto.created_at ?? null,
    attachments: (Array.isArray(dto.attachments) ? dto.attachments : []).map((a, i) => ({
      index: typeof a.index === 'number' ? a.index : i,
      name: a.name || 'document',
      size: numOrNull(a.size),
      type: a.type ?? null,
    })),
  };
}

export function toCategory(dto: CategoryDto): Category {
  const r = dto.rule;
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description ?? null,
    kind: dto.kind === 'distance' ? 'distance' : 'amount',
    icon: dto.icon ?? null,
    glCode: dto.gl_code ?? null,
    status: dto.status === 'inactive' ? 'inactive' : 'active',
    sortOrder: num(dto.sort_order),
    subOrganizationId: dto.sub_organization_id ?? null,
    rule: r
      ? {
          perClaim: num(r.limits?.perClaim),
          perMonth: num(r.limits?.perMonth),
          perYear: num(r.limits?.perYear),
          whenExceeded: r.limits?.whenExceeded === 'block' ? 'block' : 'flag',
          ratePerKm: num(r.rate_per_km),
          receipt: r.receipt?.required === 'always' || r.receipt?.required === 'above' ? r.receipt.required : 'never',
          receiptAbove: num(r.receipt?.above),
        }
      : null,
    used: dto.used ? { month: num(dto.used.month), year: num(dto.used.year) } : null,
  };
}

function toMyWallet(dto: MyWalletDto): MyWallet {
  return {
    ...toWallet(dto),
    recent: (dto.recent || []).map(toLedgerEntry),
    openFundRequests: (dto.open_fund_requests || []).map(toFundRequest),
  };
}

export function toMyOverview(dto: MyOverviewDto): MyOverview {
  const c = dto.counts || ({} as MyOverviewDto['counts']);
  return {
    features: { claims: Boolean(dto.features?.claims), wallet: Boolean(dto.features?.wallet) },
    enabled: Boolean(dto.enabled),
    today: dto.today,
    policy: {
      submitWithinDays: num(dto.policy?.submit_within_days),
      payoutMode: dto.policy?.payout_mode === 'payroll' ? 'payroll' : 'manual',
      needsApproval: dto.policy?.needs_approval !== false,
      fundRequests: Boolean(dto.policy?.fund_requests),
      receiptScan: Boolean(dto.policy?.receipt_scan),
    },
    channels: (dto.channels || []).filter((ch): ch is 'claim' | 'wallet' => ch === 'claim' || ch === 'wallet'),
    categories: (dto.categories || []).map(toCategory),
    wallet: dto.wallet ? toMyWallet(dto.wallet) : null,
    counts: {
      draft: countAmount(c.draft),
      pending: countAmount(c.pending),
      to_be_paid: countAmount(c.to_be_paid),
      paid: countAmount(c.paid),
      wallet_spent: countAmount(c.wallet_spent),
      rejected: countAmount(c.rejected),
    },
  };
}

export function toOverview(dto: OverviewDto): Overview {
  const k = dto.kpis || ({} as OverviewDto['kpis']);
  const w = dto.wallets;
  return {
    month: dto.month,
    features: { claims: Boolean(dto.features?.claims), wallet: Boolean(dto.features?.wallet), ai: Boolean(dto.features?.ai) },
    kpis: {
      pending: countAmount(k.pending),
      to_pay: countAmount(k.to_pay),
      in_payroll: countAmount(k.in_payroll),
      paid_this_month: countAmount(k.paid_this_month),
      wallet_pending: countAmount(k.wallet_pending),
    },
    billsToCollect: k.bills_to_collect ? { count: num(k.bills_to_collect.count), amount: num(k.bills_to_collect.amount) } : null,
    trend: (dto.trend || []).map((t) => ({ month: t.month, claim: num(t.claim), wallet: num(t.wallet) })),
    topCategories: (dto.top_categories || []).map((t) => ({ id: t.id, name: t.name, icon: t.icon ?? null, amount: num(t.amount), claims: num(t.claims) })),
    wallets: w
      ? {
          count: num(w.count),
          active: num(w.active),
          frozen: num(w.frozen),
          fundsOut: num(w.funds_out),
          owedToEmployees: num(w.owed_to_employees),
          negative: num(w.negative),
          fundRequestsPending: num(w.fund_requests_pending),
          fundRequestsToPay: countAmount(w.fund_requests_to_pay),
        }
      : null,
  };
}

export function toWalletTotals(dto: WalletTotalsDto | undefined): WalletTotals {
  return {
    wallets: num(dto?.wallets),
    active: num(dto?.active),
    frozen: num(dto?.frozen),
    fundsOut: num(dto?.funds_out),
    owedToEmployees: num(dto?.owed_to_employees),
    negative: num(dto?.negative),
  };
}

export function toWalletDetail(dto: WalletDetailDto): WalletDetail {
  const c = dto.can || {};
  return {
    wallet: toWallet(dto.wallet),
    ledger: (dto.ledger?.items || []).map(toLedgerEntry),
    ledgerTotal: num(dto.ledger?.total),
    openFundRequests: (dto.open_fund_requests || []).map(toFundRequest),
    can: { fund: Boolean(c.fund), freeze: Boolean(c.freeze), close: Boolean(c.close), reopen: Boolean(c.reopen) },
  };
}

export function toPreview(dto: ClaimPreviewDto): ClaimPreview {
  return {
    total: num(dto.total),
    errors: dto.errors && typeof dto.errors === 'object' ? dto.errors : {},
    flags: (dto.flags || []).map(toFlag),
    lines: (dto.lines || []).map((l) => ({ amount: num(l.amount), rate: numOrNull(l.rate), flags: (l.flags || []).map(toFlag), bill: toBillModel(l.bill) })),
    wallet: dto.wallet ? { balance: num(dto.wallet.balance), held: num(dto.wallet.held), available: num(dto.wallet.available) } : null,
  };
}

// ── Form ↔ request ──────────────────────────────────────────────────────────

let uidSeq = 0;
export function newLineUid() {
  uidSeq += 1;
  return `l${Date.now().toString(36)}${uidSeq}`;
}

export function emptyLine(date: string, categoryId: number | null = null): LineInput {
  return {
    uid: newLineUid(),
    categoryId,
    expenseDate: date,
    amount: '',
    quantity: '',
    merchant: '',
    description: '',
    attachments: [],
    invoiceNo: '',
    sellerGstin: null,
    aiScanned: false,
    extracted: null,
    bill: null,
    amountFromBill: false,
    paymentMode: null,
    paymentReference: '',
    paymentProofs: [],
    scan: null,
  };
}

/** A line nobody has touched yet (a scan may fill it instead of adding another). */
export function isBlankLine(l: LineInput): boolean {
  return !l.scan && !l.amount && !l.quantity && !l.merchant.trim() && !l.description.trim() && !l.invoiceNo.trim() && !l.attachments.length && !l.aiScanned && !l.bill && !l.paymentMode && !l.paymentReference.trim() && !l.paymentProofs.length;
}

/**
 * Applies a receipt scan to a line. A read receipt replaces what the line had (it was blank or a
 * placeholder); an unread one only attaches the stored file so the employee fills the rest by hand.
 * `categoryKind` resolves the suggested category (null when it is not one the form offers).
 */
export function applyScan(line: LineInput, dto: ReceiptScanDto, categoryKind: (id: number) => 'amount' | 'distance' | null): LineInput {
  const stored = dto.line?.attachments?.length ? dto.line.attachments : dto.attachments?.length ? dto.attachments : dto.attachment ? [dto.attachment] : [];
  const files = stored.map((a, i) => ({
    index: line.attachments.length + i,
    name: a.name || 'receipt',
    size: numOrNull(a.size),
    type: a.type ?? null,
    key: a.key ?? null,
  }));
  const attachments = [...line.attachments, ...files.filter((f) => !line.attachments.some((a) => a.key && a.key === f.key))];
  const fileName = files[0]?.name || line.scan?.fileName || 'receipt';
  const pages = files.length || 1;
  if (!dto.read) {
    return { ...line, attachments, scan: { status: 'unread', fileName, message: dto.message || 'The bill could not be read. Fill the expense by hand.', missing: [], pages } };
  }
  const l = dto.line || {};
  const suggested = numOrNull(l.category_id);
  // Keep the line's own category (e.g. the only one offered) when the suggestion is not usable.
  const categoryId = suggested && categoryKind(suggested) ? suggested : line.categoryId;
  const kind = categoryId ? categoryKind(categoryId) : null;
  const bill = toBillModel(l.bill);
  const grand = bill?.totals.grand ?? null;
  // A bill total fills the amount when the reader left it out; the amount then follows the bill.
  const amount = numOrNull(l.amount) ?? (kind !== 'distance' ? grand : null);
  const quantity = numOrNull(l.quantity);
  const missing = new Set((dto.missing || []).filter((m) => typeof m === 'string'));
  if (categoryId) missing.delete('category_id');
  else missing.add('category_id');
  // For a distance category "amount" means the km.
  if (kind === 'distance') {
    if (quantity && quantity > 0) missing.delete('amount');
    else missing.add('amount');
  } else if (amount !== null && amount > 0) missing.delete('amount');
  return {
    ...line,
    categoryId,
    expenseDate: l.expense_date ? String(l.expense_date).slice(0, 10) : '',
    amount: amount !== null && amount > 0 ? String(amount) : '',
    quantity: kind === 'distance' && quantity !== null && quantity > 0 ? String(quantity) : '',
    merchant: str(l.merchant) ?? '',
    description: str(l.description) ?? '',
    invoiceNo: str(l.invoice_no) ?? '',
    sellerGstin: str(l.seller_gstin),
    aiScanned: l.ai_scanned !== false,
    extracted: l.extracted && typeof l.extracted === 'object' ? l.extracted : null,
    bill,
    amountFromBill: kind !== 'distance' && amount !== null && amount > 0 && amountMatchesBill(amount, bill),
    attachments,
    paymentMode: toPaymentMode(l.payment_mode) ?? line.paymentMode,
    scan: { status: 'read', fileName, message: null, missing: [...missing], pages },
  };
}

export function lineInputOf(line: ClaimLine): LineInput {
  return {
    uid: newLineUid(),
    categoryId: line.category.id || null,
    expenseDate: line.expenseDate,
    amount: line.category.kind === 'distance' ? '' : String(line.amount || ''),
    quantity: line.quantity !== null ? String(line.quantity) : '',
    merchant: line.merchant || '',
    description: line.description || '',
    attachments: line.attachments,
    invoiceNo: line.invoiceNo || '',
    sellerGstin: line.sellerGstin,
    aiScanned: line.aiScanned,
    extracted: line.extracted,
    bill: line.bill,
    amountFromBill: line.category.kind !== 'distance' && amountMatchesBill(line.amount, line.bill),
    paymentMode: line.paymentMode,
    paymentReference: line.paymentReference || '',
    paymentProofs: line.paymentProofs,
    scan: null,
  };
}

/**
 * Builds the create/update/preview body. `kindOf` tells distance categories (km sent as quantity)
 * from amount ones. Receipts already on a draft come back from the API with their `key` and are
 * sent again so they are kept; anything without a key cannot be re-attached and is dropped.
 */
export function toClaimBody(input: ClaimFormInput, kindOf: (categoryId: number | null) => 'amount' | 'distance', extra: { submit?: boolean; employeeId?: number; payoutMode?: 'manual' | 'payroll' } = {}): ClaimRequestDto {
  return {
    channel: input.channel,
    title: input.title.trim(),
    purpose: input.purpose.trim() || undefined,
    ...(extra.submit !== undefined ? { submit: extra.submit } : {}),
    ...(extra.employeeId ? { employee_id: extra.employeeId } : {}),
    ...(extra.payoutMode ? { payout_mode: extra.payoutMode } : {}),
    lines: input.lines.map((l) => {
      const distance = kindOf(l.categoryId) === 'distance';
      return {
        category_id: l.categoryId ?? 0,
        expense_date: l.expenseDate,
        ...(distance ? { quantity: l.quantity === '' ? undefined : Number(l.quantity) } : { amount: l.amount === '' ? undefined : Number(l.amount) }),
        merchant: l.merchant.trim() || undefined,
        description: l.description.trim() || undefined,
        attachments: sentFiles(l.attachments),
        invoice_no: l.invoiceNo.trim() || undefined,
        seller_gstin: l.sellerGstin || undefined,
        extracted: l.extracted ?? undefined,
        ai_scanned: l.aiScanned,
        bill: l.bill ? toBillDto(l.bill) : undefined,
        payment_mode: l.paymentMode ?? undefined,
        payment_reference: l.paymentReference.trim() || undefined,
        payment_proofs: sentFiles(l.paymentProofs),
      };
    }),
  };
}

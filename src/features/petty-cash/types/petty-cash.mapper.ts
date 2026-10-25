import { amountMatchesBill, num, numOrNull, sentFiles, str, textOrNull, toBillDto, toBillModel, toFiles, toFlag, toPaymentMode } from '@/features/expense-bills/types/bill.mapper';
import type {
  ApprovalSummaryDto,
  CashCountDto,
  CategoryDto,
  CustodianDto,
  EmployeeRefDto,
  ExpenseDetailDto,
  ExpenseDto,
  ExpenseEventDto,
  ExpensePreviewDto,
  ExpenseRequestDto,
  FundRequestDetailDto,
  FundRequestDto,
  InwardBulkResultDto,
  InwardDto,
  PaperBulkResultDto,
  LedgerEntryDto,
  MyOverviewDto,
  MyWalletDetailDto,
  OverviewDto,
  PhysicalCopyDto,
  ReceiptScanDto,
  SettingsDto,
  SettingsResponseDto,
  WalletDetailDto,
  WalletDto,
  WalletTotalsDto,
} from './petty-cash.dto';
import type {
  ApprovalSummary,
  CashCount,
  Category,
  Custodian,
  EmployeeRef,
  Expense,
  ExpenseCounts,
  ExpenseDetail,
  ExpenseEvent,
  ExpenseInput,
  ExpensePreview,
  ExpenseScan,
  FundRequest,
  FundRequestDetail,
  Inward,
  InwardResult,
  PaperResult,
  LedgerEntry,
  MyOverview,
  MyWalletDetail,
  Overview,
  PhysicalCopy,
  Settings,
  SettingsBundle,
  Wallet,
  WalletDetail,
  WalletTotals,
} from './petty-cash.model';

export { toPaymentMode };

const dateOnly = (v: unknown) => (v ? String(v).slice(0, 10) : '');

function toEmployee(dto: EmployeeRefDto | null | undefined): EmployeeRef {
  return { id: dto?.id ?? 0, code: dto?.code ?? null, name: dto?.name || '—' };
}

function toCustodian(dto: CustodianDto): Custodian {
  return { employeeId: dto.employee_id, code: dto.code ?? null, name: dto.name || '—', userId: dto.user_id ?? null, isPrimary: Boolean(dto.is_primary) };
}

export function toWallet(dto: WalletDto): Wallet {
  const c = dto.can ?? {};
  const r = dto.rules;
  return {
    id: dto.id,
    code: dto.code ?? null,
    name: dto.name || 'Petty cash',
    status: dto.status,
    statusNote: dto.status_note ?? null,
    site: dto.site ?? null,
    company: dto.company ?? null,
    balance: num(dto.balance),
    held: num(dto.held),
    available: num(dto.available),
    spendable: numOrNull(dto.spendable),
    negativeAllowed: Boolean(dto.negative_allowed ?? dto.allow_negative),
    negativeLimit: numOrNull(dto.negative_limit),
    floatAmount: num(dto.float_amount),
    hasFloat: dto.has_float ?? num(dto.float_amount) > 0,
    toReplenish: num(dto.to_replenish),
    low: Boolean(dto.low),
    maxPerExpense: numOrNull(dto.max_per_expense),
    lowBalanceAlert: numOrNull(dto.low_balance_alert),
    custodians: (dto.custodians || []).map(toCustodian),
    openedAt: dto.opened_at ?? null,
    can: { fund: Boolean(c.fund), manage: Boolean(c.manage), reopen: Boolean(c.reopen), count: Boolean(c.count), askFunds: Boolean(c.ask_funds) },
    rules: r
      ? {
          physicalCopy: r.physical_copy,
          physicalCopyAbove: numOrNull(r.physical_copy_above),
          receiptRequiredAbove: numOrNull(r.receipt_required_above),
          maxBackdateDays: num(r.max_backdate_days),
        }
      : null,
  };
}

function personName(by: string | { id?: number; name?: string | null } | null | undefined): string | null {
  return typeof by === 'string' ? by || null : by && typeof by === 'object' ? by.name || null : null;
}

export function toInward(dto: InwardDto | null | undefined): Inward {
  const s = dto?.status;
  return {
    required: Boolean(dto?.required),
    status: s === 'pending' || s === 'partial' || s === 'received' ? s : 'not_required',
    numbering: dto?.numbering === 'typed' ? 'typed' : 'auto',
    numbers: Array.isArray(dto?.numbers) ? dto.numbers : [],
    lines: (dto?.lines || []).map((l) => ({ line: l.line, name: l.name, unit: l.unit ?? null, ordered: num(l.ordered), received: num(l.received), pending: num(l.pending), numbers: (l.numbers || []).map((n) => ({ inwardNo: n.inward_no, qty: num(n.qty) })) })),
    receipts: (dto?.receipts || []).map((r) => ({
      id: r.id,
      receivedAt: r.received_at ?? null,
      receivedBy: personName(r.received_by),
      note: r.note || null,
      items: (r.items || []).map((i) => ({ line: i.line, name: i.name, unit: i.unit ?? null, qty: num(i.qty), inwardNo: i.inward_no || null })),
    })),
  };
}

function toPhysicalCopy(dto: PhysicalCopyDto | null | undefined): PhysicalCopy {
  const s = dto?.status;
  const by = dto?.received_by;
  return {
    status: s === 'optional' || s === 'pending' || s === 'received' ? s : 'not_required',
    required: Boolean(dto?.required),
    receivedAt: dto?.received_at ?? null,
    receivedBy: typeof by === 'string' ? by || null : by && typeof by === 'object' ? by.name || null : null,
    note: dto?.note || null,
  };
}

export function toExpense(dto: ExpenseDto): Expense {
  const approved = numOrNull(dto.approved_amount);
  return {
    id: dto.id,
    number: dto.number,
    status: dto.status,
    amount: num(dto.amount),
    approvedAmount: approved,
    netAmount: approved ?? num(dto.amount),
    expenseDate: dateOnly(dto.expense_date),
    merchant: dto.merchant ?? null,
    description: dto.description ?? null,
    purpose: dto.purpose ?? null,
    invoiceNo: dto.invoice_no ?? null,
    sellerGstin: dto.seller_gstin ?? null,
    category: { id: dto.category?.id ?? 0, name: dto.category?.name || 'Expense', code: dto.category?.code || '', icon: dto.category?.icon ?? null },
    wallet: { id: dto.wallet?.id ?? 0, name: dto.wallet?.name || 'Petty cash', code: dto.wallet?.code ?? null },
    site: dto.site ?? null,
    company: dto.company ?? null,
    spender: toEmployee(dto.spender),
    paymentMode: toPaymentMode(dto.payment_mode),
    paymentReference: textOrNull(dto.payment_reference),
    receipts: toFiles(dto.receipts),
    paymentProofs: toFiles(dto.payment_proofs),
    aiScanned: Boolean(dto.ai_scanned),
    flags: (dto.flags || []).map(toFlag),
    physicalCopy: toPhysicalCopy(dto.physical_copy),
    inward: toInward(dto.inward),
    submittedAt: dto.submitted_at ?? null,
    decidedAt: dto.decided_at ?? null,
    decisionNote: dto.decision_note ?? null,
    source: dto.source ?? null,
  };
}

function toEvent(dto: ExpenseEventDto): ExpenseEvent {
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

export function toExpenseDetail(dto: ExpenseDetailDto): ExpenseDetail {
  const c = dto.can ?? {};
  return {
    ...toExpense(dto),
    bill: toBillModel(dto.bill),
    history: (dto.history || []).map(toEvent),
    approval: toApproval(dto.approval),
    can: { receiveGoods: Boolean(c.receive_goods), undoGoods: Boolean(c.undo_goods), paper: Boolean(c.paper), cancel: Boolean(c.cancel), approve: Boolean(c.approve) },
  };
}

export function toLedgerEntry(dto: LedgerEntryDto): LedgerEntry {
  return {
    id: dto.id,
    type: dto.type,
    amount: num(dto.amount),
    balanceAfter: num(dto.balance_after),
    date: dateOnly(dto.date),
    paymentMode: toPaymentMode(dto.payment_mode),
    reference: textOrNull(dto.reference),
    note: textOrNull(dto.note),
    files: toFiles(dto.files),
    ref: dto.ref ?? null,
    expense: dto.expense ? { number: dto.expense.number, merchant: dto.expense.merchant ?? null, description: dto.expense.description ?? null, inwardNo: dto.expense.inward_no ?? null } : null,
    by: dto.by ?? null,
    at: dto.at ?? null,
  };
}

export function toFundRequest(dto: FundRequestDto): FundRequest {
  return {
    id: dto.id,
    status: dto.status,
    mode: dto.mode === 'replenish' ? 'replenish' : 'amount',
    amount: num(dto.amount),
    approvedAmount: numOrNull(dto.approved_amount),
    reason: textOrNull(dto.reason),
    wallet: {
      id: dto.wallet?.id ?? 0,
      name: dto.wallet?.name || 'Petty cash',
      code: dto.wallet?.code ?? null,
      balance: num(dto.wallet?.balance),
      floatAmount: num(dto.wallet?.float_amount),
      hasFloat: dto.wallet?.has_float ?? num(dto.wallet?.float_amount) > 0,
      status: dto.wallet?.status ?? 'active',
    },
    requestedBy: toEmployee(dto.requested_by),
    createdAt: dto.created_at ?? null,
    decidedAt: dto.decided_at ?? null,
    decisionNote: dto.decision_note ?? null,
    paidAt: dto.paid_at ?? null,
    paidMode: toPaymentMode(dto.paid_mode),
    paidReference: textOrNull(dto.paid_reference),
    paidFiles: toFiles(dto.paid_files),
  };
}

export function toFundRequestDetail(dto: FundRequestDetailDto): FundRequestDetail {
  return { ...toFundRequest(dto), history: (dto.history || []).map(toEvent), approval: toApproval(dto.approval), canPay: Boolean(dto.can?.pay) };
}

export function toCashCount(dto: CashCountDto): CashCount {
  return {
    id: dto.id,
    bookBalance: num(dto.book_balance),
    countedAmount: num(dto.counted_amount),
    difference: num(dto.difference),
    denominations: dto.denominations && typeof dto.denominations === 'object' ? dto.denominations : null,
    note: textOrNull(dto.note),
    countedBy: dto.counted_by ?? null,
    adjusted: Boolean(dto.adjusted),
    at: dto.at ?? null,
  };
}

export function toSettings(dto: SettingsDto): Settings {
  return {
    subOrganizationId: dto.sub_organization_id ?? null,
    spendMode: dto.spend_mode,
    approvalRequired: Boolean(dto.approval_required),
    physicalCopy: dto.physical_copy,
    physicalCopyAbove: numOrNull(dto.physical_copy_above),
    inwardEnabled: dto.inward_enabled !== false,
    inwardNumbering: dto.inward_numbering === 'typed' ? 'typed' : 'auto',
    inwardPrefix: dto.inward_prefix || '',
    receiptRequiredAbove: numOrNull(dto.receipt_required_above),
    maxBackdateDays: num(dto.max_backdate_days),
    defaultMaxPerExpense: numOrNull(dto.default_max_per_expense),
    cashCountEnabled: dto.cash_count_enabled !== false,
  };
}

export function toSettingsBundle(dto: SettingsResponseDto): SettingsBundle {
  return { default: toSettings(dto.default), overrides: (dto.overrides || []).map(toSettings), effective: toSettings(dto.effective ?? dto.default) };
}

export function toSettingsBody(s: Settings) {
  return {
    ...(s.subOrganizationId ? { sub_organization_id: s.subOrganizationId } : {}),
    spend_mode: s.spendMode,
    approval_required: s.approvalRequired,
    physical_copy: s.physicalCopy,
    physical_copy_above: s.physicalCopy === 'above' ? s.physicalCopyAbove : null,
    inward_enabled: s.inwardEnabled,
    inward_numbering: s.inwardNumbering,
    inward_prefix: s.inwardPrefix.trim(),
    receipt_required_above: s.receiptRequiredAbove,
    max_backdate_days: s.maxBackdateDays,
    default_max_per_expense: s.defaultMaxPerExpense,
    cash_count_enabled: s.cashCountEnabled,
  };
}

export function toCategory(dto: CategoryDto): Category {
  return { id: dto.id, code: dto.code, name: dto.name, icon: dto.icon ?? null };
}

export function toWalletTotals(dto: WalletTotalsDto | undefined): WalletTotals {
  return { wallets: num(dto?.wallets), active: num(dto?.active), frozen: num(dto?.frozen), cashInHand: num(dto?.cash_in_hand), held: num(dto?.held), low: num(dto?.low) };
}

export function toWalletDetail(dto: WalletDetailDto): WalletDetail {
  return {
    wallet: toWallet(dto.wallet),
    ledger: (dto.ledger?.items || []).map(toLedgerEntry),
    ledgerTotal: num(dto.ledger?.total),
    openFundRequests: (dto.open_fund_requests || []).map(toFundRequest),
    cashCounts: (dto.cash_counts || []).map(toCashCount),
  };
}

export function toMyWalletDetail(dto: MyWalletDetailDto): MyWalletDetail {
  return {
    wallet: toWallet(dto.wallet),
    ledger: dto.ledger ? (dto.ledger.items || []).map(toLedgerEntry) : null,
    ledgerTotal: num(dto.ledger?.total),
    cashCounts: (dto.cash_counts || []).map(toCashCount),
    openFundRequests: (dto.open_fund_requests || []).map(toFundRequest),
  };
}

export function toExpenseCounts(raw: Record<string, unknown> | undefined | null): ExpenseCounts {
  const c = raw ?? {};
  return { all: num(c.all), pending: num(c.pending), approved: num(c.approved), rejected: num(c.rejected), paperPending: num(c.paper_pending), paperReceived: num(c.paper_received), inwardWaiting: num(c.inward_waiting ?? c.waiting), inwardPartial: num(c.partial), inwardReceived: num(c.inward_received ?? c.received) };
}

export function toOverview(dto: OverviewDto): Overview {
  return {
    wallets: {
      total: num(dto.wallets?.total),
      active: num(dto.wallets?.active),
      frozen: num(dto.wallets?.frozen),
      cashInHand: num(dto.wallets?.cash_in_hand),
      held: num(dto.wallets?.held),
      low: num(dto.wallets?.low),
    },
    queues: {
      toApprove: { count: num(dto.queues?.to_approve?.count), amount: num(dto.queues?.to_approve?.amount) },
      paperBills: num(dto.queues?.paper_bills?.count),
      goodsInward: num(dto.queues?.goods_inward?.count),
      fundRequests: num(dto.queues?.fund_requests?.count),
    },
    thisMonth: { spent: num(dto.this_month?.spent), approved: num(dto.this_month?.approved), pending: num(dto.this_month?.pending) },
    trend: (dto.trend || []).map((t) => ({ month: String(t.month), amount: num(t.amount) })),
    topCategories: (dto.top_categories || []).map((c) => ({ id: c.id, name: c.name, icon: c.icon ?? null, amount: num(c.amount), count: num(c.count) })),
    lowWallets: (dto.low_wallets || []).map(toWallet),
    recent: (dto.recent || []).map(toExpense),
  };
}

export function toMyOverview(dto: MyOverviewDto): MyOverview {
  return {
    today: dto.today,
    wallets: (dto.wallets || []).map(toWallet),
    categories: (dto.categories || []).map(toCategory),
    receiptScan: Boolean(dto.receipt_scan),
    month: {
      pending: num(dto.month?.pending),
      pendingAmount: num(dto.month?.pending_amount),
      approved: num(dto.month?.approved),
      approvedAmount: num(dto.month?.approved_amount),
      paperPending: num(dto.month?.paper_pending),
    },
    recent: (dto.recent || []).map(toExpense),
    openFundRequests: (dto.open_fund_requests || []).map(toFundRequest),
  };
}

export function toInwardResult(dto: InwardBulkResultDto): InwardResult {
  return {
    updated: num(dto.updated),
    items: (dto.items || []).map((i) => ({ id: i.id, inwardNos: Array.isArray(i.inward_nos) ? i.inward_nos : [], status: i.status })),
    skipped: Array.isArray(dto.skipped) ? dto.skipped : [],
  };
}

export function toPaperResult(dto: PaperBulkResultDto): PaperResult {
  return { updated: num(dto.updated), skipped: Array.isArray(dto.skipped) ? dto.skipped : [] };
}

export function toPreview(dto: ExpensePreviewDto): ExpensePreview {
  return {
    errors: dto.errors && typeof dto.errors === 'object' ? dto.errors : {},
    flags: (dto.flags || []).map(toFlag),
    physical: dto.physical ?? null,
    bill: toBillModel(dto.bill),
    wallet: dto.wallet ? { balance: num(dto.wallet.balance), held: num(dto.wallet.held), available: num(dto.wallet.available), spendable: numOrNull(dto.wallet.spendable) } : null,
  };
}

// ── The expense form ────────────────────────────────────────────────────────

export function emptyExpense(date: string, walletId: number | null = null, categoryId: number | null = null): ExpenseInput {
  return {
    walletId,
    categoryId,
    expenseDate: date,
    amount: '',
    merchant: '',
    description: '',
    purpose: '',
    invoiceNo: '',
    sellerGstin: null,
    receipts: [],
    paymentMode: null,
    paymentReference: '',
    paymentProofs: [],
    aiScanned: false,
    extracted: null,
    bill: null,
    amountFromBill: false,
    spentBy: null,
  };
}

/** Nothing has been entered yet (a scan may fill it). */
export function isBlankExpense(e: ExpenseInput): boolean {
  return !e.amount && !e.merchant.trim() && !e.description.trim() && !e.invoiceNo.trim() && !e.receipts.length && !e.aiScanned && !e.bill && !e.paymentMode && !e.paymentReference.trim() && !e.paymentProofs.length;
}

/**
 * Applies a receipt scan. A read bill replaces what was entered; an unread one only attaches the
 * stored pages so the user fills the rest by hand. `offered` tells whether a suggested category is
 * one the form offers.
 */
export function applyScan(input: ExpenseInput, dto: ReceiptScanDto, offered: (id: number) => boolean): { input: ExpenseInput; scan: ExpenseScan } {
  const e = dto.expense || {};
  const stored = e.receipts?.length ? e.receipts : dto.attachments || [];
  const files = stored.map((a, i) => ({ index: input.receipts.length + i, name: a.name || 'receipt', size: numOrNull(a.size), type: a.type ?? null, key: a.key ?? null }));
  const receipts = [...input.receipts, ...files.filter((f) => !input.receipts.some((a) => a.key && a.key === f.key))];
  if (!dto.read) {
    return { input: { ...input, receipts }, scan: { status: 'unread', message: dto.message || 'The bill could not be read. Fill the expense by hand.', missing: [] } };
  }
  const suggested = numOrNull(e.category_id);
  const categoryId = suggested && offered(suggested) ? suggested : input.categoryId;
  const bill = toBillModel(e.bill);
  const amount = numOrNull(e.amount) ?? bill?.totals.grand ?? null;
  const missing = new Set((dto.missing || []).filter((m) => typeof m === 'string'));
  if (categoryId) missing.delete('category_id');
  else missing.add('category_id');
  if (amount !== null && amount > 0) missing.delete('amount');
  return {
    input: {
      ...input,
      categoryId,
      expenseDate: e.expense_date ? dateOnly(e.expense_date) : '',
      amount: amount !== null && amount > 0 ? String(amount) : '',
      merchant: str(e.merchant) ?? '',
      description: str(e.description) ?? '',
      purpose: input.purpose || str(dto.purpose) || '',
      invoiceNo: str(e.invoice_no) ?? '',
      sellerGstin: str(e.seller_gstin),
      aiScanned: e.ai_scanned !== false,
      extracted: e.extracted && typeof e.extracted === 'object' ? e.extracted : null,
      bill,
      amountFromBill: amount !== null && amount > 0 && amountMatchesBill(amount, bill),
      receipts,
      paymentMode: toPaymentMode(e.payment_mode) ?? input.paymentMode,
    },
    scan: { status: 'read', message: null, missing: [...missing] },
  };
}

/**
 * Builds the create/preview body. Receipts without a stored `key` cannot be re-attached and are
 * dropped. The server recomputes the bill; client totals are never trusted.
 */
export function toExpenseBody(input: ExpenseInput): ExpenseRequestDto {
  return {
    wallet_id: input.walletId ?? 0,
    category_id: input.categoryId ?? 0,
    expense_date: input.expenseDate,
    amount: input.amount === '' ? 0 : Number(input.amount),
    merchant: input.merchant.trim() || undefined,
    description: input.description.trim() || undefined,
    purpose: input.purpose.trim() || undefined,
    invoice_no: input.invoiceNo.trim() || undefined,
    seller_gstin: input.sellerGstin || undefined,
    payment_mode: input.paymentMode,
    payment_reference: input.paymentReference.trim() || undefined,
    receipts: sentFiles(input.receipts),
    payment_proofs: sentFiles(input.paymentProofs),
    ...(input.bill ? { bill: toBillDto(input.bill) } : {}),
    ...(input.aiScanned ? { ai_scanned: true } : {}),
    ...(input.extracted ? { extracted: input.extracted } : {}),
    ...(input.spentBy ? { spent_by: input.spentBy } : {}),
  };
}

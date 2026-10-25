import { apiClient } from '@/lib/apiClient';
import type { CategoryDto as ManagedCategoryDto, CategoryListResponseDto as ManagedCategoryListDto } from '@/features/reimbursement/types/reimbursement.dto';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type { PagedDto, UploadedFileDto } from '@/features/expense-bills/types/bill.dto';
import type {
  CashCountRequestDto,
  CategoryDto,
  ExpenseDetailDto,
  ExpenseListResponseDto,
  ExpensePreviewDto,
  ExpenseRequestDto,
  ExpensesExportRequestDto,
  FundRequestDetailDto,
  FundRequestDto,
  FundRequestRequestDto,
  InwardBulkResultDto,
  InwardListResponseDto,
  PaperBulkResultDto,
  ReceiveGoodsBodyDto,
  MyExpenseListResponseDto,
  MyOverviewDto,
  MyWalletDetailDto,
  OverviewDto,
  PayFundRequestDto,
  ReceiptScanDto,
  SettingsResponseDto,
  StatementExportRequestDto,
  TopUpRequestDto,
  WalletDetailDto,
  WalletListResponseDto,
  WalletRequestDto,
  WalletUpdateDto,
} from '../types/petty-cash.dto';

const auth = { withAuth: true };
const BASE = '/petty-cash';

/** Filters read the same way by `GET /expenses`, `GET /inward`, `GET /me/expenses` and the exports. */
export interface ExpenseQuery {
  status?: string;
  walletId?: number | null;
  siteId?: number | null;
  /** HR lists only: one company (sub-organization). */
  subOrgId?: number | null;
  categoryId?: number | null;
  spentBy?: number | null;
  paymentMode?: string | null;
  physical?: string | null;
  inward?: string | null;
  from?: string;
  to?: string;
  minAmount?: string;
  maxAmount?: string;
  flagged?: boolean;
  search?: string;
}

const amountParam = (v: string | undefined) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : undefined);

export function expenseQuery(p: ExpenseQuery) {
  return {
    status: p.status || undefined,
    wallet_id: p.walletId ?? undefined,
    site_id: p.siteId ?? undefined,
    sub_organization_id: p.subOrgId ?? undefined,
    category_id: p.categoryId ?? undefined,
    spent_by: p.spentBy ?? undefined,
    payment_mode: p.paymentMode || undefined,
    physical: p.physical || undefined,
    inward: p.inward || undefined,
    from: p.from || undefined,
    to: p.to || undefined,
    min_amount: amountParam(p.minAmount),
    max_amount: amountParam(p.maxAmount),
    flagged: p.flagged ? 1 : undefined,
    search: p.search || undefined,
  };
}

// ── Employee (/me) ──────────────────────────────────────────────────────────

export function getMyOverview() {
  return apiClient.get<MyOverviewDto>(`${BASE}/me/overview`, undefined, auth);
}

export function listMyExpenses(p: ExpenseQuery & { page: number; pageSize: number }) {
  return apiClient.get<MyExpenseListResponseDto>(`${BASE}/me/expenses`, { ...expenseQuery(p), page: p.page, pageSize: p.pageSize }, auth);
}

export function getMyExpense(id: number) {
  return apiClient.get<ExpenseDetailDto>(`${BASE}/me/expenses/${id}`, undefined, auth);
}

export function previewMyExpense(body: ExpenseRequestDto, signal?: AbortSignal) {
  return apiClient<ExpensePreviewDto>(`${BASE}/me/expenses/preview`, { method: 'POST', body, withAuth: true, signal });
}

export function createMyExpense(body: ExpenseRequestDto) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/me/expenses`, body, auth);
}

export function cancelMyExpense(id: number) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/me/expenses/${id}/cancel`, {}, auth);
}

export function getMyWalletDetail(walletId: number, params: { page?: number; pageSize?: number } = {}) {
  return apiClient.get<MyWalletDetailDto>(`${BASE}/me/wallets/${walletId}`, { page: params.page, pageSize: params.pageSize }, auth);
}

/** Answers with the new count's `id` and the wallet as `GET /wallets/:id` shows it. */
export function recordMyCashCount(walletId: number, body: CashCountRequestDto) {
  return apiClient.post<WalletDetailDto & { id: number }>(`${BASE}/me/wallets/${walletId}/cash-counts`, body, auth);
}

export function listMyFundRequests(params: { page?: number; pageSize?: number } = {}) {
  return apiClient.get<PagedDto<FundRequestDto>>(`${BASE}/me/fund-requests`, { page: params.page, pageSize: params.pageSize }, auth);
}

export function askForFunds(body: FundRequestRequestDto) {
  return apiClient.post<FundRequestDto>(`${BASE}/me/fund-requests`, body, auth);
}

export function cancelMyFundRequest(id: number) {
  return apiClient.post<FundRequestDto>(`${BASE}/me/fund-requests/${id}/cancel`, {}, auth);
}

// ── HR / accounts ───────────────────────────────────────────────────────────

export function getOverview() {
  return apiClient.get<OverviewDto>(`${BASE}/overview`, undefined, auth);
}

export function getSettings() {
  return apiClient.get<SettingsResponseDto>(`${BASE}/settings`, undefined, auth);
}

export function saveSettings(body: unknown) {
  return apiClient.put<SettingsResponseDto>(`${BASE}/settings`, body, auth);
}

export function resetSettingsOverride(subOrgId: number) {
  return apiClient.delete<SettingsResponseDto>(`${BASE}/settings/overrides/${subOrgId}`, auth);
}

export function listCategories() {
  return apiClient.get<{ items: CategoryDto[] } | CategoryDto[]>(`${BASE}/categories`, undefined, auth);
}

/** Body of a petty cash category: always a plain amount, so no kind or applies-to. */
export interface CategoryBody {
  name: string;
  code?: string;
  icon?: string;
  description?: string | null;
  gl_code?: string | null;
  sort_order?: number;
  sub_organization_id?: number | null;
  needs_inward?: boolean;
}

/** HR: every category (active and inactive) with the icon set and starter suggestions. */
export function listManagedCategories() {
  return apiClient.get<ManagedCategoryListDto>(`${BASE}/categories/manage`, { status: 'all' }, auth);
}

export function createCategory(body: CategoryBody) {
  return apiClient.post<ManagedCategoryDto>(`${BASE}/categories`, body, auth);
}

export function updateCategory(id: number, body: CategoryBody) {
  return apiClient.put<ManagedCategoryDto>(`${BASE}/categories/${id}`, body, auth);
}

export function setCategoryStatus(id: number, status: 'active' | 'inactive') {
  return apiClient.patch<ManagedCategoryDto>(`${BASE}/categories/${id}/status`, { status }, auth);
}

export function seedCategories(codes?: string[]) {
  return apiClient.post<ManagedCategoryListDto>(`${BASE}/categories/seed`, codes ? { codes } : {}, auth);
}

export interface ListWalletsParams {
  status?: string | null;
  balance?: 'low' | 'negative' | null;
  siteId?: number | null;
  subOrgId?: number | null;
  search?: string;
  sort?: string;
  page: number;
  pageSize: number;
}

export function listWallets(p: ListWalletsParams) {
  return apiClient.get<WalletListResponseDto>(
    `${BASE}/wallets`,
    {
      status: p.status || undefined,
      balance: p.balance || undefined,
      site_id: p.siteId ?? undefined,
      sub_organization_id: p.subOrgId ?? undefined,
      search: p.search || undefined,
      sort: p.sort || undefined,
      page: p.page,
      pageSize: p.pageSize,
    },
    auth
  );
}

export function createWallet(body: WalletRequestDto) {
  return apiClient.post<WalletDetailDto>(`${BASE}/wallets`, body, auth);
}

export function updateWallet(id: number, body: WalletUpdateDto) {
  return apiClient.put<WalletDetailDto>(`${BASE}/wallets/${id}`, body, auth);
}

export function getWallet(id: number, params: { page: number; pageSize: number; from?: string; to?: string }) {
  return apiClient.get<WalletDetailDto>(`${BASE}/wallets/${id}`, { page: params.page, pageSize: params.pageSize, from: params.from || undefined, to: params.to || undefined }, auth);
}

export function topUpWallet(id: number, body: TopUpRequestDto) {
  return apiClient.post<WalletDetailDto & { posted: { id: number; balance_after: number } }>(`${BASE}/wallets/${id}/top-up`, body, auth);
}

export function returnFromWallet(id: number, body: { amount: number; reference?: string; note?: string; date?: string }) {
  return apiClient.post<WalletDetailDto>(`${BASE}/wallets/${id}/return`, body, auth);
}

export function adjustWallet(id: number, body: { amount: number; note: string }) {
  return apiClient.post<WalletDetailDto>(`${BASE}/wallets/${id}/adjust`, body, auth);
}

export function setWalletState(id: number, action: 'freeze' | 'unfreeze' | 'close' | 'reopen', note?: string) {
  return apiClient.post<WalletDetailDto>(`${BASE}/wallets/${id}/${action}`, note ? { note } : {}, auth);
}

export function recordCashCount(walletId: number, body: CashCountRequestDto) {
  return apiClient.post<WalletDetailDto & { id: number }>(`${BASE}/wallets/${walletId}/cash-counts`, body, auth);
}

export function adjustCashCount(walletId: number, countId: number) {
  return apiClient.post<WalletDetailDto>(`${BASE}/wallets/${walletId}/cash-counts/${countId}/adjust`, {}, auth);
}

export function listExpenses(p: ExpenseQuery & { sort?: string; page: number; pageSize: number }) {
  return apiClient.get<ExpenseListResponseDto>(`${BASE}/expenses`, { ...expenseQuery(p), sort: p.sort || undefined, page: p.page, pageSize: p.pageSize }, auth);
}

export function getExpense(id: number) {
  return apiClient.get<ExpenseDetailDto>(`${BASE}/expenses/${id}`, undefined, auth);
}

/** HR entering an expense on behalf of `spent_by`. */
export function previewExpense(body: ExpenseRequestDto, signal?: AbortSignal) {
  return apiClient<ExpensePreviewDto>(`${BASE}/expenses/preview`, { method: 'POST', body, withAuth: true, signal });
}

export function createExpense(body: ExpenseRequestDto) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/expenses`, body, auth);
}

export function cancelExpense(id: number, reason: string) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/expenses/${id}/cancel`, { reason }, auth);
}

/** Receives goods of one expense: everything pending (`all`) or the given quantities. Every received item gets its own inward number. */
export function receiveGoods(id: number, body: ReceiveGoodsBodyDto) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/expenses/${id}/inward`, body, auth);
}

/** Takes one receipt back (its number is not reused). */
export function undoGoodsReceipt(id: number, receiptId: number, body: { note?: string } = {}) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/expenses/${id}/inward/${receiptId}/undo`, body, auth);
}

/** Bulk: receives all pending goods of the expenses, one inward number per item (`auto` asks for generated numbers in typed mode). */
export function receiveGoodsBulk(body: { ids: number[]; auto?: boolean; note?: string }) {
  return apiClient.post<InwardBulkResultDto>(`${BASE}/expenses/inward`, body, auth);
}

/** The paper bill: a yes/no with no number. */
export function setPaperCopy(id: number, body: { received: boolean; note?: string }) {
  return apiClient.post<ExpenseDetailDto>(`${BASE}/expenses/${id}/paper-copy`, body, auth);
}

export function setPaperCopyBulk(body: { ids: number[]; received: boolean; note?: string }) {
  return apiClient.post<PaperBulkResultDto>(`${BASE}/expenses/paper-copy`, body, auth);
}

/** The goods register: orders itself (newest inward first when `inward=received`, else by date). */
export function listInward(p: ExpenseQuery & { page: number; pageSize: number }) {
  return apiClient.get<InwardListResponseDto>(`${BASE}/inward`, { ...expenseQuery(p), page: p.page, pageSize: p.pageSize }, auth);
}

/** Presigned link to a receipt or payment proof (`me` for the spender's own, `hr` for staff and approvers). */
export function expenseFileUrl(scope: 'me' | 'hr', expenseId: number, kind: 'receipt' | 'payment', index: number) {
  const root = scope === 'me' ? `${BASE}/me/expenses/${expenseId}` : `${BASE}/expenses/${expenseId}`;
  return apiClient.get<{ url: string; expires_in?: number }>(`${root}/files/${kind}/${index}`, undefined, auth);
}

export function listFundRequests(params: { status?: string; walletId?: number | null; search?: string; page?: number; pageSize?: number }) {
  return apiClient.get<PagedDto<FundRequestDto>>(
    `${BASE}/fund-requests`,
    { status: params.status || undefined, wallet_id: params.walletId ?? undefined, search: params.search || undefined, page: params.page, pageSize: params.pageSize },
    auth
  );
}

export function getFundRequest(id: number) {
  return apiClient.get<FundRequestDetailDto>(`${BASE}/fund-requests/${id}`, undefined, auth);
}

export function payFundRequest(id: number, body: PayFundRequestDto) {
  return apiClient.post<FundRequestDto>(`${BASE}/fund-requests/${id}/pay`, body, auth);
}

// ── Files, scan and exports ─────────────────────────────────────────────────

export type UploadScope = 'me' | 'hr';

/**
 * `me` → `/me/attachments`; `hr` → `/attachments` (PC_FUND / PC_ADMIN). HR entering an expense for an
 * employee passes `employeeId` so the file lands in that employee's folder (the expense refuses files
 * from any other folder); without it the file is HR's own (proof for top-ups and payments).
 */
export function uploadAttachment(file: File, scope: UploadScope = 'me', employeeId?: number | null) {
  const form = new FormData();
  form.append('file', file);
  const path = scope === 'me' ? `${BASE}/me/attachments` : `${BASE}/attachments${employeeId ? `?employee_id=${employeeId}` : ''}`;
  return apiClient.post<UploadedFileDto>(path, form, auth);
}

/** Stores one bill (≤5 photos of its pages, or one PDF) and reads it with AI. `hr` files it for `employeeId`. */
export function scanReceipt(files: File[], scope: 'me' | 'hr', employeeId?: number | null, signal?: AbortSignal) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const path = scope === 'me' ? `${BASE}/me/receipts/scan` : `${BASE}/receipts/scan${employeeId ? `?employee_id=${employeeId}` : ''}`;
  return apiClient<ReceiptScanDto>(path, { method: 'POST', body: form, withAuth: true, signal });
}

/** Download Centre jobs. `hr` → `petty-cash-expenses`; `me` → `my-petty-cash-expenses`. */
export function exportExpenses(scope: 'me' | 'hr', body: ExpensesExportRequestDto) {
  return apiClient.post<ExportJobDto>(scope === 'me' ? '/exports/my-petty-cash-expenses' : '/exports/petty-cash-expenses', body, auth);
}

export function exportStatement(body: StatementExportRequestDto) {
  return apiClient.post<ExportJobDto>('/exports/petty-cash-statement', body, auth);
}

export function exportInwardRegister(body: ExpensesExportRequestDto) {
  return apiClient.post<ExportJobDto>('/exports/petty-cash-inward-register', body, auth);
}

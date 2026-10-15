import { apiClient } from '@/lib/apiClient';
import type { ExportJobDto } from '@/features/downloads/types/downloads.dto';
import type {
  CategoryDto,
  CategoryListResponseDto,
  CategoryRequestDto,
  ClaimDetailDto,
  ClaimListResponseDto,
  ClaimPreviewDto,
  ClaimRequestDto,
  ClaimsExportRequestDto,
  FundRequestDto,
  MyOverviewDto,
  MyWalletResponseDto,
  OpenWalletsResultDto,
  OverviewDto,
  PagedDto,
  PayRequestDto,
  PayoutModeDto,
  PhysicalCopyBulkResultDto,
  ReceiptScanDto,
  UploadedFileDto,
  WalletDetailDto,
  WalletDto,
  WalletListResponseDto,
  WalletStatementExportRequestDto,
} from '../types/reimbursement.dto';

const auth = { withAuth: true };
const BASE = '/reimbursement';

// ── Employee (/me) ──────────────────────────────────────────────────────────

export function getMyOverview() {
  return apiClient.get<MyOverviewDto>(`${BASE}/me/overview`, undefined, auth);
}

/** Filters read the same way by `GET /claims`, `GET /me/claims` and the claim exports. */
export interface ClaimFilterParams {
  status: string;
  channel?: string | null;
  payoutMode?: string | null;
  /** How a line was paid. */
  paymentMode?: string | null;
  categoryId?: number | null;
  /** HR only. */
  departmentId?: number | null;
  /** HR only: the employee's primary site. */
  siteId?: number | null;
  /** HR only. */
  employeeId?: number | null;
  /** Paper bill: `pending` (to collect), `collected` or `optional`. */
  physical?: string | null;
  /** Submitted on. */
  from?: string;
  to?: string;
  /** Expense (line) date. */
  spentFrom?: string;
  spentTo?: string;
  /** Bill (invoice) date. */
  billFrom?: string;
  billTo?: string;
  search?: string;
}

function claimFilterQuery(p: ClaimFilterParams) {
  return {
    status: p.status,
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

export function listMyClaims(params: Omit<ClaimFilterParams, 'departmentId' | 'siteId' | 'employeeId'> & { page: number; pageSize: number }) {
  return apiClient.get<ClaimListResponseDto>(`${BASE}/me/claims`, { ...claimFilterQuery(params), page: params.page, pageSize: params.pageSize }, auth);
}

export function getMyClaim(id: number) {
  return apiClient.get<ClaimDetailDto>(`${BASE}/me/claims/${id}`, undefined, auth);
}

export function previewMyClaim(body: ClaimRequestDto, claimId: number | null, signal?: AbortSignal) {
  const path = claimId ? `${BASE}/me/claims/${claimId}/preview` : `${BASE}/me/claims/preview`;
  return apiClient<ClaimPreviewDto>(path, { method: 'POST', body, withAuth: true, signal });
}

export function createMyClaim(body: ClaimRequestDto) {
  return apiClient.post<ClaimDetailDto>(`${BASE}/me/claims`, body, auth);
}

export function updateMyClaim(id: number, body: ClaimRequestDto) {
  return apiClient.put<ClaimDetailDto>(`${BASE}/me/claims/${id}`, body, auth);
}

export function cancelMyClaim(id: number) {
  return apiClient.post<ClaimDetailDto | { deleted: true }>(`${BASE}/me/claims/${id}/cancel`, {}, auth);
}

export function getMyWallet(params: { page: number; pageSize: number; from?: string; to?: string }) {
  return apiClient.get<MyWalletResponseDto>(
    `${BASE}/me/wallet`,
    { page: params.page, pageSize: params.pageSize, from: params.from || undefined, to: params.to || undefined },
    auth
  );
}

export function listMyFundRequests(params: { page?: number; pageSize?: number } = {}) {
  return apiClient.get<PagedDto<FundRequestDto>>(`${BASE}/me/fund-requests`, { page: params.page, pageSize: params.pageSize }, auth);
}

export function askForFunds(body: { amount: number; reason: string; attachments?: Array<{ key: string; name: string; size: number | null; type: string | null }> }) {
  return apiClient.post<FundRequestDto>(`${BASE}/me/fund-requests`, body, auth);
}

export function cancelMyFundRequest(id: number) {
  return apiClient.post<FundRequestDto>(`${BASE}/me/fund-requests/${id}/cancel`, {}, auth);
}

// ── HR / Accounts ───────────────────────────────────────────────────────────

export function getOverview(params: { subOrgId?: number | null } = {}) {
  return apiClient.get<OverviewDto>(`${BASE}/overview`, { subOrgId: params.subOrgId ?? undefined }, auth);
}

export interface ListClaimsParams extends ClaimFilterParams {
  sort?: string;
  subOrgId?: number | null;
  page: number;
  pageSize: number;
}

export function listClaims(p: ListClaimsParams) {
  return apiClient.get<ClaimListResponseDto>(
    `${BASE}/claims`,
    { ...claimFilterQuery(p), sort: p.sort, subOrgId: p.subOrgId ?? undefined, page: p.page, pageSize: p.pageSize },
    auth
  );
}

/** HR filing for an employee: same live check as the employee's preview (`employee_id` in the body). */
export function previewClaim(body: ClaimRequestDto, signal?: AbortSignal) {
  return apiClient<ClaimPreviewDto>(`${BASE}/claims/preview`, { method: 'POST', body, withAuth: true, signal });
}

export function createClaim(body: ClaimRequestDto) {
  return apiClient.post<ClaimDetailDto>(`${BASE}/claims`, body, auth);
}

export function getClaim(id: number) {
  return apiClient.get<ClaimDetailDto>(`${BASE}/claims/${id}`, undefined, auth);
}

export function payClaim(id: number, body: PayRequestDto) {
  return apiClient.post<ClaimDetailDto>(`${BASE}/claims/${id}/pay`, body, auth);
}

export function setPayoutMode(id: number, payoutMode: PayoutModeDto) {
  return apiClient.put<ClaimDetailDto>(`${BASE}/claims/${id}/payout-mode`, { payout_mode: payoutMode }, auth);
}

export function cancelClaim(id: number, reason: string) {
  return apiClient.post<ClaimDetailDto>(`${BASE}/claims/${id}/cancel`, { reason }, auth);
}

/** Paper bill of one claim: `collected` (default) or back to `pending`. REIMB_PHYSICAL_COLLECT. */
export function setPhysicalCopy(id: number, body: { status?: 'collected' | 'pending'; note?: string }) {
  return apiClient.post<ClaimDetailDto>(`${BASE}/claims/${id}/physical-copy`, body, auth);
}

/** Marks the paper bills of up to 200 claims; claims that cannot change come back in `skipped`. */
export function setPhysicalCopies(body: { ids: number[]; status?: 'collected' | 'pending'; note?: string }) {
  return apiClient.post<PhysicalCopyBulkResultDto>(`${BASE}/claims/physical-copy`, body, auth);
}

/**
 * Presigned link to a line receipt, a line's proof of how the employee paid (`payment: true`), or
 * (`'proof'`) the proof that the claim was paid back.
 */
export function claimFileUrl(scope: 'me' | 'hr', claimId: number, file: { lineId: number; index: number; payment?: boolean } | 'proof') {
  const root = scope === 'me' ? `${BASE}/me/claims/${claimId}` : `${BASE}/claims/${claimId}`;
  const path = file === 'proof' ? `${root}/proof` : `${root}/lines/${file.lineId}/${file.payment ? 'payment-proofs' : 'files'}/${file.index}`;
  return apiClient.get<{ url: string; expires_in?: number }>(path, undefined, auth);
}

// ── Categories ──────────────────────────────────────────────────────────────

export function listCategories(params: { status?: string } = {}) {
  return apiClient.get<CategoryListResponseDto>(`${BASE}/categories`, { status: params.status || undefined }, auth);
}

export function createCategory(body: CategoryRequestDto) {
  return apiClient.post<CategoryDto>(`${BASE}/categories`, body, auth);
}

export function updateCategory(id: number, body: CategoryRequestDto) {
  return apiClient.put<CategoryDto>(`${BASE}/categories/${id}`, body, auth);
}

export function setCategoryStatus(id: number, status: 'active' | 'inactive') {
  return apiClient.patch<CategoryDto>(`${BASE}/categories/${id}/status`, { status }, auth);
}

export function seedCategories(codes?: string[]) {
  return apiClient.post<CategoryListResponseDto>(`${BASE}/categories/seed`, codes ? { codes } : {}, auth);
}

// ── Wallets ─────────────────────────────────────────────────────────────────

export interface ListWalletsParams {
  status?: string | null;
  balance?: 'negative' | 'low' | null;
  lowBelow?: number | null;
  search?: string;
  departmentId?: number | null;
  sort?: string;
  subOrgId?: number | null;
  page: number;
  pageSize: number;
}

export function listWallets(p: ListWalletsParams) {
  return apiClient.get<WalletListResponseDto>(
    `${BASE}/wallets`,
    {
      status: p.status || undefined,
      balance: p.balance || undefined,
      low_below: p.lowBelow ?? undefined,
      search: p.search || undefined,
      department_id: p.departmentId ?? undefined,
      sort: p.sort || undefined,
      subOrgId: p.subOrgId ?? undefined,
      page: p.page,
      pageSize: p.pageSize,
    },
    auth
  );
}

export function openWallets(body: { employee_ids: number[]; initial_amount?: number; reference?: string }) {
  return apiClient.post<OpenWalletsResultDto>(`${BASE}/wallets`, body, auth);
}

export function getWallet(id: number, params: { page: number; pageSize: number; from?: string; to?: string }) {
  return apiClient.get<WalletDetailDto>(
    `${BASE}/wallets/${id}`,
    { page: params.page, pageSize: params.pageSize, from: params.from || undefined, to: params.to || undefined },
    auth
  );
}

export function topUpWallet(id: number, body: { amount: number; reference: string; date?: string; note?: string; proof?: string }) {
  return apiClient.post<WalletDto>(`${BASE}/wallets/${id}/top-up`, body, auth);
}

export function takeBackFromWallet(id: number, body: { amount: number; reference?: string; note?: string; date?: string }) {
  return apiClient.post<WalletDto>(`${BASE}/wallets/${id}/return`, body, auth);
}

export function adjustWallet(id: number, body: { amount: number; note: string }) {
  return apiClient.post<WalletDto>(`${BASE}/wallets/${id}/adjust`, body, auth);
}

export function setWalletState(id: number, action: 'freeze' | 'unfreeze' | 'close' | 'reopen', note?: string) {
  return apiClient.post<WalletDto>(`${BASE}/wallets/${id}/${action}`, note ? { note } : {}, auth);
}

export function listFundRequests(params: { status?: string; walletId?: number | null; search?: string; subOrgId?: number | null; page?: number; pageSize?: number }) {
  return apiClient.get<PagedDto<FundRequestDto>>(
    `${BASE}/fund-requests`,
    {
      status: params.status || undefined,
      wallet_id: params.walletId ?? undefined,
      search: params.search || undefined,
      subOrgId: params.subOrgId ?? undefined,
      page: params.page,
      pageSize: params.pageSize,
    },
    auth
  );
}

export function payFundRequest(id: number, body: PayRequestDto) {
  return apiClient.post<FundRequestDto>(`${BASE}/fund-requests/${id}/pay`, body, auth);
}

/** Presigned link to a file on a fund request: `me` for the employee's own, `hr` for wallet staff or the current approver. */
export function fundRequestFileUrl(scope: 'me' | 'hr', fundRequestId: number, index: number) {
  const root = scope === 'me' ? `${BASE}/me/fund-requests` : `${BASE}/fund-requests`;
  return apiClient.get<{ url: string; expires_in?: number }>(`${root}/${fundRequestId}/files/${index}`, undefined, auth);
}

// ── Files & exports ─────────────────────────────────────────────────────────

export type UploadScope = 'me' | 'hr' | 'proof';

/** `me` → the employee's own receipts; `hr` → receipts into an employee's folder; `proof` → payment proofs. */
export function uploadAttachment(file: File, scope: UploadScope = 'me', employeeId?: number | null) {
  const form = new FormData();
  form.append('file', file);
  if (scope === 'me') return apiClient.post<UploadedFileDto>(`${BASE}/me/attachments`, form, auth);
  const query = scope === 'hr' && employeeId ? `?employee_id=${employeeId}` : '';
  return apiClient.post<UploadedFileDto>(`${BASE}/attachments${query}`, form, auth);
}

/**
 * Stores one bill and reads it with AI (feature `REIMBURSEMENT_AI`): the photos of its pages in order
 * (up to 5) or one PDF, sent as multipart `files`. `me` → the employee's own; `hr` → filing for
 * `employeeId`. Always 200 once stored; `read:false` means fill it by hand.
 */
export function scanReceipt(files: File[], scope: 'me' | 'hr', employeeId?: number | null, signal?: AbortSignal) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  const path = scope === 'me' ? `${BASE}/me/receipts/scan` : `${BASE}/receipts/scan${employeeId ? `?employee_id=${employeeId}` : ''}`;
  return apiClient<ReceiptScanDto>(path, { method: 'POST', body: form, withAuth: true, signal });
}

/** Download Centre jobs. `hr` → `expense-claims`; `me` → `my-expenses` (own claims). */
export function exportClaims(scope: 'me' | 'hr', body: ClaimsExportRequestDto) {
  return apiClient.post<ExportJobDto>(scope === 'me' ? '/exports/my-expenses' : '/exports/expense-claims', body, auth);
}

/** `hr` → `expense-wallet-statement` (all wallets, or `wallet_id`); `me` → `my-expense-wallet`. */
export function exportWalletStatement(scope: 'me' | 'hr', body: WalletStatementExportRequestDto) {
  return apiClient.post<ExportJobDto>(scope === 'me' ? '/exports/my-expense-wallet' : '/exports/expense-wallet-statement', body, auth);
}

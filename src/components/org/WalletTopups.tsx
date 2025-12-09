"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Eye,
  Plus,
  Filter,
  Search,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  Building,
  Wallet,
  DollarSign,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

type Wallet = {
  id: number;
  site_id: number;
  site_name?: string;
  name: string;
  currency?: string;
  current_balance: number;
};

type Transaction = {
  id: number;
  wallet_id: number;
  site_id: number;
  payment_mode: "Cash" | "Bank" | "UPI" | "Card" | "Other";
  type: "Credit" | "Debit";
  reference_type: "Expense" | "TopUp" | "Adjustment" | "Refund" | "Transfer";
  transaction_id?: number | null;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  attachment_url?: string | null;
  remarks?: string | null;
  added_by?: number | null;
  created_at: string;
};

const paymentModes = ["Cash", "Bank", "UPI", "Card", "Other"] as const;

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor(progress * (Number.isFinite(target) ? target : 0)));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return value;
}

export default function WalletTopups() {
  const router = useRouter();
  const pathname = usePathname();

  // Permissions
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
  const hasPerm = React.useCallback((code: string) => {
    const list = (permissions || []).map((p) => (p || '').toUpperCase());
    return list.includes((code || '').toUpperCase());
  }, [permissions]);
  const isWalletAdmin = hasPerm('WALLET_ADMIN');
  const canView = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_TOPUP');
  const canTopup = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_TOPUP');

  // Data State
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);

  // UI State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [txPage, setTxPage] = useState(1);
  const [txLimit, setTxLimit] = useState(10);

  // Sites filtering
  const [sites, setSites] = useState<{ id: number; name: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

  // Modals
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  // Topup Form
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [topupMode, setTopupMode] = useState<typeof paymentModes[number]>("Cash");
  const [topupRemarks, setTopupRemarks] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittingTopup, setSubmittingTopup] = useState(false);

  // Stats animation
  const walletCount = useCountUp(total || 0);
  const totalBalance = useCountUp(
    wallets.reduce((sum, wallet) => {
      const val = typeof wallet.current_balance === 'number'
        ? wallet.current_balance
        : parseFloat(String(wallet.current_balance ?? '0')) || 0;
      return sum + val;
    }, 0)
  );
  const avgBalance = useCountUp(
    wallets.length > 0
      ? wallets.reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0) / wallets.length
      : 0
  );
  const lowBalanceCount = useCountUp(wallets.filter(w => w.current_balance < 1000).length);

  // Filtered wallets
  const filteredWallets = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return wallets.filter(wallet =>
      q ?
        (wallet.site_name || '').toLowerCase().includes(q) ||
        (wallet.name || '').toLowerCase().includes(q) ||
        (wallet.currency || '').toLowerCase().includes(q)
        : true
    ).slice((page - 1) * limit, page * limit);
  }, [wallets, searchQuery, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Notification helper
  const showNotification = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('notification-container') || (() => {
      const div = document.createElement('div');
      div.id = 'notification-container';
      div.style.position = 'fixed';
      div.style.top = '20px';
      div.style.right = '20px';
      div.style.zIndex = '9999';
      document.body.appendChild(div);
      return div;
    })();

    const notification = document.createElement('div');
    notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`;

    const icon = document.createElement('div');
    icon.className = `p-2 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`;
    icon.innerHTML = type === 'success'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    const content = document.createElement('div');
    content.className = 'flex-1';
    content.innerHTML = `<p class="${type === 'success' ? 'text-green-800' : 'text-red-800'} font-medium">${message}</p>`;

    notification.appendChild(icon);
    notification.appendChild(content);
    container.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
      }, 500);
    }, 5000);
  };

  // Load session and permissions
  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET", withAuth: true });
        setRole(session.role || null);
        const perms = (session.employee?.permissions || []).map((p) => (p || '').toUpperCase());
        setPermissions(perms);
      } catch (_) { }
    })();
  }, []);

  // Load sites
  const loadSites = React.useCallback(async () => {
    try {
      if (isOrgAdmin || isWalletAdmin) {
        const res = await apiClient<any>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res) ? res : (res?.sites || res?.rows || []);
        const mapped = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || '-') }));
        setSites(mapped);
        if (mapped.length && selectedSiteId == null) setSelectedSiteId(mapped[0].id);
      } else {
        const res = await apiClient<any>("/attendance/incharge-sites", { method: "GET", withAuth: true });
        const list = Array.isArray(res) ? res : (res?.sites || res?.rows || []);
        const mapped = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || '-') }));
        setSites(mapped);
        if (mapped.length && selectedSiteId == null) setSelectedSiteId(mapped[0].id);
      }
    } catch (_) { }
  }, [isOrgAdmin, isWalletAdmin, selectedSiteId]);

  // Load wallets
  const loadWallets = async (nextPage = page, nextLimit = limit, siteId?: number | null) => {
    setLoadingWallets(true);
    setError(null);
    try {
      const params: any = { page: nextPage, limit: nextLimit };
      if (!isOrgAdmin && !isWalletAdmin && typeof siteId === 'number') {
        params.site_id = String(siteId);
      }
      const res = await apiClient<{ wallets: Wallet[]; total: number; page: number; limit: number }>(
        `/site-wallets`,
        { method: "GET", withAuth: true, params }
      );
      setWallets(res?.wallets || []);
      setTotal(Number(res?.total || 0));
      setPage(Number(res?.page || nextPage));
      setLimit(Number(res?.limit || nextLimit));
    } catch (err: any) {
      setError(err?.message || "Failed to load wallets");
      showNotification(err?.message || "Failed to load wallets", 'error');
    } finally {
      setLoadingWallets(false);
    }
  };

  // Load transactions
  const loadTransactions = async (walletId: number, nextPage = txPage, nextLimit = txLimit) => {
    setTxLoading(true);
    try {
      const res = await apiClient<{ transactions: Transaction[]; total: number; page: number; limit: number }>(
        `/site-wallets/transactions?wallet_id=${walletId}&type=Credit&page=${nextPage}&limit=${nextLimit}`,
        { method: "GET", withAuth: true }
      );
      setTransactions(res?.transactions || []);
      setTxTotal(Number(res?.total || 0));
      setTxPage(Number(res?.page || nextPage));
      setTxLimit(Number(res?.limit || nextLimit));
    } catch (err: any) {
      showNotification(err?.message || "Failed to load transactions", "error");
    } finally {
      setTxLoading(false);
    }
  };

  // Initialize data
  React.useEffect(() => {
    if (canView) {
      loadSites();
    }
  }, [canView, loadSites]);

  React.useEffect(() => {
    if (!canView) return;
    if (isOrgAdmin || isWalletAdmin) {
      loadWallets(1, limit, null);
    } else if (typeof selectedSiteId === 'number') {
      loadWallets(1, limit, selectedSiteId);
    }
  }, [canView, isOrgAdmin, isWalletAdmin, selectedSiteId]);

  // Handle topup submission
  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedWallet) {
      showNotification("Please select a wallet to top up", "error");
      return;
    }
    const amountNum = Number(topupAmount);
    if (!amountNum || amountNum <= 0) {
      showNotification("Enter a valid amount greater than 0", "error");
      return;
    }
    setSubmittingTopup(true);
    try {
      let attachmentUrl: string | null = null;
      if (attachmentFile) {
        const allowed = ["image/png", "image/jpeg", "application/pdf"];
        if (!allowed.includes(attachmentFile.type)) {
          const msg = "Unsupported file type. Allowed: PNG, JPEG, PDF";
          setAttachmentError(msg);
          throw new Error(msg);
        }
        if (attachmentFile.size > 5 * 1024 * 1024) {
          const msg = "File too large. Max size is 5 MB";
          setAttachmentError(msg);
          throw new Error(msg);
        }
        const fd = new FormData();
        fd.append("files", attachmentFile);
        const uploadRes = await apiClient<{ success: boolean; files: { url: string }[] }>(
          `/files/org-upload/wallet-attachments`,
          { method: "POST", body: fd }
        );
        attachmentUrl = uploadRes?.files?.[0]?.url || null;
      }
      await apiClient(`/site-wallets/topup`, {
        method: "POST",
        body: {
          wallet_id: selectedWallet.id,
          payment_mode: topupMode,
          amount: amountNum,
          transaction_id: transactionId ? Number(transactionId) : null,
          attachment_url: attachmentUrl,
          remarks: topupRemarks || null,
        },
      });
      showNotification("Topup successful", "success");
      setTopupAmount("");
      setTopupRemarks("");
      setTransactionId("");
      setAttachmentFile(null);
      setAttachmentError(null);
      setShowTopupModal(false);
      await loadWallets(page, limit);
      if (showTransactionsModal && selectedWallet) {
        await loadTransactions(selectedWallet.id, 1, txLimit);
      }
    } catch (err: any) {
      const msg = err?.message || "Topup failed";
      setFormError(msg);
      showNotification(msg, "error");
    } finally {
      setSubmittingTopup(false);
    }
  };

  // View wallet transactions
  const onViewWallet = async (wallet: Wallet) => {
    setSelectedWallet(wallet);
    await loadTransactions(wallet.id, 1, txLimit);
    setShowTransactionsModal(true);
  };

  const openAttachment = (url?: string | null) => {
    if (!url) return;
    setAttachmentUrl(url);
    setShowAttachmentModal(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get balance status
  const getBalanceStatus = (balance: number) => {
    if (balance < 1000) return { text: 'Low', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    if (balance < 5000) return { text: 'Adequate', color: 'text-orange-600 bg-orange-50', icon: AlertCircle };
    return { text: 'Healthy', color: 'text-green-600 bg-green-50', icon: CheckCircle };
  };

  // Action Dropdown Component
  const ActionDropdown = ({ wallet }: { wallet: Wallet }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                {canTopup && (
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet);
                      setShowTopupModal(true);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Topup Wallet</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onViewWallet(wallet);
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Transactions</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Loading State
  if (loadingWallets && wallets.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Wallet Topups</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage wallet topups and transactions</p>
            </div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-50 border-b border-gray-200"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 border-b border-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (!canView) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Wallet Topups</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage wallet topups and transactions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view wallet topups.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topup Modal */}
      {showTopupModal && selectedWallet && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Topup Wallet</h3>
                <button
                  onClick={() => setShowTopupModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <form onSubmit={handleTopupSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="space-y-6">
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-red-800">
                      <AlertCircle className="w-5 h-5" />
                      <span>{formError}</span>
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Wallet Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Site:</span>
                      <p className="font-medium">{selectedWallet.site_name || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Wallet:</span>
                      <p className="font-medium">{selectedWallet.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Currency:</span>
                      <p className="font-medium">{selectedWallet.currency || 'INR'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Balance:</span>
                      <p className="font-medium">{formatCurrency(selectedWallet.current_balance)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                    <select
                      value={topupMode}
                      onChange={(e) => setTopupMode(e.target.value as typeof paymentModes[number])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {paymentModes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Optional reference ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachment</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,application/pdf"
                    onChange={(e) => {
                      setAttachmentError(null);
                      const f = e.target.files?.[0] || null;
                      if (!f) { setAttachmentFile(null); return; }
                      const allowed = ["image/png", "image/jpeg", "application/pdf"];
                      if (!allowed.includes(f.type)) {
                        setAttachmentError("Unsupported file type. Allowed: PNG, JPEG, PDF");
                        setAttachmentFile(null);
                        return;
                      }
                      if (f.size > 5 * 1024 * 1024) {
                        setAttachmentError("File too large. Max size is 5 MB");
                        setAttachmentFile(null);
                        return;
                      }
                      setAttachmentFile(f);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {attachmentError && (
                    <div className="mt-2 text-sm text-red-600">{attachmentError}</div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Supported: PNG, JPEG, PDF (Max 5MB)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                  <textarea
                    value={topupRemarks}
                    onChange={(e) => setTopupRemarks(e.target.value)}
                    placeholder="Optional remarks about this topup"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleTopupSubmit}
                disabled={submittingTopup}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submittingTopup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{submittingTopup ? "Processing..." : "Submit Topup"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && selectedWallet && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Topup Transactions</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedWallet.site_name} • {selectedWallet.name}
                  </p>
                </div>
                <button
                  onClick={() => setShowTransactionsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <select
                      value={txLimit}
                      onChange={(e) => {
                        const newLimit = Number(e.target.value);
                        setTxLimit(newLimit);
                        loadTransactions(selectedWallet.id, 1, newLimit);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {[10, 20, 50].map((n) => (
                        <option key={n} value={n}>{n} per page</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => loadTransactions(selectedWallet.id, 1, txLimit)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachment</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {txLoading ? (
                        <tr>
                          <td className="px-4 py-4 text-center" colSpan={6}>
                            <div className="flex items-center justify-center py-8">
                              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                          </td>
                        </tr>
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                            No topup transactions found
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t) => {
                          const Icon = t.type === 'Credit' ? ArrowUp : ArrowDown;
                          return (
                            <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(t.created_at).toLocaleDateString()}<br />
                                <span className="text-xs text-gray-500">
                                  {new Date(t.created_at).toLocaleTimeString()}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-medium text-gray-900">{t.payment_mode}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <Icon className={`w-4 h-4 ${t.type === 'Credit' ? 'text-green-600' : 'text-red-600'}`} />
                                  <span className={`text-sm font-semibold ${t.type === 'Credit' ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatCurrency(t.amount)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {formatCurrency(t.balance_after || 0)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
                                {t.remarks || "—"}
                              </td>
                              <td className="px-4 py-3">
                                {t.attachment_url ? (
                                  <button
                                    onClick={() => openAttachment(t.attachment_url)}
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border hover:bg-gray-100 transition-colors text-sm"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View</span>
                                  </button>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {transactions.length > 0 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((txPage - 1) * txLimit) + 1}-{Math.min(txPage * txLimit, txTotal)} of {txTotal} transactions
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => loadTransactions(selectedWallet.id, txPage - 1, txLimit)}
                      disabled={txPage <= 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, Math.ceil(txTotal / txLimit)))].map((_, i) => {
                        const pageNum = i + 1;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => loadTransactions(selectedWallet.id, pageNum, txLimit)}
                            className={`px-3 py-2 rounded-lg transition-colors text-sm ${txPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => loadTransactions(selectedWallet.id, txPage + 1, txLimit)}
                      disabled={txPage * txLimit >= txTotal}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attachment Modal */}
      {showAttachmentModal && attachmentUrl && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Attachment Preview</h3>
                <div className="flex items-center space-x-3">
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Open in New Tab</span>
                  </a>
                  <button
                    onClick={() => setShowAttachmentModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-auto" style={{ maxHeight: "calc(90vh - 120px)" }}>
              {attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                <object data={attachmentUrl} type="application/pdf" className="w-full h-[70vh] rounded-lg border">
                  <iframe src={attachmentUrl} className="w-full h-[70vh] rounded-lg border" title="PDF Preview" />
                </object>
              ) : attachmentUrl.match(/\.(png|jpe?g|gif|webp|bmp)$/i) ? (
                <img src={attachmentUrl} alt="Attachment" className="max-w-full max-h-[70vh] object-contain rounded-lg border" />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Preview not available for this file type.</p>
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Download Attachment
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Wallet Topups</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage wallet topups and transactions</p>
          </div>
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search wallets..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <select
                  value={selectedSiteId ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedSiteId(v ? Number(v) : null);
                    const siteId = v ? Number(v) : null;
                    loadWallets(1, limit, siteId);
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {sites.length === 0 && <option value="">No sites</option>}
                  {(isOrgAdmin || isWalletAdmin) && (
                    <option value="">All Sites</option>
                  )}
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={limit}
                  onChange={(e) => {
                    const newLimit = Number(e.target.value);
                    setLimit(newLimit);
                    loadWallets(1, newLimit, selectedSiteId ?? null);
                  }}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n} per page</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1 flex items-center space-x-2">
                <button
                  onClick={() => loadWallets(1, limit, selectedSiteId ?? null)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                    if (sites.length > 0) setSelectedSiteId(sites[0].id);
                  }}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total Wallets</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{walletCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Wallet className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Balance</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Avg Balance</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {formatCurrency(avgBalance)}
              </p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Low Balance</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{lowBalanceCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Wallets Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Currency
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingWallets ? (
                <tr>
                  <td className="px-4 py-4 text-center" colSpan={6}>
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                  </td>
                </tr>
              ) : filteredWallets.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                    No wallets found
                  </td>
                </tr>
              ) : (
                filteredWallets.map((wallet) => {
                  const status = getBalanceStatus(wallet.current_balance);
                  const StatusIcon = status.icon;

                  return (
                    <tr key={wallet.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <Building className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{wallet.site_name || wallet.site_id}</div>
                            <div className="text-xs text-gray-500">ID: {wallet.site_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <Wallet className="w-4 h-4 text-gray-400" />
                          <div className="text-sm font-medium text-gray-900">{wallet.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{wallet.currency || "INR"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(wallet.current_balance)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${status.color.includes('red') ? 'text-red-500' : status.color.includes('orange') ? 'text-orange-500' : 'text-green-500'}`} />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.text}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewWallet(wallet)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                          {canTopup && (
                            <button
                              onClick={() => {
                                setSelectedWallet(wallet);
                                setShowTopupModal(true);
                              }}
                              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Topup</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredWallets.length === 0 && !loadingWallets && (
          <div className="text-center py-8">
            <Wallet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No wallets found</h3>
            <p className="text-xs text-gray-500">No wallets match your current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredWallets.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to <span className="font-medium">{Math.min(page * limit, total)}</span> of <span className="font-medium">{total}</span> wallets
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Rows:</span>
              <select
                value={limit}
                onChange={(e) => {
                  const newLimit = Number(e.target.value);
                  setLimit(newLimit);
                  loadWallets(1, newLimit, selectedSiteId ?? null);
                }}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => loadWallets(page - 1, limit, selectedSiteId ?? null)}
                disabled={page <= 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => loadWallets(1, limit, selectedSiteId ?? null)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) pages.push(<span key="ellipsis1" className="px-1 text-gray-500">...</span>);
                  }
                  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    pages.push(
                      <button
                        key={pageNum}
                        onClick={() => loadWallets(pageNum, limit, selectedSiteId ?? null)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push(<span key="ellipsis2" className="px-1 text-gray-500">...</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => loadWallets(totalPages, limit, selectedSiteId ?? null)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>
              <button
                onClick={() => loadWallets(page + 1, limit, selectedSiteId ?? null)}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
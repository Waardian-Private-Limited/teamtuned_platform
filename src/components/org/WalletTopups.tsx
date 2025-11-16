"use client";

import React, { useState, useEffect, useRef } from "react";
import { Eye, Plus, Download, Filter, Search, MoreVertical, ChevronLeft, ChevronRight, X, Building, Wallet, DollarSign, FileText, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
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

export default function WalletTopups() {
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [wallets, setWallets] = React.useState<Wallet[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(10);
  const [loadingWallets, setLoadingWallets] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedWalletId, setSelectedWalletId] = React.useState<number | null>(null);
  const [selectedWallet, setSelectedWallet] = React.useState<Wallet | null>(null);
  const [txLoading, setTxLoading] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = React.useState(0);
  const [txPage, setTxPage] = React.useState(1);
  const [txLimit, setTxLimit] = React.useState(10);

  const [topupAmount, setTopupAmount] = React.useState<string>("");
  const [topupMode, setTopupMode] = React.useState<typeof paymentModes[number]>("Cash");
  const [topupRemarks, setTopupRemarks] = React.useState<string>("");
  const [transactionId, setTransactionId] = React.useState<string>("");
  const [attachmentFile, setAttachmentFile] = React.useState<File | null>(null);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submittingTopup, setSubmittingTopup] = React.useState(false);
  const [showTopupModal, setShowTopupModal] = React.useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = React.useState(false);
  const [showAttachmentModal, setShowAttachmentModal] = React.useState(false);
  const [attachmentUrl, setAttachmentUrl] = React.useState<string | null>(null);

  // Sites filtering
  const [sites, setSites] = React.useState<{ id: number; name: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(null);

  // Modern UI states
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const hasPerm = React.useCallback((code: string) => {
    const list = (permissions || []).map((p) => (p || '').toUpperCase());
    return list.includes((code || '').toUpperCase());
  }, [permissions]);
  const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
  const isWalletAdmin = hasPerm('WALLET_ADMIN');
  const canView = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_TOPUP');
  const canTopup = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_TOPUP');

  // Filtered wallets
  const filteredWallets = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return wallets.filter(wallet => 
      q ? 
        (wallet.site_name || '').toLowerCase().includes(q) ||
        (wallet.name || '').toLowerCase().includes(q) ||
        (wallet.currency || '').toLowerCase().includes(q)
      : true
    );
  }, [wallets, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const showNotification = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${
      type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
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

  const createNotificationContainer = () => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  };

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

  const loadTransactions = async (
    walletId: number,
    nextPage = txPage,
    nextLimit = txLimit
  ) => {
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

  // Load session and permissions
  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET", withAuth: true });
        setRole(session.role || null);
        const perms = (session.employee?.permissions || []).map((p) => (p || '').toUpperCase());
        setPermissions(perms);
      } catch (_) {}
    })();
  }, []);

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
    } catch (_) {}
  }, [isOrgAdmin, isWalletAdmin, selectedSiteId]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, isOrgAdmin, isWalletAdmin, selectedSiteId]);

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedWalletId) {
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
          wallet_id: selectedWalletId,
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
      if (showTransactionsModal && selectedWalletId) {
        await loadTransactions(selectedWalletId, 1, txLimit);
      }
    } catch (err: any) {
      const msg = err?.message || "Topup failed";
      setFormError(msg);
      showNotification(msg, "error");
    } finally {
      setSubmittingTopup(false);
    }
  };

  const onViewWallet = async (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setSelectedWalletId(wallet.id);
    await loadTransactions(wallet.id, 1, txLimit);
    setShowTransactionsModal(true);
  };

  const openAttachment = (url?: string | null) => {
    if (!url) return;
    setAttachmentUrl(url);
    setShowAttachmentModal(true);
  };

  const getBalanceColor = (balance: number) => {
    if (balance < 1000) return 'text-red-600 bg-red-50';
    if (balance < 5000) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance < 1000) return <AlertCircle className="w-4 h-4 text-red-500" />;
    if (balance < 5000) return <AlertCircle className="w-4 h-4 text-orange-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  // Action Dropdown Component with improved positioning
  const ActionDropdown = ({ wallet, isLastRow = false }: { wallet: Wallet, isLastRow?: boolean }) => {
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

    // Calculate if dropdown should open upwards for last rows
    const getDropdownPosition = () => {
      if (!dropdownRef.current) return {};
      
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 120; // Approximate dropdown height
      
      if ((spaceBelow < dropdownHeight && rect.top > dropdownHeight) || isLastRow) {
        return { bottom: '100%', top: 'auto' };
      }
      return { top: '100%', bottom: 'auto' };
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div 
              className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20"
              style={getDropdownPosition()}
            >
              <div className="py-1">
                {canTopup && (
                  <button
                    onClick={() => {
                      setSelectedWallet(wallet);
                      setSelectedWalletId(wallet.id);
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

  // Modern Modal Components
  const TopupModal = () => {
    if (!showTopupModal || !selectedWallet) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
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
          
          <form onSubmit={handleTopupSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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
                    <p className="font-medium">{Number(selectedWallet.current_balance).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                  <select
                    value={topupMode}
                    onChange={(e) => setTopupMode(e.target.value as typeof paymentModes[number])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
    );
  };

  const TransactionsModal = () => {
    if (!showTransactionsModal) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Wallet Transactions</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedWallet?.site_name ? `${selectedWallet.site_name} • ` : ''}{selectedWallet?.name}
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
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Filters */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <select
                    value={txLimit}
                    onChange={(e) => {
                      const newLimit = Number(e.target.value);
                      setTxLimit(newLimit);
                      if (selectedWalletId) loadTransactions(selectedWalletId, 1, newLimit);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {txLoading ? (
                      <tr>
                        <td className="px-6 py-4 text-center" colSpan={8}>
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                          </div>
                        </td>
                      </tr>
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td className="px-6 py-4 text-center text-gray-500" colSpan={8}>
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {new Date(t.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{t.payment_mode}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{t.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{t.reference_type}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            <span className="font-semibold">{Number(t.amount).toFixed(2)}</span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {Number(t.balance_after || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            {t.attachment_url ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border hover:bg-gray-100 transition-colors"
                                onClick={() => openAttachment(t.attachment_url)}
                              >
                                <Eye className="w-4 h-4" />
                                <span className="text-sm">View</span>
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {t.remarks || "—"}
                          </td>
                        </tr>
                      ))
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
                    onClick={() => selectedWalletId && loadTransactions(selectedWalletId, txPage - 1, txLimit)}
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
                          onClick={() => selectedWalletId && loadTransactions(selectedWalletId, pageNum, txLimit)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            txPage === pageNum
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
                    onClick={() => selectedWalletId && loadTransactions(selectedWalletId, txPage + 1, txLimit)}
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
    );
  };

  const AttachmentModal = () => {
    if (!showAttachmentModal || !attachmentUrl) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
    );
  };

  if (loadingWallets && wallets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet Topups</h1>
            <p className="text-gray-600 mt-1">Manage wallet topups and transactions</p>
          </div>
        </div>
        
        {/* Compact Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="animate-pulse">
            <div className="flex flex-wrap items-center gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded w-40"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 border-b border-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Render Modals */}
      <TopupModal />
      <TransactionsModal />
      <AttachmentModal />

      {!canView && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Access Denied</p>
              <p className="text-sm mt-1">You don't have permission to view wallet topups.</p>
            </div>
          </div>
        </div>
      )}

      {canView && (
        <>
          {/* Fixed Header Section */}
          <div className="sticky top-0 z-30 bg-white pb-6 border-b border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Wallet Topups</h1>
                <p className="text-gray-600 mt-1">Manage wallet topups and transactions</p>
              </div>
            </div>

            {/* Compact Stats Cards - Single line layout */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span> 
                    Total Wallets
                  </div>
                  <div className="text-lg font-semibold">{total}</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> 
                    Total Balance
                  </div>
                  <div className="text-lg font-semibold">
                    {wallets
                      .reduce((sum, wallet) => {
                        const val = typeof wallet.current_balance === 'number'
                          ? wallet.current_balance
                          : parseFloat(String(wallet.current_balance ?? '0')) || 0;
                        return sum + val;
                      }, 0)
                      .toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span> 
                    Available Sites
                  </div>
                  <div className="text-lg font-semibold">{sites.length}</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span> 
                    Low Balance
                  </div>
                  <div className="text-lg font-semibold">
                    {wallets.filter(w => w.current_balance < 1000).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Filters - All in one line */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Site Filter */}
                <div className="flex flex-col min-w-[160px]">
                  <select
                    value={selectedSiteId ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedSiteId(v ? Number(v) : null);
                      if (isOrgAdmin || isWalletAdmin) {
                        const siteId = v ? Number(v) : null;
                        loadWallets(1, limit, siteId);
                      } else {
                        loadWallets(1, limit, Number(v));
                      }
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                {/* Search Filter */}
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 min-w-[200px]">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search wallets..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="bg-transparent border-none focus:ring-0 text-sm w-full"
                  />
                </div>

                {/* Page Size Filter */}
                <div className="flex flex-col min-w-[120px]">
                  <select
                    value={limit}
                    onChange={(e) => {
                      const newLimit = Number(e.target.value);
                      setLimit(newLimit);
                      const siteId = (isOrgAdmin || isWalletAdmin) ? selectedSiteId : selectedSiteId;
                      loadWallets(1, newLimit, siteId ?? null);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Reset Filters Button */}
                <button
                  onClick={() => { 
                    setSearchQuery("");
                    setPage(1);
                    setSelectedSiteId(sites.length > 0 ? sites[0].id : null);
                  }}
                  className="ml-auto px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <Filter className="w-4 h-4" />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Scrollable Wallets Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingWallets ? (
                    <tr>
                      <td className="px-6 py-4 text-center" colSpan={6}>
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredWallets.length === 0 ? (
                    <tr>
                      <td className="px-6 py-4 text-center text-gray-500" colSpan={6}>
                        No wallets found
                      </td>
                    </tr>
                  ) : (
                    filteredWallets.map((w, index) => {
                      const isLastRow = index === filteredWallets.length - 1;
                      return (
                        <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <Building className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{w.site_name || w.site_id}</div>
                                <div className="text-xs text-gray-500">Site ID: {w.site_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <Wallet className="w-4 h-4 text-gray-400" />
                              <div className="text-sm text-gray-900">{w.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">{w.currency || "INR"}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="text-sm font-semibold text-gray-900">
                              {Number(w.current_balance).toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {getBalanceIcon(w.current_balance)}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBalanceColor(w.current_balance)}`}>
                                {w.current_balance < 1000 ? 'Low' : 
                                w.current_balance < 5000 ? 'Adequate' : 'Healthy'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <ActionDropdown wallet={w} isLastRow={isLastRow} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredWallets.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} of {total} wallets
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={limit}
                    onChange={(e) => { 
                      const newLimit = Number(e.target.value);
                      setLimit(newLimit);
                      const siteId = (isOrgAdmin || isWalletAdmin) ? selectedSiteId : selectedSiteId;
                      loadWallets(1, newLimit, siteId ?? null);
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {[10, 20, 50].map((n) => (
                      <option key={n} value={n}>{n} per page</option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => loadWallets(page - 1, limit, selectedSiteId)}
                    disabled={page <= 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => loadWallets(pageNum, limit, selectedSiteId)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            page === pageNum
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
                    onClick={() => loadWallets(page + 1, limit, selectedSiteId)}
                    disabled={page * limit >= total}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
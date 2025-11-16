"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { 
  Plus, 
  Eye, 
  MoreVertical, 
  Filter,
  Search,
  Building,
  Wallet,
  Currency,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  Settings,
  Users
} from "lucide-react";

type Wallet = {
  id: number;
  site_id: number;
  site_name?: string;
  name: string;
  currency: string;
  current_balance: number;
  min_balance: number;
};

type Site = { id: number; name: string };

export default function PettyCash() {
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [wallets, setWallets] = React.useState<Wallet[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Modern UI states
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  // Modal state for wallet details and transactions
  const [modalWallet, setModalWallet] = React.useState<Wallet | null>(null);
  const [txItems, setTxItems] = React.useState<any[]>([]);
  const [txLoading, setTxLoading] = React.useState<boolean>(false);
  const [txError, setTxError] = React.useState<string | null>(null);
  const [txPage, setTxPage] = React.useState<number>(1);
  const [txLimit, setTxLimit] = React.useState<number>(10);

  const hasPerm = React.useCallback((code: string) => {
    const list = (permissions || []).map((p) => (p || '').toUpperCase());
    return list.includes((code || '').toUpperCase());
  }, [permissions]);

  const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
  const isWalletAdmin = hasPerm('WALLET_ADMIN');
  const canView = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_VIEW') || hasPerm('WALLET_ADD');
  const canCreate = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_ADD');

  // Filtered and paginated wallets
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

  const totalPages = Math.max(1, Math.ceil(filteredWallets.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageSlice = filteredWallets.slice(pageStart, pageStart + pageSize);

  // Load transactions for a wallet
  const loadTransactions = React.useCallback(async (walletId: number) => {
    setTxLoading(true);
    setTxError(null);
    try {
      const res = await apiClient<any>("/site-wallets/transactions", { 
        method: "GET", 
        withAuth: true, 
        params: { wallet_id: String(walletId), page: String(txPage), limit: String(txLimit) } 
      });
      const list = Array.isArray(res) ? res : (res?.transactions || []);
      setTxItems(list);
    } catch (e: any) {
      setTxError(e?.message || "Failed to load transactions");
    } finally {
      setTxLoading(false);
    }
  }, [txPage, txLimit]);

  const loadData = React.useCallback(async (siteId?: number | null) => {
    setLoading(true);
    setError(null);
    try {
      // Admins see all wallets; non-admins see only their incharge site wallet
      const params: any = {};
      if (!isOrgAdmin && !isWalletAdmin && typeof siteId === 'number') {
        params.site_id = String(siteId);
      }
      const res = await apiClient<any>("/site-wallets", { method: "GET", withAuth: true, params });
      const list: Wallet[] = Array.isArray(res) ? res : (res?.wallets || []);
      setWallets(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load wallets");
      showNotification(e?.message || "Failed to load wallets", 'error');
    } finally {
      setLoading(false);
    }
  }, [isOrgAdmin, isWalletAdmin]);

  const loadSites = React.useCallback(async () => {
    try {
      if (isOrgAdmin || isWalletAdmin) {
        // Admins: show all sites
        const res = await apiClient<any>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res) ? res : (res?.sites || res?.rows || []);
        const mapped: Site[] = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || '-') }));
        setSites(mapped);
        if (mapped.length && selectedSite == null) {
          setSelectedSite(mapped[0].id);
        }
      } else {
        // Non-admins: only incharge sites
        const res = await apiClient<any>("/attendance/incharge-sites", { method: "GET", withAuth: true });
        const list = Array.isArray(res) ? res : (res?.sites || res?.rows || []);
        const mapped: Site[] = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || '-') }));
        setSites(mapped);
        if (mapped.length && selectedSite == null) {
          setSelectedSite(mapped[0].id);
        }
      }
    } catch (_) {}
  }, [isOrgAdmin, isWalletAdmin, selectedSite]);

  // Load session, then data based on permissions
  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET", withAuth: true });
        setRole(session.role || null);
        const perms = (session.employee?.permissions || []).map((p) => (p || '').toUpperCase());
        setPermissions(perms);
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  React.useEffect(() => {
    if (canView) {
      loadSites();
    }
  }, [canView, loadSites]);

  React.useEffect(() => {
    if (!canView) return;
    if (isOrgAdmin || isWalletAdmin) {
      loadData(null);
    } else if (typeof selectedSite === 'number') {
      loadData(selectedSite);
    }
  }, [canView, isOrgAdmin, isWalletAdmin, selectedSite, loadData]);

  // Helper functions for modern notifications
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

  const openWalletModal = async (wallet: Wallet) => {
    setModalWallet(wallet);
    await loadTransactions(wallet.id);
  };
  const closeWalletModal = () => {
    setModalWallet(null);
    setTxItems([]);
    setTxPage(1);
    setTxError(null);
  };

  const createWallet = async () => {
    if (!selectedSite) {
      showNotification("Please select a site", 'error');
      return;
    }
    if (!canCreate) { 
      showNotification("You don't have permission to create wallets", 'error'); 
      return; 
    }
    
    try {
      setActionLoading('create_wallet');
      const res = await apiClient<any>("/site-wallets", {
        method: "POST",
        body: { site_id: selectedSite },
        withAuth: true,
      });
      showNotification(res?.message || "Wallet created successfully", 'success');
      await loadData();
    } catch (e: any) {
      showNotification(e?.message || "Failed to create wallet", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // No min balance logic needed per requirements

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
      const dropdownHeight = 160; // Approximate dropdown height
      
      if ((spaceBelow < dropdownHeight && rect.top > dropdownHeight) || isLastRow) {
        return { bottom: '100%', top: 'auto' };
      }
      return { top: '100%', bottom: 'auto' };
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
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
                <button
                  onClick={() => {
                    setIsOpen(false);
                    openWalletModal(wallet);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>
                
                <button
                  onClick={() => {
                    setIsOpen(false);
                    openWalletModal(wallet);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>View Transactions</span>
                </button>
                
                <div className="border-t border-gray-100 my-1" />
                
                <button
                  onClick={() => {
                    // Add funds
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Funds</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Wallet details + transactions modal
  const WalletModal = () => {
    if (!modalWallet) return null;
    return (
      <div className="fixed inset-0 z-30">
        <div className="absolute inset-0 bg-black/30" onClick={closeWalletModal} />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl border border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Wallet Details</h3>
              <button onClick={closeWalletModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Site</div>
                  <div className="text-sm font-medium text-gray-900">{modalWallet.site_name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Wallet</div>
                  <div className="text-sm font-medium text-gray-900">{modalWallet.name}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Balance</div>
                  <div className="text-sm font-semibold text-gray-900">{Number(modalWallet.current_balance).toFixed(2)} {modalWallet.currency}</div>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">Recent Transactions</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Per page</label>
                    <select
                      className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                      value={String(txLimit)}
                      onChange={(e) => { const v = parseInt(e.target.value) || 10; setTxLimit(v); setTxPage(1); if (modalWallet) loadTransactions(modalWallet.id); }}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {txLoading ? (
                    <div className="p-6 text-center text-gray-500">Loading transactions…</div>
                  ) : txError ? (
                    <div className="p-6 text-center text-red-600">{txError}</div>
                  ) : txItems.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">No transactions found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Mode</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {txItems.map((t: any) => (
                            <tr key={t.id || `${t.wallet_id}-${t.created_at}-${t.amount}`}> 
                              <td className="px-4 py-2 text-sm text-gray-800">{String(t.type || '')}</td>
                              <td className="px-4 py-2 text-sm text-gray-800">{String(t.payment_mode || '')}</td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900">{Number(t.amount || 0).toFixed(2)}</td>
                              <td className="px-4 py-2 text-sm text-gray-800">{String(t.created_at || '')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 mt-3">
                  <button
                    onClick={() => { if (!modalWallet) return; const p = Math.max(1, txPage - 1); setTxPage(p); loadTransactions(modalWallet.id); }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => { if (!modalWallet) return; const p = txPage + 1; setTxPage(p); loadTransactions(modalWallet.id); }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && wallets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Petty Cash Management</h1>
            <p className="text-gray-600 mt-1">Manage site wallets and petty cash</p>
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
      {!canView && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">Access Denied</p>
              <p className="text-sm mt-1">You don't have permission to view wallets.</p>
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
                <h1 className="text-2xl font-bold text-gray-900">Petty Cash Management</h1>
                <p className="text-gray-600 mt-1">Manage site wallets and petty cash</p>
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
                  <div className="text-lg font-semibold">{wallets.length}</div>
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
                    Sites with Wallets
                  </div>
                  <div className="text-lg font-semibold">
                    {new Set(wallets.map(w => w.site_id)).size}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span> 
                    Avg Balance
                  </div>
                  <div className="text-lg font-semibold">
                    {wallets.length > 0 
                      ? (wallets.reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0) / wallets.length).toFixed(2)
                      : '0.00'}
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Filters - All in one line */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                {canCreate && (
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col min-w-[160px]">
                      <select 
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={selectedSite ?? ''} 
                        onChange={(e) => setSelectedSite(Number(e.target.value))}
                      >
                        {sites.length === 0 && <option value="">No sites</option>}
                        {sites.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button" 
                      onClick={createWallet}
                      disabled={actionLoading === 'create_wallet' || !selectedSite}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {actionLoading === 'create_wallet' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      <span>{actionLoading === 'create_wallet' ? 'Creating...' : 'Create Wallet'}</span>
                    </button>
                  </div>
                )}

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

                <div className="flex flex-col min-w-[120px]">
                  <select 
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={String(pageSize)} 
                    onChange={(e) => setPageSize(parseInt(e.target.value) || 10)}
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                </div>

                <button
                  onClick={() => { 
                    setSearchQuery(""); 
                    setPage(1); 
                    setSelectedSite(sites.length > 0 ? sites[0].id : null);
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Wallet Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pageSlice.map((wallet, index) => {
                    const isLastRow = index === pageSlice.length - 1;
                    return (
                      <tr key={wallet.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <Building className="w-4 h-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">{wallet.site_name || '-'}</div>
                              <div className="text-xs text-gray-500">Site ID: {wallet.site_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <Wallet className="w-4 h-4 text-gray-400" />
                            <div className="text-sm text-gray-900">{wallet.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <Currency className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{wallet.currency}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {Number(wallet.current_balance).toFixed(2)}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <ActionDropdown wallet={wallet} isLastRow={isLastRow} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {!loading && filteredWallets.length === 0 && !error && (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No wallets found</h3>
                <p className="text-gray-500 mb-4">No wallets match your current filters.</p>
                {canCreate && (
                  <button 
                    onClick={createWallet}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Wallet</span>
                  </button>
                )}
              </div>
            )}
            
            {loading && wallets.length === 0 && (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Loading wallets...</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredWallets.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filteredWallets.length)} of {filteredWallets.length} wallets
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>{size} per page</option>
                  ))}
                </select>
                
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
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
                        onClick={() => setPage(pageNum)}
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
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Modal mount point */}
          <WalletModal />
        </>
      )}
    </div>
  );
}
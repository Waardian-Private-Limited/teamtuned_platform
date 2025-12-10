"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
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
    Users,
    CreditCard,
    TrendingUp,
    TrendingDown,
    CheckCircle,
    Calendar,
    Receipt,
    ChevronDown,
    ChevronUp,
    Info,
    ArrowUp,
    ArrowDown
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

function useCountUp(target: number, duration = 800) {
    const [v, setV] = useState(0);
    const { permissions, user, employee, role } = useAuth();

    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const step = (ts: number) => {
            const p = Math.min((ts - start) / duration, 1);
            setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => { if (raf) cancelAnimationFrame(raf); };
    }, [target, duration]);
    return v;
}

export default function PettyCash() {
    const { role, permissions, user, employee } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    // Permissions
    const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || '').toUpperCase() === code.toUpperCase());
    const isWalletAdmin = hasPerm('WALLET_ADMIN');
    const canView = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_VIEW') || hasPerm('WALLET_ADD');
    const canCreate = isOrgAdmin || isWalletAdmin || hasPerm('WALLET_ADD');

    // State
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [sitesWithoutWallet, setSitesWithoutWallet] = useState<Site[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Create Wallet Modal
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
    const [createForm, setCreateForm] = useState({
        site_id: "",
        initial_balance: "",
        currency: "INR"
    });
    const [createLoading, setCreateLoading] = useState<boolean>(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Stats animation
    const walletCount = useCountUp(wallets.length || 0);
    const totalBalance = useCountUp(wallets.reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0));
    const siteWithWalletCount = useCountUp(new Set(wallets.map(w => w.site_id)).size);
    const avgBalance = useCountUp(wallets.length > 0
        ? wallets.reduce((sum, w) => sum + (Number(w.current_balance) || 0), 0) / wallets.length
        : 0);

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

    const totalEntries = filteredWallets.length;
    const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
    const pageStart = (page - 1) * pageSize;
    const pageSlice = filteredWallets.slice(pageStart, pageStart + pageSize);

    // Load session
    useEffect(() => {
        (async () => {
            try {
                // Session fetch removed (using useAuth)
                const session = { authenticated: true, role: role, employee: { permissions } };
                // setRole(session.role || null);
                const perms = (session.employee?.permissions || []).map((p) => (p || '').toUpperCase());
                // setPermissions(perms);
            } catch (_) { }
        })();
    }, []);

    // Load data
    const loadData = React.useCallback(async () => {
        if (!canView) return;

        setLoading(true);
        setError(null);
        try {
            // Load wallets
            const walletRes = await apiClient<any>("/site-wallets", { method: "GET", withAuth: true });
            const walletList: Wallet[] = Array.isArray(walletRes) ? walletRes : (walletRes?.wallets || []);
            setWallets(walletList);

            // Load all sites
            const siteRes = await apiClient<any>("/sites", { method: "GET", withAuth: true, params: { incharge_only: isOrgAdmin || isWalletAdmin ? "0" : "1" } });
            const siteList: any[] = Array.isArray(siteRes) ? siteRes : (siteRes?.sites || siteRes?.rows || []);
            const mappedSites: Site[] = siteList.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || '-') }));
            setSites(mappedSites);

            // Find sites without wallets
            const sitesWithWallet = new Set(walletList.map(w => w.site_id));
            const sitesWithout = mappedSites.filter(site => !sitesWithWallet.has(site.id));
            setSitesWithoutWallet(sitesWithout);

            // Set default site for create form if none selected
            if (sitesWithout.length > 0 && !createForm.site_id) {
                setCreateForm(prev => ({ ...prev, site_id: String(sitesWithout[0].id) }));
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load data");
            showNotification(e?.message || "Failed to load data", 'error');
        } finally {
            setLoading(false);
        }
    }, [canView, isOrgAdmin, isWalletAdmin]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Create wallet function
    const handleCreateWallet = async () => {
        if (!createForm.site_id) {
            setCreateError("Please select a site");
            return;
        }

        setCreateLoading(true);
        setCreateError(null);
        try {
            await apiClient<any>("/site-wallets", {
                method: "POST",
                body: {
                    site_id: Number(createForm.site_id),
                    initial_balance: createForm.initial_balance ? Number(createForm.initial_balance) : 0,
                    currency: createForm.currency
                },
                withAuth: true,
            });

            showNotification("Wallet created successfully", 'success');
            setShowCreateModal(false);
            setCreateForm({
                site_id: "",
                initial_balance: "",
                currency: "INR"
            });
            await loadData();
        } catch (e: any) {
            setCreateError(e?.message || "Failed to create wallet");
            showNotification(e?.message || "Failed to create wallet", 'error');
        } finally {
            setCreateLoading(false);
        }
    };

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

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Loading State
    if (loading && wallets.length === 0) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Petty Cash Management</h1>
                            <p className="text-sm text-gray-600 mt-0.5">Manage site wallets and petty cash</p>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center space-x-2">
                        <div className="h-9 bg-gray-200 rounded flex-1 animate-pulse"></div>
                        <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
                        <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
                    <div className="bg-gray-50">
                        <div className="grid grid-cols-5 gap-4 px-4 py-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
                            ))}
                        </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 animate-pulse">
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                                <div className="space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-16"></div>
                                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
                            </div>
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
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Petty Cash Management</h1>
                            <p className="text-sm text-gray-600 mt-0.5">Manage site wallets and petty cash</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                    <p className="text-gray-500">You do not have permission to view wallets.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Create Wallet Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Create New Wallet</h3>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        setCreateError(null);
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            {sitesWithoutWallet.length === 0 ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">All Sites Have Wallets</h4>
                                    <p className="text-gray-500">Every site already has a wallet assigned. No new wallets can be created.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {createError && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                            <div className="flex items-center space-x-2 text-red-800">
                                                <AlertCircle className="w-5 h-5" />
                                                <span>{createError}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Site <span className="text-red-500">*</span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {sitesWithoutWallet.map((site) => (
                                                <button
                                                    key={site.id}
                                                    type="button"
                                                    onClick={() => setCreateForm({ ...createForm, site_id: String(site.id) })}
                                                    className={`p-4 border rounded-lg text-left transition-all ${createForm.site_id === String(site.id)
                                                        ? 'border-blue-500 bg-blue-50'
                                                        : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <Building className="w-4 h-4 text-gray-400" />
                                                        <div>
                                                            <div className="font-medium text-gray-900">{site.name}</div>
                                                            <div className="text-xs text-gray-500 mt-1">Site ID: {site.id}</div>
                                                        </div>
                                                    </div>
                                                    {createForm.site_id === String(site.id) && (
                                                        <div className="mt-2 flex items-center space-x-1 text-blue-600">
                                                            <CheckCircle className="w-4 h-4" />
                                                            <span className="text-sm">Selected</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Initial Balance (Optional)
                                            </label>
                                            <div className="relative">
                                                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={createForm.initial_balance}
                                                    onChange={(e) => setCreateForm({ ...createForm, initial_balance: e.target.value })}
                                                    className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Currency <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={createForm.currency}
                                                onChange={(e) => setCreateForm({ ...createForm, currency: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                            >
                                                <option value="INR">Indian Rupee (₹)</option>
                                                <option value="USD">US Dollar ($)</option>
                                                <option value="EUR">Euro (€)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-2">
                                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-medium text-blue-800">About Site Wallets</p>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    Each site can have only one wallet. This wallet will be used for all petty cash transactions at the selected site.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    setCreateError(null);
                                }}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            {sitesWithoutWallet.length > 0 && (
                                <button
                                    onClick={handleCreateWallet}
                                    disabled={createLoading || !createForm.site_id}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                                >
                                    {createLoading ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4" />
                                            <span>Create Wallet</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Petty Cash Management</h1>
                        <p className="text-sm text-gray-600 mt-0.5">Manage site wallets and petty cash</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setFiltersExpanded(!filtersExpanded)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </div>
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

                            <div className="md:col-span-3 flex items-center space-x-2">
                                <button
                                    onClick={loadData}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                                >
                                    Refresh Data
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchQuery("");
                                        setPage(1);
                                    }}
                                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                                >
                                    Clear Filters
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
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Sites with Wallets</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{siteWithWalletCount} / {sites.length}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Building className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Avg Balance</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">
                                {formatCurrency(avgBalance)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sites Without Wallets */}
            {sitesWithoutWallet.length > 0 && canCreate && (
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-medium text-gray-900">Sites Without Wallets</h3>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {sitesWithoutWallet.length} site{sitesWithoutWallet.length !== 1 ? 's' : ''} don't have wallets yet
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            Create Now
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {sitesWithoutWallet.slice(0, 6).map((site) => (
                            <div key={site.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Building className="w-4 h-4 text-gray-400" />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{site.name}</div>
                                            <div className="text-xs text-gray-500">Site ID: {site.id}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCreateForm({ site_id: String(site.id), initial_balance: "", currency: "INR" });
                                            setShowCreateModal(true);
                                        }}
                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                                    >
                                        Add Wallet
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                                    Wallet Name
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Currency
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Current Balance
                                </th>
                                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pageSlice.map((wallet) => (
                                <tr key={wallet.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center space-x-3">
                                            <Building className="w-4 h-4 text-gray-400" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{wallet.site_name || 'Unnamed Site'}</div>
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
                                            <Currency className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-900">{wallet.currency}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`text-sm font-semibold ${wallet.current_balance < wallet.min_balance
                                            ? 'text-red-700'
                                            : 'text-gray-900'
                                            }`}>
                                            {formatCurrency(wallet.current_balance)}
                                        </div>
                                        {wallet.current_balance < wallet.min_balance && (
                                            <div className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                                                <AlertCircle className="w-3 h-3" />
                                                <span>Below minimum</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => {
                                                    const basePath = pathname?.includes('/employee') ? '/employee' : '/org-admin';
                                                    router.push(`${basePath}/wallets/${wallet.id}`);
                                                }}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span>View Details</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const basePath = pathname?.includes('/employee') ? '/employee' : '/org-admin';
                                                    router.push(`${basePath}/wallets/${wallet.id}/transactions`);
                                                }}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                                            >
                                                <Receipt className="w-4 h-4" />
                                                <span>Transactions</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredWallets.length === 0 && !loading && (
                    <div className="text-center py-8">
                        <Wallet className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-medium text-gray-900 mb-1">No wallets found</h3>
                        <p className="text-xs text-gray-500 mb-3">No wallets match your current filters.</p>
                        {canCreate && (
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Create First Wallet</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {filteredWallets.length > 0 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
                    <div className="text-xs text-gray-600">
                        Showing <span className="font-medium">{pageStart + 1}</span> to <span className="font-medium">{Math.min(pageStart + pageSize, totalEntries)}</span> of <span className="font-medium">{totalEntries}</span> wallets
                    </div>
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-600">Rows:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
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
                                onClick={() => setPage(Math.max(1, page - 1))}
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
                                                onClick={() => setPage(1)}
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
                                                onClick={() => setPage(pageNum)}
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
                                                onClick={() => setPage(totalPages)}
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
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
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
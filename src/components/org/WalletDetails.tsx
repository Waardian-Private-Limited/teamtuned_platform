"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Wallet,
    Building,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Filter,
    X,
    Clock,
    Paperclip,
    Download
} from "lucide-react";

type WalletInfo = {
    id: number;
    name: string;
    site_id: number;
    site_name: string;
    currency: string;
    current_balance: number;
    min_balance: number;
};

type WalletStats = {
    opening_balance: number;
    closing_balance: number;
    total_credits: number;
    total_debits: number;
    net_change: number;
    transaction_count: number;
};

type DailyBalance = {
    date: string;
    opening_balance: number;
    closing_balance: number;
    net_change: number;
    transaction_count: number;
};

type Transaction = {
    id: number;
    type: "Credit" | "Debit";
    amount: number;
    description: string;
    category?: string;
    reference_number?: string;
    payment_mode?: string;
    payment_reference?: string;
    created_by: number;
    created_by_name?: string;
    approved_by?: number;
    approved_by_name?: string;
    created_at: string;
    balance_before: number;
    balance_after: number;
    attachments?: string[];
};

interface WalletDetailsProps {
    walletId: string;
    date?: string; // Optional: if provided, show transaction details for this date
}

function useCountUp(target: number, duration = 800) {
    const [v, setV] = useState(0);
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

export default function WalletDetails({ walletId, date }: WalletDetailsProps) {
    const router = useRouter();
    const isTransactionMode = !!date; // If date is provided, show transaction details

    // State
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [stats, setStats] = useState<WalletStats | null>(null);
    const [dailyBalances, setDailyBalances] = useState<DailyBalance[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [statsLoading, setStatsLoading] = useState<boolean>(false);
    const [balancesLoading, setBalancesLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);

    // Filters
    const [showFilters, setShowFilters] = useState<boolean>(false);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Transaction state (for transaction mode)
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false);

    // Animated stats
    const animatedCurrent = useCountUp(wallet?.current_balance || 0);
    const animatedOpening = useCountUp(stats?.opening_balance || 0);
    const animatedClosing = useCountUp(stats?.closing_balance || 0);
    const animatedCredits = useCountUp(stats?.total_credits || 0);
    const animatedDebits = useCountUp(stats?.total_debits || 0);
    const animatedNetChange = useCountUp(Math.abs(stats?.net_change || 0));

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: wallet?.currency || 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Load wallet stats
    const loadStats = async () => {
        setStatsLoading(true);
        try {
            const params: any = { wallet_id: walletId };
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const data = await apiClient<any>("/site-wallets/stats", {
                method: "GET",
                withAuth: true,
                params
            });

            setWallet(data.wallet);
            setStats(data.stats);
        } catch (e: any) {
            setError(e?.message || "Failed to load wallet stats");
        } finally {
            setStatsLoading(false);
        }
    };

    // Load daily balances
    const loadDailyBalances = async () => {
        setBalancesLoading(true);
        try {
            const params: any = {
                wallet_id: walletId,
                page: String(page),
                limit: String(pageSize)
            };
            if (startDate) params.start_date = startDate;
            if (endDate) params.end_date = endDate;

            const data = await apiClient<any>("/site-wallets/daily-balances", {
                method: "GET",
                withAuth: true,
                params
            });

            setDailyBalances(data.balances || []);
            setTotal(data.total || 0);
        } catch (e: any) {
            setError(e?.message || "Failed to load daily balances");
        } finally {
            setBalancesLoading(false);
        }
    };

    // Load transactions for a specific date
    const loadTransactions = async () => {
        if (!date) return;

        setTransactionsLoading(true);
        try {
            const data = await apiClient<any>("/site-wallets/transactions/by-date", {
                method: "GET",
                withAuth: true,
                params: {
                    wallet_id: walletId,
                    date,
                    page: String(page),
                    limit: String(pageSize)
                }
            });

            setTransactions(data.transactions || []);
            setTotal(data.total || 0);

            // Also load wallet info if not already loaded
            if (!wallet && data.transactions.length > 0) {
                loadStats();
            }
        } catch (e: any) {
            setError(e?.message || "Failed to load transactions");
        } finally {
            setTransactionsLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            if (isTransactionMode) {
                // Transaction details mode
                await Promise.all([loadStats(), loadTransactions()]);
            } else {
                // Daily balance mode
                await Promise.all([loadStats(), loadDailyBalances()]);
            }
            setLoading(false);
        };
        loadData();
    }, []);

    // Reload when filters or pagination change
    useEffect(() => {
        if (!loading) {
            if (isTransactionMode) {
                loadTransactions();
            } else {
                loadDailyBalances();
            }
        }
    }, [page, pageSize]);

    // Apply filters
    const applyFilters = () => {
        setPage(1);
        loadStats();
        loadDailyBalances();
    };

    // Clear filters
    const clearFilters = () => {
        setStartDate("");
        setEndDate("");
        setPage(1);
        setTimeout(() => {
            loadStats();
            loadDailyBalances();
        }, 0);
    };

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-4">
                {/* Header Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                        <div className="flex-1">
                            <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                            <div className="h-6 bg-gray-200 rounded w-24"></div>
                        </div>
                    ))}
                </div>

                {/* Table Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error && !wallet) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Wallet</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">{wallet?.name}</h1>
                            <div className="flex items-center space-x-2 mt-0.5">
                                <Building className="w-3 h-3 text-gray-400" />
                                <p className="text-sm text-gray-600">{wallet?.site_name}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="flex items-end space-x-2">
                                <button
                                    onClick={applyFilters}
                                    className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                                >
                                    Apply
                                </button>
                                <button
                                    onClick={clearFilters}
                                    className="px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Current Balance</p>
                            <p className="text-xl font-bold text-blue-900 mt-1">
                                {formatCurrency(animatedCurrent)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Wallet className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Opening Balance</p>
                            <p className="text-xl font-bold text-violet-900 mt-1">
                                {formatCurrency(animatedOpening)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <DollarSign className="w-4 h-4 text-violet-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Closing Balance</p>
                            <p className="text-xl font-bold text-emerald-900 mt-1">
                                {formatCurrency(animatedClosing)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Credits</p>
                            <p className="text-xl font-bold text-green-900 mt-1">
                                {formatCurrency(animatedCredits)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Total Debits</p>
                            <p className="text-xl font-bold text-red-900 mt-1">
                                {formatCurrency(animatedDebits)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <TrendingDown className="w-4 h-4 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className={`${(stats?.net_change || 0) >= 0 ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'} rounded-xl p-4 border`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className={`text-xs font-medium uppercase tracking-wider ${(stats?.net_change || 0) >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>Net Change</p>
                            <p className={`text-xl font-bold mt-1 ${(stats?.net_change || 0) >= 0 ? 'text-amber-900' : 'text-rose-900'}`}>
                                {(stats?.net_change || 0) >= 0 ? '+' : '-'}{formatCurrency(animatedNetChange)}
                            </p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            {(stats?.net_change || 0) >= 0 ? (
                                <ArrowUp className="w-4 h-4 text-amber-600" />
                            ) : (
                                <ArrowDown className="w-4 h-4 text-rose-600" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Section - Daily Balances or Transaction Details */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                            {isTransactionMode ? `Transactions for ${new Date(date!).toLocaleDateString('en-GB')}` : 'Daily Balance History'}
                        </h2>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Rows:</span>
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
                    </div>
                </div>

                {isTransactionMode ? (
                    /* Transaction Details Mode */
                    transactionsLoading ? (
                        <div className="p-8 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="p-8 text-center">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No transactions found for this date</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Mode</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved By</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attachments</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    <div className="flex items-center space-x-1.5">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        <span className="font-medium">{formatTime(tx.created_at)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === "Credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                                        }`}>
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {tx.category || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                                                    {tx.description || 'No description'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {tx.payment_mode || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {tx.created_by_name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700">
                                                    {tx.approved_by_name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {tx.attachments && tx.attachments.length > 0 ? (
                                                        <button className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs">
                                                            <Paperclip className="w-3 h-3 mr-1" />
                                                            {tx.attachments.length}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between border-t border-gray-200 p-4">
                                <div className="text-sm text-gray-600">
                                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} transactions
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <span className="text-sm text-gray-700">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )
                ) : (
                    /* Daily Balance Mode */
                    balancesLoading ? (
                        <div className="p-8 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : dailyBalances.length === 0 ? (
                        <div className="p-8 text-center">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No daily balance records found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Balance</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Change</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {dailyBalances.map((balance, idx) => {
                                            const netChange = Number(balance.net_change || 0);
                                            const isPositive = netChange >= 0;
                                            return (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        <div className="flex items-center space-x-2">
                                                            <Calendar className="w-3 h-3 text-gray-400" />
                                                            <span>{new Date(balance.date).toLocaleDateString('en-GB')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {formatCurrency(Number(balance.opening_balance || 0))}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                        {formatCurrency(Number(balance.closing_balance || 0))}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center space-x-1.5">
                                                            {isPositive ? (
                                                                <ArrowUp className="w-3 h-3 text-green-600" />
                                                            ) : (
                                                                <ArrowDown className="w-3 h-3 text-red-600" />
                                                            )}
                                                            <span className={`text-sm font-medium ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                                                                {formatCurrency(Math.abs(netChange))}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {balance.transaction_count || 0}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between border-t border-gray-200 p-4">
                                <div className="text-sm text-gray-600">
                                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} days
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1}
                                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <span className="text-sm text-gray-700">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                                        disabled={page >= totalPages}
                                        className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )
                )}
            </div>
        </div>
    );
}

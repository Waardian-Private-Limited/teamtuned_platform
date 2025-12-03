"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import {
    ArrowLeft,
    Calendar,
    TrendingUp,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    ArrowUp,
    ArrowDown
} from "lucide-react";

type TransactionSummary = {
    date: string;
    opening_balance: number;
    total_credit: number;
    total_debit: number;
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
    created_at: string;
};

interface WalletTransactionsProps {
    walletId: string;
    walletName?: string;
    siteName?: string;
}

export default function WalletTransactions({ walletId, walletName, siteName }: WalletTransactionsProps) {
    const router = useRouter();
    const pathname = usePathname();

    // State
    const [summary, setSummary] = useState<TransactionSummary[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);

    // Expanded rows
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [rowTransactions, setRowTransactions] = useState<Map<string, Transaction[]>>(new Map());
    const [loadingRows, setLoadingRows] = useState<Set<string>>(new Set());

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format time
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Load summary
    const loadSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient<any>("/site-wallets/transactions/summary", {
                method: "GET",
                withAuth: true,
                params: {
                    wallet_id: walletId,
                    page: String(page),
                    limit: String(pageSize)
                }
            });

            setSummary(data.summary || []);
            setTotal(data.total || 0);
        } catch (e: any) {
            setError(e?.message || "Failed to load transaction summary");
        } finally {
            setLoading(false);
        }
    };

    // Load transactions for a specific date
    const loadTransactionsForDate = async (date: string) => {
        setLoadingRows(prev => new Set(prev).add(date));
        try {
            const data = await apiClient<any>("/site-wallets/transactions/by-date", {
                method: "GET",
                withAuth: true,
                params: {
                    wallet_id: walletId,
                    date,
                    limit: "5" // Only load first 5 for preview
                }
            });

            setRowTransactions(prev => new Map(prev).set(date, data.transactions || []));
        } catch (e: any) {
            console.error("Failed to load transactions:", e);
        } finally {
            setLoadingRows(prev => {
                const newSet = new Set(prev);
                newSet.delete(date);
                return newSet;
            });
        }
    };

    // Toggle row expansion
    const toggleRow = (date: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(date)) {
            newExpanded.delete(date);
        } else {
            newExpanded.add(date);
            // Load transactions if not already loaded
            if (!rowTransactions.has(date)) {
                loadTransactionsForDate(date);
            }
        }
        setExpandedRows(newExpanded);
    };

    // Navigate to full details
    const viewAllTransactions = (date: string) => {
        const basePath = pathname?.includes('/employee') ? '/employee' : '/org-admin';
        router.push(`${basePath}/wallets/${walletId}/transactions/${date}`);
    };

    // Initial load
    useEffect(() => {
        loadSummary();
    }, [page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Loading skeleton
    if (loading && summary.length === 0) {
        return (
            <div className="space-y-4">
                {/* Header Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>

                {/* Table Skeleton */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-200">
                        <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                    </div>
                    <div className="p-4 space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Wallet Transactions</h1>
                        {(walletName || siteName) && (
                            <p className="text-sm text-gray-600 mt-0.5">
                                {siteName && `${siteName} - `}{walletName}
                            </p>
                        )}
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

            {/* Transaction Summary Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Daily Transaction Summary</h2>
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
                            </select>
                        </div>
                    </div>
                </div>

                {summary.length === 0 ? (
                    <div className="p-8 text-center">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No transactions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening Balance</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Credit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Debit</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing Balance</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Change</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {summary.map((row) => {
                                    const isExpanded = expandedRows.has(row.date);
                                    const transactions = rowTransactions.get(row.date) || [];
                                    const isLoading = loadingRows.has(row.date);

                                    return (
                                        <React.Fragment key={row.date}>
                                            <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRow(row.date)}>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium">{new Date(row.date).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {formatCurrency(row.opening_balance)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center space-x-1.5">
                                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                                        <span className="font-medium text-green-700">{formatCurrency(row.total_credit)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center space-x-1.5">
                                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                                        <span className="font-medium text-red-700">{formatCurrency(row.total_debit)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {formatCurrency(row.closing_balance)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center space-x-1.5">
                                                        {row.net_change >= 0 ? (
                                                            <ArrowUp className="w-3 h-3 text-green-600" />
                                                        ) : (
                                                            <ArrowDown className="w-3 h-3 text-red-600" />
                                                        )}
                                                        <span className={`text-sm font-medium ${row.net_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                            {formatCurrency(Math.abs(row.net_change))}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {row.transaction_count}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right">
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                                    ) : (
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </td>
                                            </tr>

                                            {/* Expanded Row */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-0">
                                                        <div className="bg-gray-50 border-t border-gray-200 py-3 transition-all duration-300 ease-in-out">
                                                            {isLoading ? (
                                                                <div className="flex items-center justify-center py-4">
                                                                    <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                                                                </div>
                                                            ) : transactions.length === 0 ? (
                                                                <div className="text-center py-4 text-gray-500 text-sm">
                                                                    No transactions available
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-2">
                                                                    {transactions.map((tx) => (
                                                                        <div
                                                                            key={tx.id}
                                                                            className="bg-white rounded-lg p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
                                                                        >
                                                                            <div className="flex items-center space-x-4 flex-1">
                                                                                <div className="flex items-center space-x-2">
                                                                                    <Clock className="w-4 h-4 text-gray-400" />
                                                                                    <span className="text-sm text-gray-600 font-medium">
                                                                                        {formatTime(tx.created_at)}
                                                                                    </span>
                                                                                </div>
                                                                                <div>
                                                                                    <span
                                                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tx.type === "Credit"
                                                                                            ? "bg-green-100 text-green-800"
                                                                                            : "bg-red-100 text-red-800"
                                                                                            }`}
                                                                                    >
                                                                                        {tx.type}
                                                                                    </span>
                                                                                </div>
                                                                                {tx.category && (
                                                                                    <div className="text-sm text-gray-600">
                                                                                        {tx.category}
                                                                                    </div>
                                                                                )}
                                                                                <div className="text-sm text-gray-700 flex-1 truncate">
                                                                                    {tx.description || "No description"}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-sm font-semibold text-gray-900">
                                                                                {formatCurrency(tx.amount)}
                                                                            </div>
                                                                        </div>
                                                                    ))}

                                                                    {/* View All Button */}
                                                                    {row.transaction_count > 5 && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                viewAllTransactions(row.date);
                                                                            }}
                                                                            className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                                                                        >
                                                                            <Eye className="w-4 h-4" />
                                                                            <span>View All {row.transaction_count} Transactions</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {summary.length > 0 && (
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
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-sm text-gray-700">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page >= totalPages}
                                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

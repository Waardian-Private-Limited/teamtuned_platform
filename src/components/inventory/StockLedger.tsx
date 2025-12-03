"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { BookOpen, Search, ChevronLeft, ChevronRight, Store, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useInventoryStore } from "./InventoryStoreContext";

interface LedgerEntry {
    id: number;
    store_id: number;
    item_id: number;
    batch_id: number | null;
    serial_id: number | null;
    txn_type: 'GRN' | 'ISSUE' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN' | 'DAMAGE' | 'OPENING_STOCK';
    qty_change: number;
    reference_id: number | null;
    reference_type: string | null;
    balance_qty: number;
    created_by: number;
    created_at: string;
    item_name: string;
    item_code: string;
    uom: string;
    category_name?: string;
    subcategory_name?: string;
    first_name?: string;
    last_name?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const TXN_TYPE_COLORS = {
    GRN: 'bg-green-100 text-green-800 border-green-200',
    ISSUE: 'bg-red-100 text-red-800 border-red-200',
    TRANSFER_IN: 'bg-blue-100 text-blue-800 border-blue-200',
    TRANSFER_OUT: 'bg-orange-100 text-orange-800 border-orange-200',
    RETURN: 'bg-purple-100 text-purple-800 border-purple-200',
    DAMAGE: 'bg-gray-100 text-gray-800 border-gray-200',
    OPENING_STOCK: 'bg-indigo-100 text-indigo-800 border-indigo-200'
};

export default function StockLedger() {
    const { selectedStore } = useInventoryStore();
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [txnTypeFilter, setTxnTypeFilter] = useState("");

    useEffect(() => {
        if (selectedStore) {
            fetchLedger(1, searchInput, txnTypeFilter);
        }
    }, [selectedStore]);

    const fetchLedger = async (page: number, searchTerm: string, txnType: string) => {
        if (!selectedStore) return;

        setLoading(true);
        try {
            const params: any = {
                store_id: selectedStore.id,
                page: page.toString(),
                limit: '20'
            };
            if (searchTerm) params.search = searchTerm;
            if (txnType) params.txn_type = txnType;

            const res = await apiClient<{ ledger: LedgerEntry[]; pagination: Pagination }>(
                '/inventory/ledger',
                {
                    method: 'GET',
                    withAuth: true,
                    params
                }
            );

            setLedger(res?.ledger || []);
            setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err: any) {
            console.error("Failed to fetch ledger:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearch(searchInput);
        fetchLedger(1, searchInput, txnTypeFilter);
    };

    const handleTxnTypeFilter = (txnType: string) => {
        setTxnTypeFilter(txnType);
        fetchLedger(1, search, txnType);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchLedger(newPage, search, txnTypeFilter);
        }
    };

    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString();
    };

    const getUserName = (entry: LedgerEntry) => {
        if (entry.first_name || entry.last_name) {
            return [entry.first_name, entry.last_name].filter(Boolean).join(' ');
        }
        return 'System';
    };

    if (!selectedStore) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
                    <Store className="mx-auto h-12 w-12 text-amber-600 mb-3" />
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">No Store Selected</h3>
                    <p className="text-amber-700">
                        Please select a store from the Store Selection page to view ledger.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <BookOpen className="text-indigo-600" size={28} />
                    Stock Ledger
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-slate-600">Current Store:</span>
                    <span className="font-semibold text-indigo-700">{selectedStore.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{selectedStore.site_name}</span>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-6 flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by item name, code, or reference..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    Search
                </button>
                <select
                    value={txnTypeFilter}
                    onChange={(e) => handleTxnTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">All Transactions</option>
                    <option value="GRN">GRN</option>
                    <option value="ISSUE">Issue</option>
                    <option value="TRANSFER_IN">Transfer In</option>
                    <option value="TRANSFER_OUT">Transfer Out</option>
                    <option value="RETURN">Return</option>
                    <option value="DAMAGE">Damage</option>
                    <option value="OPENING_STOCK">Opening Stock</option>
                </select>
            </div>

            {/* Ledger Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : ledger.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600 mb-2">No ledger entries found</p>
                    <p className="text-sm text-slate-500">
                        {search || txnTypeFilter ? "Try adjusting your search or filter criteria" : "This store has no transactions yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date/Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Txn Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Qty Change</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Balance</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Reference</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Created By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {ledger.map((entry) => (
                                        <tr key={entry.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(entry.created_at)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="text-slate-900">{entry.item_name}</div>
                                                <div className="text-xs text-slate-500">{entry.item_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${TXN_TYPE_COLORS[entry.txn_type]}`}>
                                                    {entry.txn_type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {entry.qty_change > 0 ? (
                                                        <ArrowUpCircle size={16} className="text-green-600" />
                                                    ) : (
                                                        <ArrowDownCircle size={16} className="text-red-600" />
                                                    )}
                                                    <span className={`font-semibold ${entry.qty_change > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                        {entry.qty_change > 0 ? '+' : ''}{Number(entry.qty_change).toFixed(2)} {entry.uom}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                                                {Number(entry.balance_qty).toFixed(2)} {entry.uom}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {entry.reference_type && entry.reference_id ? (
                                                    <div>
                                                        <div className="font-medium">{entry.reference_type}</div>
                                                        <div className="text-xs text-slate-500">#{entry.reference_id}</div>
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{getUserName(entry)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between">
                            <div className="text-sm text-slate-600">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                                {pagination.total} entries
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (pagination.page <= 3) {
                                            pageNum = i + 1;
                                        } else if (pagination.page >= pagination.totalPages - 2) {
                                            pageNum = pagination.totalPages - 4 + i;
                                        } else {
                                            pageNum = pagination.page - 2 + i;
                                        }
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`px-3 py-1 rounded-lg ${pagination.page === pageNum
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'border border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Package, Search, ChevronLeft, ChevronRight, Store, Calendar } from "lucide-react";
import { useInventoryStore } from "./InventoryStoreContext";

interface BatchItem {
    id: number;
    store_id: number;
    item_id: number;
    batch_no: string;
    qty: number;
    expiry_date: string | null;
    mfg_date: string | null;
    status: 'good' | 'expiring' | 'expired' | 'damaged' | 'scrap';
    item_name: string;
    item_code: string;
    uom: string;
    category_name?: string;
    subcategory_name?: string;
    days_to_expiry?: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const STATUS_COLORS = {
    good: 'bg-green-100 text-green-800 border-green-200',
    expiring: 'bg-amber-100 text-amber-800 border-amber-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
    damaged: 'bg-orange-100 text-orange-800 border-orange-200',
    scrap: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function StoreBatch() {
    const { selectedStore } = useInventoryStore();
    const [batches, setBatches] = useState<BatchItem[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        if (selectedStore) {
            fetchBatches(1, searchInput, statusFilter);
        }
    }, [selectedStore]);

    const fetchBatches = async (page: number, searchTerm: string, status: string) => {
        if (!selectedStore) return;

        setLoading(true);
        try {
            const params: any = {
                store_id: selectedStore.id,
                page: page.toString(),
                limit: '20'
            };
            if (searchTerm) params.search = searchTerm;
            if (status) params.status = status;

            const res = await apiClient<{ batches: BatchItem[]; pagination: Pagination }>(
                '/inventory/batches',
                {
                    method: 'GET',
                    withAuth: true,
                    params
                }
            );

            setBatches(res?.batches || []);
            setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err: any) {
            console.error("Failed to fetch batches:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearch(searchInput);
        fetchBatches(1, searchInput, statusFilter);
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        fetchBatches(1, search, status);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchBatches(newPage, search, statusFilter);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    if (!selectedStore) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
                    <Store className="mx-auto h-12 w-12 text-amber-600 mb-3" />
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">No Store Selected</h3>
                    <p className="text-amber-700">
                        Please select a store from the Store Selection page to view batches.
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
                    <Calendar className="text-indigo-600" size={28} />
                    Store Batches
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
                        placeholder="Search by batch number or item name..."
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
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">All Status</option>
                    <option value="good">Good</option>
                    <option value="expiring">Expiring</option>
                    <option value="expired">Expired</option>
                    <option value="damaged">Damaged</option>
                    <option value="scrap">Scrap</option>
                </select>
            </div>

            {/* Batches Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : batches.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600 mb-2">No batches found</p>
                    <p className="text-sm text-slate-500">
                        {search || statusFilter ? "Try adjusting your search or filter criteria" : "This store has no batch items yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Batch No</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item Name</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Mfg Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Expiry Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Days Left</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {batches.map((batch) => (
                                        <tr key={batch.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm font-mono text-slate-900">{batch.batch_no}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="text-slate-900">{batch.item_name}</div>
                                                <div className="text-xs text-slate-500">{batch.item_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                                                {Number(batch.qty).toFixed(2)} {batch.uom}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(batch.mfg_date)}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(batch.expiry_date)}</td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                {batch.days_to_expiry !== null && batch.days_to_expiry !== undefined ? (
                                                    <span className={`font-semibold ${batch.days_to_expiry < 0 ? 'text-red-700' :
                                                            batch.days_to_expiry < 30 ? 'text-amber-700' :
                                                                'text-green-700'
                                                        }`}>
                                                        {batch.days_to_expiry} days
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[batch.status]}`}>
                                                    {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                                                </span>
                                            </td>
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
                                {pagination.total} batches
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

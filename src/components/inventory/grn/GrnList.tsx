"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { FileText, Search, ChevronLeft, ChevronRight, Store, Eye, Plus } from "lucide-react";
import { useInventoryStore } from "../InventoryStoreContext";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface GrnItem {
    id: number;
    grn_type: 'OPENING' | 'VENDOR' | 'TRANSFER' | 'REPLACEMENT';
    store_id: number;
    vendor_id: number | null;
    invoice_no: string | null;
    invoice_date: string | null;
    status: 'draft' | 'submitted';
    created_at: string;
    created_by: number;
    store_name: string;
    vendor_name: string | null;
    first_name: string;
    last_name: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const GRN_TYPE_COLORS = {
    OPENING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    VENDOR: 'bg-green-100 text-green-800 border-green-200',
    TRANSFER: 'bg-blue-100 text-blue-800 border-blue-200',
    REPLACEMENT: 'bg-purple-100 text-purple-800 border-purple-200'
};

const STATUS_COLORS = {
    draft: 'bg-amber-100 text-amber-800 border-amber-200',
    submitted: 'bg-green-100 text-green-800 border-green-200'
};

export default function GrnList() {
    const router = useRouter();
    const pathname = usePathname();
    const { selectedStore } = useInventoryStore();
    const [grns, setGrns] = useState<GrnItem[]>([]);
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
    const [typeFilter, setTypeFilter] = useState("");

    useEffect(() => {
        fetchGrns(1, searchInput, statusFilter, typeFilter);
    }, [selectedStore]);

    const fetchGrns = async (page: number, searchTerm: string, status: string, grnType: string) => {
        setLoading(true);
        try {
            const params: any = {
                page: page.toString(),
                limit: '20'
            };
            if (selectedStore) params.store_id = selectedStore.id;
            if (searchTerm) params.search = searchTerm;
            if (status) params.status = status;
            if (grnType) params.grn_type = grnType;

            const res = await apiClient<{ grns: GrnItem[]; pagination: Pagination }>(
                '/inventory/grn',
                {
                    method: 'GET',
                    withAuth: true,
                    params
                }
            );

            setGrns(res?.grns || []);
            setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err: any) {
            console.error("Failed to fetch GRNs:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearch(searchInput);
        fetchGrns(1, searchInput, statusFilter, typeFilter);
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        fetchGrns(1, search, status, typeFilter);
    };

    const handleTypeFilter = (type: string) => {
        setTypeFilter(type);
        fetchGrns(1, search, statusFilter, type);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchGrns(newPage, search, statusFilter, typeFilter);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString();
    };

    const getUserName = (grn: GrnItem) => {
        return [grn.first_name, grn.last_name].filter(Boolean).join(' ') || 'Unknown';
    };

    const getBasePath = () => {
        return pathname.includes('/org-admin') ? '/org-admin' : '/employee';
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <FileText className="text-indigo-600" size={28} />
                        Goods Receiving Notes (GRN)
                    </h1>
                    {selectedStore && (
                        <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="text-slate-600">Current Store:</span>
                            <span className="font-semibold text-indigo-700">{selectedStore.name}</span>
                        </div>
                    )}
                </div>
                <Link
                    href={`${getBasePath()}/inventory/grn/new`}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <Plus size={20} />
                    Create GRN
                </Link>
            </div>

            {/* Filters */}
            <div className="mb-6 flex gap-3 flex-wrap">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by invoice number or remarks..."
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
                    value={typeFilter}
                    onChange={(e) => handleTypeFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">All Types</option>
                    <option value="OPENING">Opening Stock</option>
                    <option value="VENDOR">Vendor Delivery</option>
                    <option value="TRANSFER">Transfer Receive</option>
                    <option value="REPLACEMENT">Replacement</option>
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                </select>
            </div>

            {/* GRN Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : grns.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600 mb-2">No GRNs found</p>
                    <p className="text-sm text-slate-500">
                        {search || statusFilter || typeFilter ? "Try adjusting your filters" : "Create your first GRN to get started"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">GRN ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Store</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Vendor</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Invoice</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Date</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Created By</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {grns.map((grn) => (
                                        <tr key={grn.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">#{grn.id}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${GRN_TYPE_COLORS[grn.grn_type]}`}>
                                                    {grn.grn_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-900">{grn.store_name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{grn.vendor_name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{grn.invoice_no || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(grn.created_at)}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[grn.status]}`}>
                                                    {grn.status.charAt(0).toUpperCase() + grn.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{getUserName(grn)}</td>
                                            <td className="px-4 py-3 text-sm text-center">
                                                <button
                                                    onClick={() => router.push(`${getBasePath()}/inventory/grn/${grn.id}`)}
                                                    className="inline-flex items-center gap-1 px-3 py-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
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
                                {pagination.total} GRNs
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

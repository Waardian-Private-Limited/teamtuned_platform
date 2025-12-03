"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Hash, Search, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { useInventoryStore } from "./InventoryStoreContext";

interface SerialItem {
    id: number;
    store_id: number;
    item_id: number;
    serial_no: string;
    status: 'available' | 'issued' | 'damaged' | 'scrap';
    issued_to: string | null;
    issued_date: string | null;
    item_name: string;
    item_code: string;
    uom: string;
    category_name?: string;
    subcategory_name?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const STATUS_COLORS = {
    available: 'bg-green-100 text-green-800 border-green-200',
    issued: 'bg-blue-100 text-blue-800 border-blue-200',
    damaged: 'bg-orange-100 text-orange-800 border-orange-200',
    scrap: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function StoreSerial() {
    const { selectedStore } = useInventoryStore();
    const [serials, setSerials] = useState<SerialItem[]>([]);
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
            fetchSerials(1, searchInput, statusFilter);
        }
    }, [selectedStore]);

    const fetchSerials = async (page: number, searchTerm: string, status: string) => {
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

            const res = await apiClient<{ serials: SerialItem[]; pagination: Pagination }>(
                '/inventory/serials',
                {
                    method: 'GET',
                    withAuth: true,
                    params
                }
            );

            setSerials(res?.serials || []);
            setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err: any) {
            console.error("Failed to fetch serials:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearch(searchInput);
        fetchSerials(1, searchInput, statusFilter);
    };

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        fetchSerials(1, search, status);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchSerials(newPage, search, statusFilter);
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
                        Please select a store from the Store Selection page to view serials.
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
                    <Hash className="text-indigo-600" size={28} />
                    Store Serials
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
                        placeholder="Search by serial number or item name..."
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
                    <option value="available">Available</option>
                    <option value="issued">Issued</option>
                    <option value="damaged">Damaged</option>
                    <option value="scrap">Scrap</option>
                </select>
            </div>

            {/* Serials Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : serials.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Hash className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600 mb-2">No serials found</p>
                    <p className="text-sm text-slate-500">
                        {search || statusFilter ? "Try adjusting your search or filter criteria" : "This store has no serialized items yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Serial No</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Issued To</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Issued Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {serials.map((serial) => (
                                        <tr key={serial.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-900">{serial.serial_no}</td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="text-slate-900">{serial.item_name}</div>
                                                <div className="text-xs text-slate-500">{serial.item_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${STATUS_COLORS[serial.status]}`}>
                                                    {serial.status.charAt(0).toUpperCase() + serial.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{serial.issued_to || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{formatDate(serial.issued_date)}</td>
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
                                {pagination.total} serials
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

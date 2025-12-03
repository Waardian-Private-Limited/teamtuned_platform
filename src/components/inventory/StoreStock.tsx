"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Package, Search, ChevronLeft, ChevronRight, Store } from "lucide-react";
import { useInventoryStore } from "./InventoryStoreContext";

interface StockItem {
    id: number;
    store_id: number;
    item_id: number;
    total_qty: number;
    available_qty: number;
    reserved_qty: number;
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

export default function StoreStock() {
    const { selectedStore } = useInventoryStore();
    const [stock, setStock] = useState<StockItem[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");

    useEffect(() => {
        if (selectedStore) {
            fetchStock(1, searchInput);
        }
    }, [selectedStore]);

    const fetchStock = async (page: number, searchTerm: string) => {
        if (!selectedStore) return;

        setLoading(true);
        try {
            const params: any = {
                store_id: selectedStore.id,
                page: page.toString(),
                limit: '20'
            };
            if (searchTerm) {
                params.search = searchTerm;
            }

            const res = await apiClient<{ stock: StockItem[]; pagination: Pagination }>(
                '/inventory/stock',
                {
                    method: 'GET',
                    withAuth: true,
                    params
                }
            );

            setStock(res?.stock || []);
            setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err: any) {
            console.error("Failed to fetch stock:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setSearch(searchInput);
        fetchStock(1, searchInput);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchStock(newPage, search);
        }
    };

    if (!selectedStore) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
                    <Store className="mx-auto h-12 w-12 text-amber-600 mb-3" />
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">No Store Selected</h3>
                    <p className="text-amber-700">
                        Please select a store from the Store Selection page to view stock.
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
                    <Package className="text-indigo-600" size={28} />
                    Store Stock
                </h1>
                <div className="mt-2 flex items-center gap-2 text-sm">
                    <span className="text-slate-600">Current Store:</span>
                    <span className="font-semibold text-indigo-700">{selectedStore.name}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600">{selectedStore.site_name}</span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by item name or code..."
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
            </div>

            {/* Stock Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : stock.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600 mb-2">No stock items found</p>
                    <p className="text-sm text-slate-500">
                        {search ? "Try adjusting your search criteria" : "This store has no stock items yet"}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Category</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Available</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Reserved</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">UOM</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {stock.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-sm font-mono text-slate-700">{item.item_code}</td>
                                            <td className="px-4 py-3 text-sm text-slate-900">{item.item_name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">
                                                {item.category_name}
                                                {item.subcategory_name && (
                                                    <span className="text-slate-400"> / {item.subcategory_name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                                                {Number(item.total_qty).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-green-700">
                                                {Number(item.available_qty).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right text-amber-700">
                                                {Number(item.reserved_qty).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{item.uom}</td>
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
                                {pagination.total} items
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

"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { X, Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Vendor {
    id: number;
    vendor_name: string;
    vendor_code: string;
    contact_person?: string;
    phone?: string;
    email?: string;
}

interface Category {
    id: number;
    category_name: string;
}

interface Subcategory {
    id: number;
    subcategory_name: string;
    category_id: number;
}

interface InventoryItem {
    id: number;
    item_name: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface Props {
    onSelect: (vendor: Vendor) => void;
    onClose: () => void;
}

export default function VendorSearchModal({ onSelect, onClose }: Props) {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);

    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
    const [itemId, setItemId] = useState<number | null>(null);

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
        fetchItems();
        fetchVendors(1, "", null, null, null);
    }, []);

    useEffect(() => {
        if (categoryId) {
            setFilteredSubcategories(subcategories.filter(sc => sc.category_id === categoryId));
            setSubcategoryId(null);
        } else {
            setFilteredSubcategories([]);
            setSubcategoryId(null);
        }
    }, [categoryId, subcategories]);

    const fetchCategories = async () => {
        try {
            const res = await apiClient<{ categories: Category[] }>(
                '/inventory/categories',
                { method: 'GET', withAuth: true }
            );
            setCategories(res?.categories || []);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    };

    const fetchSubcategories = async () => {
        try {
            const res = await apiClient<{ subcategories: Subcategory[] }>(
                '/inventory/subcategories',
                { method: 'GET', withAuth: true }
            );
            setSubcategories(res?.subcategories || []);
        } catch (err) {
            console.error("Failed to fetch subcategories:", err);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await apiClient<{ items: InventoryItem[] }>(
                '/inventory/items',
                {
                    method: 'GET',
                    withAuth: true,
                    params: { limit: '1000' } // Get all items for dropdown
                }
            );
            setItems(res?.items || []);
        } catch (err) {
            console.error("Failed to fetch items:", err);
        }
    };

    const fetchVendors = async (
        page: number,
        searchTerm: string,
        catId: number | null,
        subCatId: number | null,
        itmId: number | null
    ) => {
        setLoading(true);
        try {
            const params: any = {
                page: page.toString(),
                limit: '20'
            };
            if (searchTerm) params.search = searchTerm;
            if (catId) params.category_id = catId;
            if (subCatId) params.subcategory_id = subCatId;
            if (itmId) params.item_id = itmId;

            const res = await apiClient<{ vendors: Vendor[]; pagination: Pagination }>(
                '/vendors',
                {
                    method: 'GET',
                    withAuth: true,
                    params
                }
            );

            setVendors(res?.vendors || []);
            setPagination(res?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
        } catch (err: any) {
            console.error("Failed to fetch vendors:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchVendors(1, search, categoryId, subcategoryId, itemId);
    };

    const handleCategoryChange = (catId: number | null) => {
        setCategoryId(catId);
        setItemId(null); // Reset item when category changes
        fetchVendors(1, search, catId, null, null);
    };

    const handleSubcategoryChange = (subCatId: number | null) => {
        setSubcategoryId(subCatId);
        setItemId(null); // Reset item when subcategory changes
        fetchVendors(1, search, categoryId, subCatId, null);
    };

    const handleItemChange = (itmId: number | null) => {
        setItemId(itmId);
        fetchVendors(1, search, categoryId, subcategoryId, itmId);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchVendors(newPage, search, categoryId, subcategoryId, itemId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Select Vendor</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-slate-200 space-y-4">
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by vendor name or code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
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

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select
                                value={categoryId || ''}
                                onChange={(e) => handleCategoryChange(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Subcategory</label>
                            <select
                                value={subcategoryId || ''}
                                onChange={(e) => handleSubcategoryChange(e.target.value ? Number(e.target.value) : null)}
                                disabled={!categoryId}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100"
                            >
                                <option value="">All Subcategories</option>
                                {filteredSubcategories.map(subcat => (
                                    <option key={subcat.id} value={subcat.id}>{subcat.subcategory_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Item</label>
                            <select
                                value={itemId || ''}
                                onChange={(e) => handleItemChange(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Items</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>{item.item_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Vendors List */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-350px)]">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : vendors.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No vendors found
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Vendor</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Contact Person</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Phone</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Email</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {vendors.map((vendor) => (
                                        <tr key={vendor.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-slate-900">{vendor.vendor_name}</div>
                                                <div className="text-xs text-slate-500">{vendor.vendor_code}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{vendor.contact_person || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{vendor.phone || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-700">{vendor.email || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => onSelect(vendor)}
                                                    className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                                                >
                                                    Select
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                    <div className="p-6 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                            {pagination.total} vendors
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
            </div>
        </div>
    );
}

"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Plus, Search, Filter, Edit2, Trash2, Package, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface Item {
    id: number;
    item_name: string;
    item_code: string;
    category_name: string;
    subcategory_name: string;
    uom: string;
    is_asset: boolean;
    is_batch_tracked: boolean;
    is_serial_tracked: boolean;
    is_expiry_tracked: boolean;
    min_stock?: number;
    max_stock?: number;
    vendor_name?: string;
    is_active: boolean;
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

interface Vendor {
    id: number;
    vendor_name: string;
}

export default function ItemList() {
    const [items, setItems] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [subcategoryFilter, setSubcategoryFilter] = useState("");
    const [vendorFilter, setVendorFilter] = useState("");
    const [assetFilter, setAssetFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("true");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
        fetchVendors();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [search, categoryFilter, subcategoryFilter, vendorFilter, assetFilter, activeFilter]);

    const fetchCategories = async () => {
        try {
            const res = await apiClient<{ categories: Category[] }>('/inventory/categories', {
                method: 'GET',
                withAuth: true,
                params: { active: 'true', pageSize: '100' }
            });
            setCategories(res?.categories || []);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    };

    const fetchSubcategories = async () => {
        try {
            const res = await apiClient<{ subcategories: Subcategory[] }>('/inventory/subcategories', {
                method: 'GET',
                withAuth: true,
                params: { active: 'true', pageSize: '200' }
            });
            setSubcategories(res?.subcategories || []);
        } catch (err) {
            console.error("Failed to fetch subcategories:", err);
        }
    };

    const fetchVendors = async () => {
        try {
            const res = await apiClient<{ vendors: Vendor[] }>('/vendors', {
                method: 'GET',
                withAuth: true,
                params: { active: 'true', pageSize: '100' }
            });
            setVendors(res?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch vendors:", err);
        }
    };

    const fetchItems = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (categoryFilter) params.category_id = categoryFilter.toString();
            if (subcategoryFilter) params.subcategory_id = subcategoryFilter.toString();
            if (vendorFilter) params.vendor_id = vendorFilter.toString();
            if (assetFilter) params.is_asset = assetFilter;
            if (activeFilter) params.active = activeFilter;

            const res = await apiClient<{ items: Item[] }>('/items', {
                method: 'GET',
                withAuth: true,
                params
            });
            setItems(res?.items || []);
        } catch (err) {
            console.error("Failed to fetch items:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to deactivate this item?')) return;

        try {
            await apiClient(`/items/${id}`, {
                method: 'DELETE',
                withAuth: true
            });
            fetchItems();
        } catch (err) {
            console.error("Failed to delete item:", err);
            alert('Failed to delete item');
        }
    };

    const filteredSubcategories = categoryFilter
        ? subcategories.filter(sub => sub.category_id.toString() === categoryFilter)
        : subcategories;

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Package className="text-indigo-600" size={28} />
                        Item Management
                    </h1>
                    <p className="text-slate-600 mt-2">Manage your inventory items and stock.</p>
                </div>
                <Link
                    href="/org-admin/inventory/items/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Add Item
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search items..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Filter size={18} />
                        Filters
                    </button>
                </div>

                {showFilters && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setSubcategoryFilter(''); // Reset subcategory when category changes
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Subcategory</label>
                                <select
                                    value={subcategoryFilter}
                                    onChange={(e) => setSubcategoryFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    disabled={!categoryFilter}
                                >
                                    <option value="">All Subcategories</option>
                                    {filteredSubcategories.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Vendor</label>
                                <select
                                    value={vendorFilter}
                                    onChange={(e) => setVendorFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">All Vendors</option>
                                    {vendors.map(vendor => (
                                        <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Asset Type</label>
                                <select
                                    value={assetFilter}
                                    onChange={(e) => setAssetFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">All Types</option>
                                    <option value="true">Assets</option>
                                    <option value="false">Non-Assets</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                                <select
                                    value={activeFilter}
                                    onChange={(e) => setActiveFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">All</option>
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600">No items found. Create your first item to get started.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">UOM</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Flags</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {items.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-slate-900">{item.item_name}</div>
                                            <div className="text-sm text-slate-500 font-mono">{item.item_code}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <div className="text-slate-700">{item.category_name}</div>
                                            <div className="text-slate-500">→ {item.subcategory_name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-700">{item.uom}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {item.is_serial_tracked && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700" title="Serial Tracked">
                                                    🆔
                                                </span>
                                            )}
                                            {item.is_batch_tracked && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700" title="Batch Tracked">
                                                    🧪
                                                </span>
                                            )}
                                            {item.is_expiry_tracked && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700" title="Expiry Tracked">
                                                    ⏳
                                                </span>
                                            )}
                                            {item.is_asset && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700" title="Asset">
                                                    🛠
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-slate-700">
                                            {item.min_stock !== null && item.max_stock !== null ? (
                                                <span>{item.min_stock} - {item.max_stock}</span>
                                            ) : item.min_stock !== null ? (
                                                <span>Min: {item.min_stock}</span>
                                            ) : item.max_stock !== null ? (
                                                <span>Max: {item.max_stock}</span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-700">{item.vendor_name || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.is_active ? (
                                            <span className="inline-flex items-center gap-1 text-green-700">
                                                <CheckCircle size={16} />
                                                <span className="text-sm">Active</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-red-700">
                                                <XCircle size={16} />
                                                <span className="text-sm">Inactive</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/org-admin/inventory/items/${item.id}`}
                                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Plus, Search, Filter, Edit2, Trash2, Package2, CheckCircle, XCircle, Tag } from "lucide-react";
import Link from "next/link";

interface Subcategory {
    id: number;
    subcategory_name: string;
    subcategory_code: string;
    category_id: number;
    category_name: string;
    category_code: string;
    uom: string;
    is_batch_tracked: boolean;
    is_serial_tracked: boolean;
    is_expiry_required: boolean;
    is_asset: boolean;
    description?: string;
    is_active: boolean;
}

interface Category {
    id: number;
    category_name: string;
}

const UOM_OPTIONS = [
    { value: 'bags', label: 'Bags' },
    { value: 'tons', label: 'Tons' },
    { value: 'kg', label: 'Kg' },
    { value: 'sqft', label: 'Sq.ft' },
    { value: 'liter', label: 'Liter' },
    { value: 'pieces', label: 'Pieces' },
    { value: 'meters', label: 'Meters' },
    { value: 'box', label: 'Box' },
    { value: 'carton', label: 'Carton' },
    { value: 'roll', label: 'Roll' },
    { value: 'sheet', label: 'Sheet' },
    { value: 'unit', label: 'Unit' }
];

export default function SubcategoryList() {
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [uomFilter, setUomFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("true");
    const [batchTracked, setBatchTracked] = useState(false);
    const [serialTracked, setSerialTracked] = useState(false);
    const [expiryRequired, setExpiryRequired] = useState(false);
    const [isAsset, setIsAsset] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchSubcategories();
    }, [search, categoryFilter, uomFilter, activeFilter, batchTracked, serialTracked, expiryRequired, isAsset]);

    const fetchCategories = async () => {
        try {
            const res = await apiClient<{ categories: Category[] }>('/inventory/categories', {
                method: 'GET',
                withAuth: true,
                params: { active: 'true', pageSize: 100 }
            });
            setCategories(res?.categories || []);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    };

    const fetchSubcategories = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (categoryFilter) params.category_id = categoryFilter.toString();
            if (uomFilter) params.uom = uomFilter;
            if (activeFilter) params.active = activeFilter;
            if (batchTracked) params.batch_tracked = 'true';
            if (serialTracked) params.serial_tracked = 'true';
            if (expiryRequired) params.expiry_required = 'true';
            if (isAsset) params.is_asset = 'true';

            const res = await apiClient<{ subcategories: Subcategory[] }>('/inventory/subcategories', {
                method: 'GET',
                withAuth: true,
                params
            });
            setSubcategories(res?.subcategories || []);
        } catch (err) {
            console.error("Failed to fetch subcategories:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to deactivate this subcategory?')) return;

        try {
            await apiClient(`/inventory/subcategories/${id}`, {
                method: 'DELETE',
                withAuth: true
            });
            fetchSubcategories();
        } catch (err) {
            console.error("Failed to delete subcategory:", err);
            alert('Failed to delete subcategory');
        }
    };

    const getUomLabel = (uom: string) => {
        return UOM_OPTIONS.find(u => u.value === uom)?.label || uom;
    };

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
                        <Package2 className="text-indigo-600" size={28} />
                        Inventory Subcategories
                    </h1>
                    <p className="text-slate-600 mt-2">Manage your inventory subcategories with UOM and tracking settings.</p>
                </div>
                <Link
                    href="/org-admin/inventory/subcategories/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Add Subcategory
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search subcategories..."
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Unit of Measure</label>
                                <select
                                    value={uomFilter}
                                    onChange={(e) => setUomFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">All UOMs</option>
                                    {UOM_OPTIONS.map(uom => (
                                        <option key={uom.value} value={uom.value}>{uom.label}</option>
                                    ))}
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

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Tracking Flags</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={batchTracked}
                                        onChange={(e) => setBatchTracked(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Batch Tracked</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={serialTracked}
                                        onChange={(e) => setSerialTracked(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Serial Tracked</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={expiryRequired}
                                        onChange={(e) => setExpiryRequired(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Expiry Required</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isAsset}
                                        onChange={(e) => setIsAsset(e.target.checked)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-slate-700">Asset</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Subcategories Table */}
            {subcategories.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Package2 className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600">No subcategories found. Create your first subcategory to get started.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subcategory</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">UOM</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tracking</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {subcategories.map((sub) => (
                                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-slate-900">{sub.subcategory_name}</div>
                                            {sub.description && (
                                                <div className="text-sm text-slate-500 mt-1">{sub.description}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-700">{sub.category_name}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-slate-600">{sub.subcategory_code}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                            {getUomLabel(sub.uom)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {sub.is_batch_tracked && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                    Batch
                                                </span>
                                            )}
                                            {sub.is_serial_tracked && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                                    Serial
                                                </span>
                                            )}
                                            {sub.is_expiry_required && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                                                    Expiry
                                                </span>
                                            )}
                                            {sub.is_asset && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                                                    Asset
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {sub.is_active ? (
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
                                                href={`/org-admin/inventory/subcategories/${sub.id}`}
                                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(sub.id)}
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

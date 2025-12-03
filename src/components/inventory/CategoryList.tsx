"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Plus, Search, Filter, Edit2, Trash2, Package, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

interface Category {
    id: number;
    category_name: string;
    category_code: string;
    category_type: string;
    description?: string;
    is_active: boolean;
    created_at: string;
}

const CATEGORY_TYPES = [
    { value: 'consumable', label: 'Consumable' },
    { value: 'non_consumable', label: 'Non-Consumable' },
    { value: 'asset', label: 'Asset' },
    { value: 'tools', label: 'Tools' },
    { value: 'chemicals', label: 'Chemicals' },
    { value: 'machinery', label: 'Machinery' },
    { value: 'other', label: 'Other' }
];

export default function CategoryList() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("true");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, [search, typeFilter, activeFilter]);

    const fetchCategories = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (typeFilter) params.type = typeFilter;
            if (activeFilter) params.active = activeFilter;

            const res = await apiClient<{ categories: Category[] }>('/inventory/categories', {
                method: 'GET',
                withAuth: true,
                params
            });
            setCategories(res?.categories || []);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to deactivate this category?')) return;

        try {
            await apiClient(`/inventory/categories/${id}`, {
                method: 'DELETE',
                withAuth: true
            });
            fetchCategories();
        } catch (err) {
            console.error("Failed to delete category:", err);
            alert('Failed to delete category');
        }
    };

    const getCategoryTypeLabel = (type: string) => {
        return CATEGORY_TYPES.find(t => t.value === type)?.label || type;
    };

    const getCategoryTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            consumable: 'bg-blue-100 text-blue-700',
            non_consumable: 'bg-green-100 text-green-700',
            asset: 'bg-purple-100 text-purple-700',
            tools: 'bg-orange-100 text-orange-700',
            chemicals: 'bg-red-100 text-red-700',
            machinery: 'bg-indigo-100 text-indigo-700',
            other: 'bg-gray-100 text-gray-700'
        };

        return colors[type] || colors.other;
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
                        <Package className="text-indigo-600" size={28} />
                        Inventory Categories
                    </h1>
                    <p className="text-slate-600 mt-2">Manage your inventory categories and types.</p>
                </div>
                <Link
                    href="/org-admin/inventory/categories/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Add Category
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search categories..."
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
                    <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Category Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">All Types</option>
                                {CATEGORY_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
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
                )}
            </div>

            {/* Categories Table */}
            {categories.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Package className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600">No categories found. Create your first category to get started.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {categories.map((category) => (
                                <tr key={category.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-slate-900">{category.category_name}</div>
                                            {category.description && (
                                                <div className="text-sm text-slate-500 mt-1">{category.description}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono text-sm text-slate-600">{category.category_code}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryTypeBadge(category.category_type)}`}>
                                            {getCategoryTypeLabel(category.category_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {category.is_active ? (
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
                                                href={`/org-admin/inventory/categories/${category.id}`}
                                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(category.id)}
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

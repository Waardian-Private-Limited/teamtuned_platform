"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Save, ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CategoryFormProps {
    categoryId?: string;
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

export default function CategoryForm({ categoryId }: CategoryFormProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        category_name: '',
        category_code: '',
        category_type: 'other',
        description: '',
        is_active: true
    });
    const [loading, setLoading] = useState(!!categoryId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (categoryId) {
            fetchCategory();
        }
    }, [categoryId]);

    const fetchCategory = async () => {
        try {
            const res = await apiClient<{ category: any }>(`/inventory/categories/${categoryId}`, {
                method: 'GET',
                withAuth: true
            });

            if (res?.category) {
                setFormData({
                    category_name: res.category.category_name || '',
                    category_code: res.category.category_code || '',
                    category_type: res.category.category_type || 'other',
                    description: res.category.description || '',
                    is_active: Boolean(res.category.is_active)
                });
            }
        } catch (err) {
            console.error("Failed to fetch category:", err);
            setError("Failed to load category");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            if (categoryId) {
                // Update existing category
                await apiClient(`/inventory/categories/${categoryId}`, {
                    method: 'PUT',
                    withAuth: true,
                    body: formData
                });
            } else {
                // Create new category
                await apiClient('/inventory/categories', {
                    method: 'POST',
                    withAuth: true,
                    body: formData
                });
            }

            router.push('/org-admin/inventory/categories');
        } catch (err: any) {
            console.error("Failed to save category:", err);
            setError(err?.message || 'Failed to save category');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="mb-6">
                <Link
                    href="/org-admin/inventory/categories"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Categories
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Package className="text-indigo-600" size={28} />
                    {categoryId ? 'Edit Category' : 'Create New Category'}
                </h1>
                <p className="text-slate-600 mt-2">
                    {categoryId ? 'Update category information' : 'Add a new inventory category'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-6">

                    {/* Category Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.category_name}
                            onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                            placeholder="e.g., Cement, Steel, Tiles, Sand"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Category Code */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category Code <span className="text-slate-500 text-xs">(Optional - auto-generated if empty)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.category_code}
                            onChange={(e) => setFormData({ ...formData, category_code: e.target.value.toUpperCase() })}
                            placeholder="e.g., CEM, STL, TIL"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            maxLength={50}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Leave empty to auto-generate from category name
                        </p>
                    </div>

                    {/* Category Type */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category Type
                        </label>
                        <select
                            value={formData.category_type}
                            onChange={(e) => setFormData({ ...formData, category_type: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            {CATEGORY_TYPES.map(type => (
                                <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Description <span className="text-slate-500 text-xs">(Optional)</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add a description for this category..."
                            rows={4}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                    </div>

                    {/* Is Active Toggle */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <span className="block font-medium text-slate-900">Active Status</span>
                                <span className="text-sm text-slate-500">Enable this category for use in inventory</span>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                            </div>
                        </label>
                    </div>

                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <Link
                        href="/org-admin/inventory/categories"
                        className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-sm"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : (categoryId ? 'Update Category' : 'Create Category')}
                    </button>
                </div>
            </form>
        </div>
    );
}

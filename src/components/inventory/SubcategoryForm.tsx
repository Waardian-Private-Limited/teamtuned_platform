"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Save, ArrowLeft, Package2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SubcategoryFormProps {
    subcategoryId?: string;
}

interface Category {
    id: number;
    category_name: string;
    category_code: string;
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

export default function SubcategoryForm({ subcategoryId }: SubcategoryFormProps) {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [formData, setFormData] = useState({
        category_id: '',
        subcategory_name: '',
        subcategory_code: '',
        uom: 'unit',
        is_batch_tracked: false,
        is_serial_tracked: false,
        is_expiry_required: false,
        is_asset: false,
        description: '',
        is_active: true
    });
    const [loading, setLoading] = useState(!!subcategoryId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
        if (subcategoryId) {
            fetchSubcategory();
        }
    }, [subcategoryId]);

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

    const fetchSubcategory = async () => {
        try {
            const res = await apiClient<{ subcategory: any }>(`/inventory/subcategories/${subcategoryId}`, {
                method: 'GET',
                withAuth: true
            });

            if (res?.subcategory) {
                setFormData({
                    category_id: String(res.subcategory.category_id || ''),
                    subcategory_name: res.subcategory.subcategory_name || '',
                    subcategory_code: res.subcategory.subcategory_code || '',
                    uom: res.subcategory.uom || 'unit',
                    is_batch_tracked: Boolean(res.subcategory.is_batch_tracked),
                    is_serial_tracked: Boolean(res.subcategory.is_serial_tracked),
                    is_expiry_required: Boolean(res.subcategory.is_expiry_required),
                    is_asset: Boolean(res.subcategory.is_asset),
                    description: res.subcategory.description || '',
                    is_active: Boolean(res.subcategory.is_active)
                });
            }
        } catch (err) {
            console.error("Failed to fetch subcategory:", err);
            setError("Failed to load subcategory");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            if (subcategoryId) {
                // Update existing subcategory
                await apiClient(`/inventory/subcategories/${subcategoryId}`, {
                    method: 'PUT',
                    withAuth: true,
                    body: formData
                });
            } else {
                // Create new subcategory
                await apiClient('/inventory/subcategories', {
                    method: 'POST',
                    withAuth: true,
                    body: formData
                });
            }

            router.push('/org-admin/inventory/subcategories');
        } catch (err: any) {
            console.error("Failed to save subcategory:", err);
            setError(err?.message || 'Failed to save subcategory');
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
                    href="/org-admin/inventory/subcategories"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Subcategories
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Package2 className="text-indigo-600" size={28} />
                    {subcategoryId ? 'Edit Subcategory' : 'Create New Subcategory'}
                </h1>
                <p className="text-slate-600 mt-2">
                    {subcategoryId ? 'Update subcategory information' : 'Add a new inventory subcategory'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-6">

                    {/* Subcategory Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Subcategory Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.subcategory_name}
                            onChange={(e) => setFormData({ ...formData, subcategory_name: e.target.value })}
                            placeholder="e.g., OPC Cement, TMT 12mm, Decorative Tiles"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.category_id}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Subcategory Code */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Subcategory Code <span className="text-slate-500 text-xs">(Optional - auto-generated if empty)</span>
                        </label>
                        <input
                            type="text"
                            value={formData.subcategory_code}
                            onChange={(e) => setFormData({ ...formData, subcategory_code: e.target.value.toUpperCase() })}
                            placeholder="e.g., OPC-43, TMT12, TILE-DEC"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                            maxLength={50}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                            Leave empty to auto-generate from subcategory name and category code
                        </p>
                    </div>

                    {/* Unit of Measure */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Unit of Measure (UOM) <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={formData.uom}
                            onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        >
                            {UOM_OPTIONS.map(uom => (
                                <option key={uom.value} value={uom.value}>{uom.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Item Type Flags */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Item Type Flags
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_batch_tracked}
                                    onChange={(e) => setFormData({ ...formData, is_batch_tracked: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">Batch Tracked</span>
                                    <p className="text-xs text-slate-500">Track inventory by batch numbers</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_serial_tracked}
                                    onChange={(e) => setFormData({ ...formData, is_serial_tracked: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">Serial Tracked</span>
                                    <p className="text-xs text-slate-500">Track individual items by serial numbers</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_expiry_required}
                                    onChange={(e) => setFormData({ ...formData, is_expiry_required: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">Expiry Required</span>
                                    <p className="text-xs text-slate-500">Items have expiration dates</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_asset}
                                    onChange={(e) => setFormData({ ...formData, is_asset: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">Asset</span>
                                    <p className="text-xs text-slate-500">Treat as fixed asset for accounting</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Description <span className="text-slate-500 text-xs">(Optional)</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Add a description for this subcategory..."
                            rows={4}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                        />
                    </div>

                    {/* Is Active Toggle */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="flex items-center justify-between cursor-pointer">
                            <div>
                                <span className="block font-medium text-slate-900">Active Status</span>
                                <span className="text-sm text-slate-500">Enable this subcategory for use in inventory</span>
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
                        href="/org-admin/inventory/subcategories"
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
                        {saving ? 'Saving...' : (subcategoryId ? 'Update Subcategory' : 'Create Subcategory')}
                    </button>
                </div>
            </form>
        </div>
    );
}

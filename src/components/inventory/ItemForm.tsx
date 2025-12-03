"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Save, ArrowLeft, Package, Ruler, Flag, TrendingUp, DollarSign, Image as ImageIcon, Power } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ItemFormProps {
    itemId?: string;
}

interface Category {
    id: number;
    category_name: string;
    category_code: string;
}

interface Subcategory {
    id: number;
    subcategory_name: string;
    subcategory_code: string;
    category_id: number;
    uom: string;
}

interface Vendor {
    id: number;
    vendor_name: string;
}

export default function ItemForm({ itemId }: ItemFormProps) {
    const router = useRouter();
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [formData, setFormData] = useState({
        item_name: '',
        item_code: '',
        category_id: '',
        subcategory_id: '',
        description: '',
        uom: '',
        package_size: '',
        is_asset: false,
        is_batch_tracked: false,
        is_serial_tracked: false,
        is_expiry_tracked: false,
        min_stock: '',
        max_stock: '',
        default_vendor_id: '',
        hsn_code: '',
        is_active: true
    });
    const [loading, setLoading] = useState(!!itemId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
        fetchVendors();
        if (itemId) {
            fetchItem();
        }
    }, [itemId]);

    // Auto-populate UOM when subcategory changes
    useEffect(() => {
        if (formData.subcategory_id && !itemId) {
            const selectedSubcategory = subcategories.find(
                sub => sub.id.toString() === formData.subcategory_id
            );
            if (selectedSubcategory) {
                setFormData(prev => ({ ...prev, uom: selectedSubcategory.uom }));
            }
        }
    }, [formData.subcategory_id, subcategories, itemId]);

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
            const res = await apiClient<{ subcategories: Subcategory[] }>('/inventory/subcategories', {
                method: 'GET',
                withAuth: true,
                params: { active: 'true', pageSize: 200 }
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
                params: { active: 'true', vendor_status: 'approved', pageSize: 100 }
            });
            setVendors(res?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch vendors:", err);
        }
    };

    const fetchItem = async () => {
        try {
            const res = await apiClient<{ item: any }>(`/items/${itemId}`, {
                method: 'GET',
                withAuth: true
            });

            if (res?.item) {
                setFormData({
                    item_name: res.item.item_name || '',
                    item_code: res.item.item_code || '',
                    category_id: res.item.category_id?.toString() || '',
                    subcategory_id: res.item.subcategory_id?.toString() || '',
                    description: res.item.description || '',
                    uom: res.item.uom || '',
                    package_size: res.item.package_size || '',
                    is_asset: Boolean(res.item.is_asset),
                    is_batch_tracked: Boolean(res.item.is_batch_tracked),
                    is_serial_tracked: Boolean(res.item.is_serial_tracked),
                    is_expiry_tracked: Boolean(res.item.is_expiry_tracked),
                    min_stock: res.item.min_stock || '',
                    max_stock: res.item.max_stock || '',
                    default_vendor_id: res.item.default_vendor_id?.toString() || '',
                    hsn_code: res.item.hsn_code || '',
                    is_active: Boolean(res.item.is_active)
                });
            }
        } catch (err) {
            console.error("Failed to fetch item:", err);
            setError("Failed to load item");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const payload = {
                ...formData,
                category_id: parseInt(formData.category_id),
                subcategory_id: parseInt(formData.subcategory_id),
                min_stock: formData.min_stock ? parseFloat(formData.min_stock) : null,
                max_stock: formData.max_stock ? parseFloat(formData.max_stock) : null,
                default_vendor_id: formData.default_vendor_id ? parseInt(formData.default_vendor_id) : null
            };

            if (itemId) {
                await apiClient(`/items/${itemId}`, {
                    method: 'PUT',
                    withAuth: true,
                    body: payload
                });
            } else {
                await apiClient('/items', {
                    method: 'POST',
                    withAuth: true,
                    body: payload
                });
            }

            router.push('/org-admin/inventory/items');
        } catch (err: any) {
            console.error("Failed to save item:", err);
            setError(err?.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    const filteredSubcategories = formData.category_id
        ? subcategories.filter(sub => sub.category_id.toString() === formData.category_id)
        : [];

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6">
            <div className="mb-6">
                <Link
                    href="/org-admin/inventory/items"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Items
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Package className="text-indigo-600" size={28} />
                    {itemId ? 'Edit Item' : 'Create New Item'}
                </h1>
                <p className="text-slate-600 mt-2">
                    {itemId ? 'Update item information' : 'Add a new inventory item'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Basic Information */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Package size={20} className="text-slate-500" />
                            Basic Information
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Item Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.item_name}
                                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                                    placeholder="e.g., OPC 53 Grade Cement Bag"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Item Code (SKU) <span className="text-slate-500 text-xs">(Optional - auto-generated)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.item_code}
                                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value.toUpperCase() })}
                                    placeholder="e.g., CEM-OPC53-BAG"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.category_id}
                                    onChange={(e) => {
                                        setFormData({ ...formData, category_id: e.target.value, subcategory_id: '', uom: '' });
                                    }}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Subcategory <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.subcategory_id}
                                    onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    disabled={!formData.category_id}
                                >
                                    <option value="">Select Subcategory</option>
                                    {filteredSubcategories.map(sub => (
                                        <option key={sub.id} value={sub.id}>{sub.subcategory_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Measurement & Packaging */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Ruler size={20} className="text-slate-500" />
                            Measurement & Packaging
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Unit of Measure (UOM) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.uom}
                                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                                    placeholder="Inherited from subcategory"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <p className="mt-1 text-xs text-slate-500">
                                    Auto-filled from subcategory but can be edited
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Package Size</label>
                                <input
                                    type="text"
                                    value={formData.package_size}
                                    onChange={(e) => setFormData({ ...formData, package_size: e.target.value })}
                                    placeholder="e.g., 50 KG"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Item Behavior Flags */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Flag size={20} className="text-slate-500" />
                            Item Behavior Flags
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.is_asset}
                                    onChange={(e) => setFormData({ ...formData, is_asset: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">🛠 Is Asset?</span>
                                    <p className="text-xs text-slate-500">Fixed asset for accounting</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.is_batch_tracked}
                                    onChange={(e) => setFormData({ ...formData, is_batch_tracked: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">🧪 Is Batch Tracked?</span>
                                    <p className="text-xs text-slate-500">Cement, chemicals, medical supplies</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.is_serial_tracked}
                                    onChange={(e) => setFormData({ ...formData, is_serial_tracked: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">🆔 Is Serial Tracked?</span>
                                    <p className="text-xs text-slate-500">Tools, machines, equipment</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.is_expiry_tracked}
                                    onChange={(e) => setFormData({ ...formData, is_expiry_tracked: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                                />
                                <div>
                                    <span className="font-medium text-slate-900">⏳ Is Expiry Tracked?</span>
                                    <p className="text-xs text-slate-500">Chemicals, medical supplies</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Section 4: Stock Rules */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-slate-500" />
                            Stock Rules
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Stock Level</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={formData.min_stock}
                                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <p className="mt-1 text-xs text-slate-500">Used for low stock alerts</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Maximum Stock Level</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={formData.max_stock}
                                    onChange={(e) => setFormData({ ...formData, max_stock: e.target.value })}
                                    placeholder="0"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                <p className="mt-1 text-xs text-slate-500">Used for auto-restock suggestions</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 5: Vendor & Tax */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <DollarSign size={20} className="text-slate-500" />
                            Vendor & Tax
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Default Vendor</label>
                                <select
                                    value={formData.default_vendor_id}
                                    onChange={(e) => setFormData({ ...formData, default_vendor_id: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">Select Vendor</option>
                                    {vendors.map(vendor => (
                                        <option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>
                                    ))}
                                </select>
                                <p className="mt-1 text-xs text-slate-500">Helps with Purchase module</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">HSN Code</label>
                                <input
                                    type="text"
                                    value={formData.hsn_code}
                                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                                    placeholder="For GST compliance"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    maxLength={20}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 6: Status */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Power size={20} className="text-slate-500" />
                            Status
                        </h2>
                    </div>
                    <div className="p-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                            />
                            <div>
                                <span className="font-medium text-slate-900">Active Item</span>
                                <p className="text-xs text-slate-500">Inactive items cannot be used in new MR/PR/PO</p>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3">
                    <Link
                        href="/org-admin/inventory/items"
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
                        {saving ? 'Saving...' : (itemId ? 'Update Item' : 'Create Item')}
                    </button>
                </div>
            </form>
        </div>
    );
}

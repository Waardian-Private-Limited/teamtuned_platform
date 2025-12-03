"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Save, ArrowLeft, Building, User, FileText, CreditCard, DollarSign, Shield, Paperclip } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

interface VendorFormProps {
    vendorId?: string;
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

const VENDOR_TYPES = [
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'wholesaler', label: 'Wholesaler' },
    { value: 'local_supplier', label: 'Local Supplier' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'transporter', label: 'Transporter' }
];

const PAYMENT_TERMS = [
    { value: '0_days', label: '0 Days (Immediate)' },
    { value: '7_days', label: '7 Days' },
    { value: '30_days', label: '30 Days' },
    { value: '45_days', label: '45 Days' },
    { value: 'custom', label: 'Custom' }
];

const VENDOR_STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'blacklisted', label: 'Blacklisted' },
    { value: 'suspended', label: 'Suspended' }
];

export default function VendorForm({ vendorId }: VendorFormProps) {
    const router = useRouter();
    const pathname = usePathname();
    const isOrgAdmin = pathname?.includes('/org-admin/');
    const [categories, setCategories] = useState<Category[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [formData, setFormData] = useState({
        vendor_name: '',
        vendor_type: 'local_supplier',
        contact_person_name: '',
        mobile: '',
        email: '',
        alternate_contact: '',
        address: '',
        pincode: '',
        gst_number: '',
        pan_number: '',
        cin: '',
        bank_name: '',
        account_number: '',
        ifsc_code: '',
        payment_terms: '30_days',
        credit_limit: '',
        delivery_lead_time: '',
        vendor_status: 'pending',
        category_ids: [] as number[],
        subcategory_ids: [] as number[],
        is_active: true
    });
    const [loading, setLoading] = useState(!!vendorId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
        if (vendorId) {
            fetchVendor();
        }
    }, [vendorId]);

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

    const fetchVendor = async () => {
        try {
            const res = await apiClient<{ vendor: any }>(`/vendors/${vendorId}`, {
                method: 'GET',
                withAuth: true
            });

            if (res?.vendor) {
                setFormData({
                    vendor_name: res.vendor.vendor_name || '',
                    vendor_type: res.vendor.vendor_type || 'local_supplier',
                    contact_person_name: res.vendor.contact_person_name || '',
                    mobile: res.vendor.mobile || '',
                    email: res.vendor.email || '',
                    alternate_contact: res.vendor.alternate_contact || '',
                    address: res.vendor.address || '',
                    pincode: res.vendor.pincode || '',
                    gst_number: res.vendor.gst_number || '',
                    pan_number: res.vendor.pan_number || '',
                    cin: res.vendor.cin || '',
                    bank_name: res.vendor.bank_name || '',
                    account_number: res.vendor.account_number || '',
                    ifsc_code: res.vendor.ifsc_code || '',
                    payment_terms: res.vendor.payment_terms || '30_days',
                    credit_limit: res.vendor.credit_limit || '',
                    delivery_lead_time: res.vendor.delivery_lead_time || '',
                    vendor_status: res.vendor.vendor_status || 'pending',
                    category_ids: res.vendor.categories?.map((c: any) => c.id) || [],
                    subcategory_ids: res.vendor.subcategories?.map((s: any) => s.id) || [],
                    is_active: Boolean(res.vendor.is_active)
                });
            }
        } catch (err) {
            console.error("Failed to fetch vendor:", err);
            setError("Failed to load vendor");
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
                credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
                delivery_lead_time: formData.delivery_lead_time ? parseInt(formData.delivery_lead_time) : null
            };

            if (vendorId) {
                await apiClient(`/vendors/${vendorId}`, {
                    method: 'PUT',
                    withAuth: true,
                    body: payload
                });
            } else {
                await apiClient('/vendors', {
                    method: 'POST',
                    withAuth: true,
                    body: payload
                });
            }

            router.push('/org-admin/inventory/vendors');
        } catch (err: any) {
            console.error("Failed to save vendor:", err);
            setError(err?.message || 'Failed to save vendor');
        } finally {
            setSaving(false);
        }
    };

    const handleCategoryToggle = (categoryId: number) => {
        setFormData(prev => ({
            ...prev,
            category_ids: prev.category_ids.includes(categoryId)
                ? prev.category_ids.filter(id => id !== categoryId)
                : [...prev.category_ids, categoryId]
        }));
    };

    const handleSubcategoryToggle = (subcategoryId: number) => {
        setFormData(prev => ({
            ...prev,
            subcategory_ids: prev.subcategory_ids.includes(subcategoryId)
                ? prev.subcategory_ids.filter(id => id !== subcategoryId)
                : [...prev.subcategory_ids, subcategoryId]
        }));
    };

    const filteredSubcategories = subcategories.filter(sub =>
        formData.category_ids.includes(sub.category_id)
    );

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
                    href="/org-admin/inventory/vendors"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Vendors
                </Link>
            </div>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Building className="text-indigo-600" size={28} />
                    {vendorId ? 'Edit Vendor' : 'Create New Vendor'}
                </h1>
                <p className="text-slate-600 mt-2">
                    {vendorId ? 'Update vendor information' : 'Add a new vendor to your system'}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Basic Details */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Building size={20} className="text-slate-500" />
                            Basic Details
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Vendor Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.vendor_name}
                                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Vendor Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.vendor_type}
                                    onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {VENDOR_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Categories Supplied
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                                {categories.map(cat => (
                                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.category_ids.includes(cat.id)}
                                            onChange={() => handleCategoryToggle(cat.id)}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-700">{cat.category_name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {filteredSubcategories.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Subcategories (Optional)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                                    {filteredSubcategories.map(sub => (
                                        <label key={sub.id} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.subcategory_ids.includes(sub.id)}
                                                onChange={() => handleSubcategoryToggle(sub.id)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-700">{sub.subcategory_name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section 2: Contact Details */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <User size={20} className="text-slate-500" />
                            Contact Details
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person Name</label>
                                <input
                                    type="text"
                                    value={formData.contact_person_name}
                                    onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Mobile</label>
                                <input
                                    type="tel"
                                    value={formData.mobile}
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Alternate Contact</label>
                                <input
                                    type="tel"
                                    value={formData.alternate_contact}
                                    onChange={(e) => setFormData({ ...formData, alternate_contact: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                            />
                        </div>
                        <div className="w-full md:w-1/2">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Pin Code</label>
                            <input
                                type="text"
                                value={formData.pincode}
                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Legal / Tax */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <FileText size={20} className="text-slate-500" />
                            Legal / Tax Information <span className="text-sm font-normal text-slate-500">(Optional)</span>
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">GST Number</label>
                                <input
                                    type="text"
                                    value={formData.gst_number}
                                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                    maxLength={15}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">PAN Number</label>
                                <input
                                    type="text"
                                    value={formData.pan_number}
                                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">CIN (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.cin}
                                    onChange={(e) => setFormData({ ...formData, cin: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 4: Banking Details */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <CreditCard size={20} className="text-slate-500" />
                            Banking Details <span className="text-sm font-normal text-slate-500">(Optional)</span>
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    value={formData.bank_name}
                                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    value={formData.account_number}
                                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">IFSC Code</label>
                                <input
                                    type="text"
                                    value={formData.ifsc_code}
                                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
                                    maxLength={11}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 5: Payment & Terms */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <DollarSign size={20} className="text-slate-500" />
                            Payment & Terms
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms</label>
                                <select
                                    value={formData.payment_terms}
                                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {PAYMENT_TERMS.map(term => (
                                        <option key={term.value} value={term.value}>{term.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Credit Limit (Optional)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.credit_limit}
                                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Lead Time (days)</label>
                                <input
                                    type="number"
                                    value={formData.delivery_lead_time}
                                    onChange={(e) => setFormData({ ...formData, delivery_lead_time: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 6: Vendor Authorization - Only for Org Admins */}
                {isOrgAdmin && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Shield size={20} className="text-slate-500" />
                                Vendor Authorization
                            </h2>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Vendor Status</label>
                                    <select
                                        value={formData.vendor_status}
                                        onChange={(e) => setFormData({ ...formData, vendor_status: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        {VENDOR_STATUSES.map(status => (
                                            <option key={status.value} value={status.value}>{status.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-5 w-5"
                                        />
                                        <div>
                                            <span className="font-medium text-slate-900">Active Vendor</span>
                                            <p className="text-xs text-slate-500">Enable this vendor for transactions</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3">
                    <Link
                        href="/org-admin/inventory/vendors"
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
                        {saving ? 'Saving...' : (vendorId ? 'Update Vendor' : 'Create Vendor')}
                    </button>
                </div>
            </form>
        </div>
    );
}

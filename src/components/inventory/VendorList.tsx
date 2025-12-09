"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Plus, Search, Filter, Edit2, Trash2, Building, CheckCircle, XCircle, Clock, Ban } from "lucide-react";
import Link from "next/link";

interface Vendor {
    id: number;
    vendor_name: string;
    vendor_type: string;
    contact_person_name?: string;
    mobile?: string;
    email?: string;
    vendor_status: string;
    is_active: boolean;
    categories?: Array<{ id: number; category_name: string }>;
}

interface Category {
    id: number;
    category_name: string;
}

const VENDOR_TYPES = [
    { value: 'manufacturer', label: 'Manufacturer' },
    { value: 'wholesaler', label: 'Wholesaler' },
    { value: 'local_supplier', label: 'Local Supplier' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'transporter', label: 'Transporter' }
];

const VENDOR_STATUSES = [
    { value: 'pending', label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-700' },
    { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
    { value: 'blacklisted', label: 'Blacklisted', icon: Ban, color: 'bg-red-100 text-red-700' },
    { value: 'suspended', label: 'Suspended', icon: XCircle, color: 'bg-orange-100 text-orange-700' }
];

export default function VendorList() {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [activeFilter, setActiveFilter] = useState("true");
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchVendors();
    }, [search, typeFilter, statusFilter, categoryFilter, activeFilter]);

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

    const fetchVendors = async () => {
        try {
            const params: any = {};
            if (search) params.search = search;
            if (typeFilter) params.vendor_type = typeFilter;
            if (statusFilter) params.vendor_status = statusFilter;
            if (categoryFilter) params.category_id = categoryFilter.toString();
            if (activeFilter) params.active = activeFilter;

            const res = await apiClient<{ vendors: Vendor[] }>('/vendors', {
                method: 'GET',
                withAuth: true,
                params
            });
            setVendors(res?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch vendors:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to deactivate this vendor?')) return;

        try {
            await apiClient(`/vendors/${id}`, {
                method: 'DELETE',
                withAuth: true
            });
            fetchVendors();
        } catch (err) {
            console.error("Failed to delete vendor:", err);
            alert('Failed to delete vendor');
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = VENDOR_STATUSES.find(s => s.value === status);
        if (!statusConfig) return null;

        const Icon = statusConfig.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                <Icon size={14} />
                {statusConfig.label}
            </span>
        );
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
                        <Building className="text-indigo-600" size={28} />
                        Vendor Management
                    </h1>
                    <p className="text-slate-600 mt-2">Manage your vendors and suppliers.</p>
                </div>
                <Link
                    href="/org-admin/inventory/vendors/new"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Add Vendor
                </Link>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 bg-white rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search vendors..."
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
                    <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Vendor Type</label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">All Types</option>
                                {VENDOR_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">All Statuses</option>
                                {VENDOR_STATUSES.map(status => (
                                    <option key={status.value} value={status.value}>{status.label}</option>
                                ))}
                            </select>
                        </div>
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">Active Status</label>
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

            {/* Vendors Table */}
            {vendors.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
                    <Building className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600">No vendors found. Create your first vendor to get started.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categories</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {vendors.map((vendor) => (
                                <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-slate-900">{vendor.vendor_name}</div>
                                            {vendor.contact_person_name && (
                                                <div className="text-sm text-slate-500">{vendor.contact_person_name}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-slate-700 capitalize">{vendor.vendor_type.replace('_', ' ')}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            {vendor.mobile && <div className="text-slate-700">{vendor.mobile}</div>}
                                            {vendor.email && <div className="text-slate-500">{vendor.email}</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {vendor.categories?.slice(0, 2).map(cat => (
                                                <span key={cat.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                    {cat.category_name}
                                                </span>
                                            ))}
                                            {vendor.categories && vendor.categories.length > 2 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                                    +{vendor.categories.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(vendor.vendor_status)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                href={`/org-admin/inventory/vendors/${vendor.id}`}
                                                className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(vendor.id)}
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

"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { Building2, Search, Plus, Edit, Eye, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/context/AuthContext";
type Provider = {
    id: number;
    name: string;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    is_active: boolean;
    policies_count?: number;
};

export default function ProviderList() {
    const { role, employee, permissions } = useAuth();
    const [providers, setProviders] = useState<Provider[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [showActive, setShowActive] = useState(true);

    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const basePath = isOrgAdmin ? "/org-admin" : "/employee";



    useEffect(() => {
        (async () => {
            try {
                // Session fetch removed (using useAuth)
                const session = { authenticated: true, role: role, employee: { permissions } };
                if (session?.authenticated) {
                    // setRole(session.role || null);
                }
            } catch { }
        })();
    }, []);

    useEffect(() => {
        fetchProviders();
    }, [search, showActive]);

    const fetchProviders = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (search) params.search = search;
            if (showActive) params.is_active = "true";

            const res = await apiClient<{ providers: Provider[] }>("/insurance/providers", { withAuth: true, params });
            setProviders(res.providers || []);
        } catch (error) {
            console.error("Failed to fetch providers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this provider?")) return;

        try {
            await apiClient(`/insurance/providers/${id}`, { method: "DELETE", withAuth: true });
            fetchProviders();
        } catch (error: any) {
            alert(error.message || "Failed to delete provider");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Building2 className="w-8 h-8 text-blue-600" />
                            Insurance Providers
                        </h1>
                        <p className="text-gray-600 mt-2">Manage insurance provider companies</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchProviders}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <Link
                            href={`${basePath}/insurance/providers/new`}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Provider
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, email, or phone..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showActive}
                                    onChange={(e) => setShowActive(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Show active only</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Providers Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact Person</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                                        </td>
                                    </tr>
                                ) : providers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center">
                                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500">No providers found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    providers.map((provider) => (
                                        <tr key={provider.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.contact_person || "-"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.email || "-"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{provider.phone || "-"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${provider.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                                        }`}
                                                >
                                                    {provider.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`${basePath}/insurance/providers/${provider.id}`}
                                                        className="text-blue-600 hover:text-blue-700"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={`${basePath}/insurance/providers/${provider.id}/edit`}
                                                        className="text-green-600 hover:text-green-700"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(provider.id)}
                                                        className="text-red-600 hover:text-red-700"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

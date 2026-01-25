"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Building2, MapPin, Plus, Search, Edit2, Trash2, X, Check, Link as LinkIcon } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Site {
    id: number;
    name: string;
}

interface SubOrganization {
    id: number;
    name: string;
    code: string;
    logo_url: string | null;
}

interface Features {
    petty_cash: boolean;
    task: boolean;
    payroll: boolean;
    labors: boolean;
}

interface Mapping {
    id: number;
    site_id: number;
    sub_org_id: number;
    features: Features;
    site_name: string;
    sub_org_name: string;
    sub_org_code: string;
    sub_org_logo: string | null;
    created_at: string;
}

export default function SiteSubOrgMapper() {
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [subOrgs, setSubOrgs] = useState<SubOrganization[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        site_id: "",
        sub_org_id: "",
        features: {
            petty_cash: false,
            task: false,
            payroll: false,
            labors: false,
        },
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [mappingsRes, sitesRes, subOrgsRes] = await Promise.all([
                apiClient<any>("/site-sub-org-mapper", { method: "GET", withAuth: true }),
                apiClient<any>("/sites?pageSize=1000", { method: "GET", withAuth: true }),
                apiClient<any>("/sub-organizations?pageSize=1000&status=active", { method: "GET", withAuth: true }),
            ]);

            setMappings(mappingsRes.mappings || []);
            setSites(sitesRes.sites || []);
            setSubOrgs(subOrgsRes.sub_organizations || []);
        } catch (error: any) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.site_id) {
            newErrors.site_id = "Site is required";
        }

        if (!formData.sub_org_id) {
            newErrors.sub_org_id = "Sub-organization is required";
        }

        const hasFeature = Object.values(formData.features).some((v) => v === true);
        if (!hasFeature) {
            newErrors.features = "At least one feature must be selected";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            const payload = {
                site_id: parseInt(formData.site_id),
                sub_org_id: parseInt(formData.sub_org_id),
                features: formData.features,
            };

            if (editingId) {
                await apiClient(`/site-sub-org-mapper/${editingId}`, {
                    method: "PUT",
                    body: { features: formData.features },
                    withAuth: true,
                });
            } else {
                await apiClient("/site-sub-org-mapper", {
                    method: "POST",
                    body: payload,
                    withAuth: true,
                });
            }

            closeModal();
            fetchData();
        } catch (error: any) {
            setErrors({ submit: error.message || "Failed to save mapping" });
        }
    };

    const handleEdit = (mapping: Mapping) => {
        setEditingId(mapping.id);
        setFormData({
            site_id: mapping.site_id.toString(),
            sub_org_id: mapping.sub_org_id.toString(),
            features: mapping.features,
        });
        setModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        try {
            await apiClient(`/site-sub-org-mapper/${id}`, {
                method: "DELETE",
                withAuth: true,
            });
            setDeleteConfirmId(null);
            fetchData();
        } catch (error: any) {
            console.error("Failed to delete:", error);
        }
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingId(null);
        setFormData({
            site_id: "",
            sub_org_id: "",
            features: { petty_cash: false, task: false, payroll: false, labors: false },
        });
        setErrors({});
    };

    const toggleFeature = (feature: keyof Features) => {
        setFormData({
            ...formData,
            features: {
                ...formData.features,
                [feature]: !formData.features[feature],
            },
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <LinkIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Site-Sub-Organization Mapper</h1>
                        <p className="text-sm text-gray-500">Map sites to sub-organizations with feature selection</p>
                    </div>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Create Mapping
                </button>
            </div>

            {/* Mappings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">Loading...</div>
                ) : mappings.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No mappings found. Create your first mapping to get started.
                    </div>
                ) : (
                    mappings.map((mapping) => (
                        <div
                            key={mapping.id}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                        >
                            {/* Header with Logo */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {mapping.sub_org_logo ? (
                                            <Image
                                                src={mapping.sub_org_logo}
                                                alt={mapping.sub_org_name}
                                                width={48}
                                                height={48}
                                                className="object-contain"
                                            />
                                        ) : (
                                            <Building2 className="w-6 h-6 text-gray-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{mapping.sub_org_name}</h3>
                                        <code className="text-xs text-gray-500">{mapping.sub_org_code}</code>
                                    </div>
                                </div>
                            </div>

                            {/* Site Info */}
                            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">{mapping.site_name}</span>
                            </div>

                            {/* Features */}
                            <div className="mb-4">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Active Features</p>
                                <div className="flex flex-wrap gap-2">
                                    {mapping.features.petty_cash && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            Petty Cash
                                        </span>
                                    )}
                                    {mapping.features.task && (
                                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            Task
                                        </span>
                                    )}
                                    {mapping.features.payroll && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                            Payroll
                                        </span>
                                    )}
                                    {mapping.features.labors && (
                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                            Labors
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                                <button
                                    onClick={() => handleEdit(mapping)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => setDeleteConfirmId(mapping.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">
                                {editingId ? "Edit Mapping" : "Create Mapping"}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {errors.submit && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                    {errors.submit}
                                </div>
                            )}

                            {/* Site Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Site <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.site_id}
                                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                                    disabled={!!editingId}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.site_id ? "border-red-500" : "border-gray-300"
                                        }`}
                                >
                                    <option value="">Select a site</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.site_id && <div className="text-sm text-red-600 mt-1">{errors.site_id}</div>}
                            </div>

                            {/* Sub-Organization Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sub-Organization <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.sub_org_id}
                                    onChange={(e) => setFormData({ ...formData, sub_org_id: e.target.value })}
                                    disabled={!!editingId}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${errors.sub_org_id ? "border-red-500" : "border-gray-300"
                                        }`}
                                >
                                    <option value="">Select a sub-organization</option>
                                    {subOrgs.map((subOrg) => (
                                        <option key={subOrg.id} value={subOrg.id}>
                                            {subOrg.name} ({subOrg.code})
                                        </option>
                                    ))}
                                </select>
                                {errors.sub_org_id && (
                                    <div className="text-sm text-red-600 mt-1">{errors.sub_org_id}</div>
                                )}
                            </div>

                            {/* Feature Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Features <span className="text-red-500">*</span>
                                </label>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.features.petty_cash}
                                            onChange={() => toggleFeature("petty_cash")}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Petty Cash</div>
                                            <div className="text-xs text-gray-500">Enable petty cash management</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.features.task}
                                            onChange={() => toggleFeature("task")}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Task Management</div>
                                            <div className="text-xs text-gray-500">Enable task tracking and assignment</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.features.payroll}
                                            onChange={() => toggleFeature("payroll")}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Payroll</div>
                                            <div className="text-xs text-gray-500">Enable payroll processing</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={formData.features.labors}
                                            onChange={() => toggleFeature("labors")}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">Labors</div>
                                            <div className="text-xs text-gray-500">Enable labor management</div>
                                        </div>
                                    </label>
                                </div>
                                {errors.features && (
                                    <div className="text-sm text-red-600 mt-2">{errors.features}</div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    {editingId ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete this mapping? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

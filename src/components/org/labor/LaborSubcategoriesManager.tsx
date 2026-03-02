"use client";

import React from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    RefreshCw,
    X,
    Layers,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function LaborSubcategoriesManager() {
    const { role, permissions } = useAuth();
    const [categories, setCategories] = React.useState<any[]>([]);
    const [subcategories, setSubcategories] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [searchTerm, setSearchTerm] = React.useState("");
    const [categoryFilter, setCategoryFilter] = React.useState("");

    // Modals
    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [selectedSubcategory, setSelectedSubcategory] = React.useState<any>(null);

    // Form
    const [form, setForm] = React.useState({
        category_id: "",
        name: "",
        description: "",
    });
    const [saving, setSaving] = React.useState(false);

    const hasPerm = (code: string) =>
        (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

    const fetchCategories = async () => {
        try {
            const data = await apiClient<{ success: boolean; categories: any[] }>(
                "/labor/categories",
                { method: "GET" }
            );
            setCategories(data.categories || []);
        } catch (e: any) {
            console.error("Failed to load categories:", e);
        }
    };

    const fetchAllSubcategories = async () => {
        setLoading(true);
        setError("");
        try {
            // Fetch all categories first
            await fetchCategories();

            // Fetch subcategories for all categories
            const allSubs: any[] = [];
            const categoriesData = await apiClient<{ success: boolean; categories: any[] }>(
                "/labor/categories",
                { method: "GET" }
            );

            for (const cat of categoriesData.categories || []) {
                const data = await apiClient<{ success: boolean; subcategories: any[] }>(
                    `/labor/categories/${cat.id}/subcategories`,
                    { method: "GET" }
                );
                allSubs.push(...(data.subcategories || []));
            }

            setSubcategories(allSubs);
        } catch (e: any) {
            setError(e?.message || "Failed to load subcategories");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchAllSubcategories();
    }, []);

    const handleCreate = async () => {
        if (!form.category_id || !form.name.trim()) {
            setError("Category and name are required");
            return;
        }

        setSaving(true);
        setError("");
        try {
            await apiClient("/labor/subcategories", {
                method: "POST",
                body: {
                    category_id: parseInt(form.category_id),
                    name: form.name.trim(),
                    description: form.description.trim(),
                },
            });
            setShowCreateModal(false);
            setForm({ category_id: "", name: "", description: "" });
            fetchAllSubcategories();
        } catch (e: any) {
            setError(e?.message || "Failed to create subcategory");
        } finally {
            setSaving(false);
        }
    };

    const filteredSubcategories = subcategories.filter((sub) => {
        const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sub.category_name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || sub.category_id === parseInt(categoryFilter);
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Labor Subcategories</h1>
                        <p className="text-gray-600 mt-1">Manage labor subcategories</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Labor Subcategories</h1>
                    <p className="text-gray-600 mt-1">Manage labor subcategories</p>
                </div>
                {(role !== "Employee" || hasPerm("LABOR_CAT_ADD")) && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Subcategory</span>
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search subcategories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Subcategories List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subcategory Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Laborers
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredSubcategories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        <Layers className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p>No subcategories found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSubcategories.map((sub) => (
                                    <tr key={sub.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{sub.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                {sub.category_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {sub.description || "—"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {sub.laborer_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {(role !== "Employee" || hasPerm("LABOR_CAT_EDIT")) && (
                                                    <button
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                )}
                                                {(role !== "Employee" || hasPerm("LABOR_CAT_DELETE")) && (
                                                    <button
                                                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Add New Subcategory</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category *
                                </label>
                                <select
                                    value={form.category_id}
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                >
                                    <option value="">Select Category</option>
                                    {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subcategory Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Brick Mason, Stone Mason"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Optional description"
                                />
                            </div>
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!form.category_id || !form.name.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${form.category_id && form.name.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Creating..." : "Create Subcategory"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

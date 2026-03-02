"use client";

import React from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    RefreshCw,
    X,
    LayoutGrid,
    List,
    ChevronRight,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

export default function LaborCategoriesManager() {
    const { role, permissions } = useAuth();
    const [categories, setCategories] = React.useState<any[]>([]);
    const [subcategories, setSubcategories] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [searchTerm, setSearchTerm] = React.useState("");

    // Modals
    const [showCreateModal, setShowCreateModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [showSubcategoriesModal, setShowSubcategoriesModal] = React.useState(false);
    const [showCreateSubModal, setShowCreateSubModal] = React.useState(false);
    const [selectedCategory, setSelectedCategory] = React.useState<any>(null);
    const [selectedSubcategory, setSelectedSubcategory] = React.useState<any>(null);

    // Form
    const [form, setForm] = React.useState({
        name: "",
        description: "",
    });
    const [subForm, setSubForm] = React.useState({
        name: "",
        description: "",
    });
    const [saving, setSaving] = React.useState(false);

    const hasPerm = (code: string) =>
        (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

    const fetchCategories = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await apiClient<{ success: boolean; categories: any[] }>(
                "/labor/categories",
                { method: "GET" }
            );
            setCategories(data.categories || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load categories");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubcategories = async (categoryId: number) => {
        try {
            const data = await apiClient<{ success: boolean; subcategories: any[] }>(
                `/labor/categories/${categoryId}/subcategories`,
                { method: "GET" }
            );
            setSubcategories(data.subcategories || []);
        } catch (e: any) {
            setError(e?.message || "Failed to load subcategories");
        }
    };

    React.useEffect(() => {
        fetchCategories();
    }, []);

    const handleCreate = async () => {
        if (!form.name.trim()) return;

        setSaving(true);
        setError("");
        try {
            await apiClient("/labor/categories", {
                method: "POST",
                body: { name: form.name.trim(), description: form.description.trim() },
            });
            setShowCreateModal(false);
            setForm({ name: "", description: "" });
            fetchCategories();
        } catch (e: any) {
            setError(e?.message || "Failed to create category");
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        if (!selectedCategory || !form.name.trim()) return;

        setSaving(true);
        setError("");
        try {
            await apiClient(`/labor/categories/${selectedCategory.id}`, {
                method: "PUT",
                body: { name: form.name.trim(), description: form.description.trim() },
            });
            setShowEditModal(false);
            setSelectedCategory(null);
            setForm({ name: "", description: "" });
            fetchCategories();
        } catch (e: any) {
            setError(e?.message || "Failed to update category");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            await apiClient(`/labor/categories/${id}`, { method: "DELETE" });
            fetchCategories();
        } catch (e: any) {
            setError(e?.message || "Failed to delete category");
        }
    };

    const handleCreateSubcategory = async () => {
        if (!selectedCategory || !subForm.name.trim()) return;

        setSaving(true);
        setError("");
        try {
            await apiClient("/labor/subcategories", {
                method: "POST",
                body: {
                    category_id: selectedCategory.id,
                    name: subForm.name.trim(),
                    description: subForm.description.trim(),
                },
            });
            setShowCreateSubModal(false);
            setSubForm({ name: "", description: "" });
            fetchSubcategories(selectedCategory.id);
            fetchCategories(); // Refresh to update counts
        } catch (e: any) {
            setError(e?.message || "Failed to create subcategory");
        } finally {
            setSaving(false);
        }
    };

    const openEdit = (category: any) => {
        setSelectedCategory(category);
        setForm({ name: category.name, description: category.description || "" });
        setShowEditModal(true);
    };

    const openSubcategories = async (category: any) => {
        setSelectedCategory(category);
        setShowSubcategoriesModal(true);
        await fetchSubcategories(category.id);
    };

    const filteredCategories = categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Labor Categories</h1>
                        <p className="text-gray-600 mt-1">Manage labor categories and subcategories</p>
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
                    <h1 className="text-2xl font-bold text-gray-900">Labor Categories</h1>
                    <p className="text-gray-600 mt-1">Manage labor categories and subcategories</p>
                </div>
                {(role !== "Employee" || hasPerm("LABOR_CAT_ADD")) && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Category</span>
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Category Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Subcategories
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
                            {filteredCategories.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        <LayoutGrid className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                        <p>No categories found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCategories.map((category) => (
                                    <tr key={category.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{category.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600">
                                                {category.description || "—"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => openSubcategories(category)}
                                                className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                            >
                                                <span>{category.subcategory_count || 0}</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {category.laborer_count || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                {(role !== "Employee" || hasPerm("LABOR_CAT_EDIT")) && (
                                                    <button
                                                        onClick={() => openEdit(category)}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                )}
                                                {(role !== "Employee" || hasPerm("LABOR_CAT_DELETE")) && (
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
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

            {/* Create Category Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Add New Category</h3>
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
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Mason, Carpenter, Electrician"
                                    autoFocus
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
                                disabled={!form.name.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${form.name.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Creating..." : "Create Category"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Category Modal */}
            {showEditModal && selectedCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Edit Category</h3>
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category Name *
                                </label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={!form.name.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${form.name.trim() && !saving
                                    ? "bg-blue-600 text-white hover:bg-blue-700"
                                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                                    }`}
                            >
                                {saving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subcategories Modal */}
            {showSubcategoriesModal && selectedCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Subcategories</h3>
                                    <p className="text-sm text-gray-600 mt-1">{selectedCategory.name}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {(role !== "Employee" || hasPerm("LABOR_CAT_ADD")) && (
                                        <button
                                            onClick={() => setShowCreateSubModal(true)}
                                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>Add Subcategory</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowSubcategoriesModal(false)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {subcategories.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <List className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                                    <p>No subcategories found</p>
                                    <p className="text-sm mt-1">Click "Add Subcategory" to create one</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {subcategories.map((sub) => (
                                        <div key={sub.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{sub.name}</h4>
                                                    {sub.description && (
                                                        <p className="text-sm text-gray-600 mt-1">{sub.description}</p>
                                                    )}
                                                    <div className="flex items-center space-x-4 mt-2">
                                                        <span className="text-xs text-gray-500">
                                                            Laborers: {sub.laborer_count || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Subcategory Modal */}
            {showCreateSubModal && selectedCategory && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">Add Subcategory</h3>
                                    <p className="text-sm text-gray-600 mt-1">to {selectedCategory.name}</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateSubModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subcategory Name *
                                </label>
                                <input
                                    type="text"
                                    value={subForm.name}
                                    onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Brick Mason, Stone Mason"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    value={subForm.description}
                                    onChange={(e) => setSubForm({ ...subForm, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateSubModal(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateSubcategory}
                                disabled={!subForm.name.trim() || saving}
                                className={`px-4 py-2 rounded-lg transition-colors ${subForm.name.trim() && !saving
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

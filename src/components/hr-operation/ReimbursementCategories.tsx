"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    Plus, Search, RefreshCw, Edit2, Trash2, X, Tag, FileText, ChevronLeft, ChevronRight
} from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { Toaster } from "react-hot-toast";

interface Category {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
}

export default function ReimbursementCategories() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: "", description: "" });
    const [submitting, setSubmitting] = useState(false);

    // Delete confirmation
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient("/reimbursements/categories", { method: "GET", withAuth: true }) as any;
            if (res?.success) {
                setCategories(res.data || []);
            }
        } catch (e: any) {
            showError(e.message || "Failed to load categories");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleOpenModal = (cat: Category | null = null) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({ name: cat.name, description: cat.description || "" });
        } else {
            setEditingCategory(null);
            setFormData({ name: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return showError("Category name is required");

        setSubmitting(true);
        try {
            const method = editingCategory ? "PUT" : "POST";
            const url = editingCategory
                ? `/reimbursements/categories/${editingCategory.id}`
                : "/reimbursements/categories";

            const res = await apiClient(url, { method, body: formData, withAuth: true }) as any;
            if (res?.success) {
                showSuccess(editingCategory ? "Category updated" : "Category created");
                setIsModalOpen(false);
                fetchCategories();
            }
        } catch (e: any) {
            showError(e.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const res = await apiClient(`/reimbursements/categories/${id}`, { method: "DELETE", withAuth: true }) as any;
            if (res?.success) {
                showSuccess("Category deleted");
                setDeleteConfirm(null);
                fetchCategories();
            }
        } catch (e: any) {
            showError(e.message || "Failed to delete");
        }
    };

    const filteredCategories = categories.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || "").toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen">
            <Toaster position="top-right" />
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Reimbursement Categories
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Manage expense categories for employee reimbursements
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchCategories()}
                            disabled={loading}
                            className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Category
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-sm">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search categories..."
                                className="bg-transparent text-sm text-gray-700 outline-none w-full"
                            />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            {filteredCategories.length} Categories
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <th className="px-6 py-4 text-left">Category Name</th>
                                    <th className="px-6 py-4 text-left">Description</th>
                                    <th className="px-6 py-4 text-left">Created At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredCategories.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-40">
                                                <Tag className="w-10 h-10" />
                                                <p className="font-medium text-gray-500 text-base">No categories found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredCategories.map(cat => (
                                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-black group-hover:text-white transition-colors font-bold text-xs">
                                                    {cat.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-gray-900">{cat.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                            {cat.description || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">
                                            {new Date(cat.created_at).toLocaleDateString("en-IN", {
                                                day: "2-digit", month: "short", year: "numeric"
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(cat)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(cat.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h2 className="text-base font-black text-gray-900 uppercase tracking-wide">
                                {editingCategory ? "Edit Category" : "Add New Category"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                    Category Name *
                                </label>
                                <input
                                    ref={el => { if (el && !editingCategory) el.focus(); }}
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors"
                                    placeholder="e.g. Travel, Office Supplies"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors resize-none"
                                    placeholder="Brief description of when to use this category..."
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? "Saving..." : (editingCategory ? "Update Category" : "Create Category")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Category?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            This action cannot be undone. Any reimbursements with this category will still exist but the category name will be unlinked.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md shadow-red-200"
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

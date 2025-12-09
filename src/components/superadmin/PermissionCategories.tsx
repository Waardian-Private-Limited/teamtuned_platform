"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type Feature = {
    id: number;
    name: string;
    code: string;
};

type PermissionCategory = {
    id?: number;
    feature_id?: number | null;
    feature_name?: string;
    code: string;
    name: string;
    sort_order?: number;
    status?: "active" | "inactive";
};

export default function PermissionCategories() {
    const [categories, setCategories] = React.useState<PermissionCategory[]>([]);
    const [features, setFeatures] = React.useState<Feature[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [showModal, setShowModal] = React.useState(false);
    const [editing, setEditing] = React.useState<PermissionCategory | null>(null);
    const [form, setForm] = React.useState<PermissionCategory>({
        code: "",
        name: "",
        feature_id: undefined,
        sort_order: 0,
        status: "active",
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [cats, feats] = await Promise.all([
                apiClient<PermissionCategory[]>("/superadmin/permission-categories", { method: "GET" }),
                apiClient<Feature[]>("/superadmin/features", { method: "GET" }),
            ]);
            setCategories(Array.isArray(cats) ? cats : []);
            setFeatures(Array.isArray(feats) ? feats : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({
            code: "",
            name: "",
            feature_id: undefined,
            sort_order: 0,
            status: "active",
        });
        setShowModal(true);
    };

    const openEdit = (c: PermissionCategory) => {
        setEditing(c);
        setForm({ ...c });
        setShowModal(true);
    };

    const saveCategory = async () => {
        try {
            if (editing) {
                await apiClient(`/superadmin/permission-categories/${editing.id}`, {
                    method: "PUT",
                    body: form,
                });
            } else {
                await apiClient("/superadmin/permission-categories", { method: "POST", body: form });
            }
            setShowModal(false);
            fetchData();
        } catch (e: any) {
            alert(e?.message || "Save failed");
        }
    };

    const deleteCategory = async (c: PermissionCategory) => {
        if (!confirm(`Delete category ${c.name}?`)) return;
        try {
            await apiClient(`/superadmin/permission-categories/${c.id}`, { method: "DELETE" });
            fetchData();
        } catch (e: any) {
            alert(e?.message || "Delete failed");
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-black">Feature Categories</h1>
                <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={openCreate}>Add Category</button>
            </div>
            <p className="mt-2 text-black">Manage permission categories linked to features.</p>

            {loading && <div className="mt-4 text-black">Loading...</div>}
            {error && <div className="mt-4 text-red-600">{error}</div>}

            <div className="mt-4 overflow-auto border rounded">
                <table className="min-w-full text-left text-black">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">Code</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Feature</th>
                            <th className="px-3 py-2">Sort Order</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((c) => (
                            <tr key={c.id} className="border-t">
                                <td className="px-3 py-2">{c.id}</td>
                                <td className="px-3 py-2">{c.code}</td>
                                <td className="px-3 py-2">{c.name}</td>
                                <td className="px-3 py-2">{c.feature_name || "-"}</td>
                                <td className="px-3 py-2">{c.sort_order}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-1 text-xs rounded ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {c.status || 'active'}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 rounded border text-black hover:bg-gray-100" onClick={() => openEdit(c)}>Edit</button>
                                        <button className="px-3 py-1 rounded border text-black hover:bg-gray-100" onClick={() => deleteCategory(c)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-3 py-4 text-center">No categories found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
                    <div className="relative mx-auto mt-24 w-[95%] max-w-lg rounded bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b p-4">
                            <h2 className="text-lg font-semibold text-black">{editing ? "Edit Category" : "Add Category"}</h2>
                            <button className="text-black hover:opacity-80" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-black">Feature</label>
                                <select
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.feature_id ?? ""}
                                    onChange={(e) => setForm({ ...form, feature_id: e.target.value ? Number(e.target.value) : undefined })}
                                >
                                    <option value="">-- Select Feature --</option>
                                    {features.map(f => (
                                        <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-black">Code</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    placeholder="CATEGORY_CODE"
                                    disabled={!!editing}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-black">Name</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Category Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-black">Sort Order</label>
                                <input
                                    type="number"
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.sort_order ?? 0}
                                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-black">Status</label>
                                <select
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.status || 'active'}
                                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 flex items-center justify-end gap-2 border-t">
                            <button className="px-4 py-2 rounded border text-black" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={saveCategory}>{editing ? "Save" : "Add"}</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

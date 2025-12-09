"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type PermissionCategory = {
    id: number;
    name: string;
    code: string;
    feature_name?: string;
};

type Permission = {
    id?: number;
    category_id?: number | null;
    category_name?: string;
    feature_name?: string;
    code: string;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
};

export default function Permissions() {
    const [permissions, setPermissions] = React.useState<Permission[]>([]);
    const [categories, setCategories] = React.useState<PermissionCategory[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [showModal, setShowModal] = React.useState(false);
    const [editing, setEditing] = React.useState<Permission | null>(null);
    const [form, setForm] = React.useState<Permission>({
        category_id: undefined,
        code: "",
        name: "",
        description: "",
    });

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [perms, cats] = await Promise.all([
                apiClient<Permission[]>("/superadmin/permissions", { method: "GET" }),
                apiClient<PermissionCategory[]>("/superadmin/permission-categories", { method: "GET" }),
            ]);
            setPermissions(Array.isArray(perms) ? perms : []);
            setCategories(Array.isArray(cats) ? cats : []);
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
            category_id: undefined,
            code: "",
            name: "",
            description: "",
        });
        setShowModal(true);
    };

    const openEdit = (p: Permission) => {
        setEditing(p);
        setForm({ ...p });
        setShowModal(true);
    };

    const savePermission = async () => {
        try {
            if (editing) {
                await apiClient(`/superadmin/permissions/${editing.id}`, {
                    method: "PUT",
                    body: form,
                });
            } else {
                await apiClient("/superadmin/permissions", { method: "POST", body: form });
            }
            setShowModal(false);
            fetchData();
        } catch (e: any) {
            alert(e?.message || "Save failed");
        }
    };

    const deletePermission = async (p: Permission) => {
        if (!confirm(`Delete permission ${p.name}?`)) return;
        try {
            await apiClient(`/superadmin/permissions/${p.id}`, { method: "DELETE" });
            fetchData();
        } catch (e: any) {
            alert(e?.message || "Delete failed");
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-black">Permissions</h1>
                <div className="flex gap-2">
                    <button
                        className="px-4 py-2 rounded border border-gray-300 text-black hover:bg-gray-100"
                        onClick={async () => {
                            if (!confirm("This will reset/update all default permissions. Continue?")) return;
                            try {
                                await apiClient("/superadmin/seed-permissions", { method: "POST" });
                                alert("Permissions seeded successfully");
                                fetchData();
                            } catch (e: any) {
                                alert(e.message || "Failed to seed");
                            }
                        }}
                    >
                        Seed Defaults
                    </button>
                    <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={openCreate}>Add Permission</button>
                </div>
            </div>
            <p className="mt-2 text-black">Manage granular permissions linked to categories.</p>

            {loading && <div className="mt-4 text-black">Loading...</div>}
            {error && <div className="mt-4 text-red-600">{error}</div>}

            <div className="mt-4 overflow-auto border rounded">
                <table className="min-w-full text-left text-black">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">Code</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Category</th>
                            <th className="px-3 py-2">Feature</th>
                            <th className="px-3 py-2">Description</th>
                            <th className="px-3 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {permissions.map((p) => (
                            <tr key={p.id} className="border-t">
                                <td className="px-3 py-2">{p.id}</td>
                                <td className="px-3 py-2">{p.code}</td>
                                <td className="px-3 py-2">{p.name}</td>
                                <td className="px-3 py-2">{p.category_name || "-"}</td>
                                <td className="px-3 py-2">{p.feature_name || "-"}</td>
                                <td className="px-3 py-2">{p.description || "-"}</td>
                                <td className="px-3 py-2">
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 rounded border text-black hover:bg-gray-100" onClick={() => openEdit(p)}>Edit</button>
                                        <button className="px-3 py-1 rounded border text-black hover:bg-gray-100" onClick={() => deletePermission(p)}>Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {permissions.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-3 py-4 text-center">No permissions found.</td>
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
                            <h2 className="text-lg font-semibold text-black">{editing ? "Edit Permission" : "Add Permission"}</h2>
                            <button className="text-black hover:opacity-80" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-black">Category</label>
                                <select
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.category_id ?? ""}
                                    onChange={(e) => setForm({ ...form, category_id: e.target.value ? Number(e.target.value) : undefined })}
                                >
                                    <option value="">-- Select Category --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.code}) {c.feature_name ? `- ${c.feature_name}` : ''}</option>
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
                                    placeholder="PERMISSION_CODE"
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
                                    placeholder="Permission Name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-black">Description</label>
                                <textarea
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.description || ''}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div className="p-4 flex items-center justify-end gap-2 border-t">
                            <button className="px-4 py-2 rounded border text-black" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={savePermission}>{editing ? "Save" : "Add"}</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

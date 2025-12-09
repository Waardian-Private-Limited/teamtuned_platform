"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type Feature = {
  id?: number;
  feature_id?: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  sort_order?: number;
  status?: "active" | "inactive";
  pricing_model?: "per_user" | "fixed" | "hybrid";
  price_per_user?: number;
  fixed_price?: number;
  billing_cycle?: "monthly" | "yearly";
  is_active?: boolean;
};

export default function SuperadminFeatures() {
  const [features, setFeatures] = React.useState<Feature[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Feature | null>(null);
  const [form, setForm] = React.useState<Feature>({
    code: "",
    name: "",
    description: "",
    category: "",
    feature_id: undefined,
    sort_order: 0,
    status: "active",
    pricing_model: "per_user",
    price_per_user: 0,
    fixed_price: 0,
    billing_cycle: "monthly",
    is_active: true,
  });

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<Feature[]>("/superadmin/features", { method: "GET" });
      setFeatures(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load features");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFeatures();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "",
      name: "",
      description: "",
      category: "",
      feature_id: undefined,
      sort_order: 0,
      status: "active",
      pricing_model: "per_user",
      price_per_user: 0,
      fixed_price: 0,
      billing_cycle: "monthly",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (f: Feature) => {
    setEditing(f);
    setForm({ ...f });
    setShowModal(true);
  };

  const saveFeature = async () => {
    try {
      if (editing) {
        await apiClient(`/superadmin/features/${editing.id ?? editing.code}`, {
          method: "PUT",
          body: form,
        });
      } else {
        await apiClient("/superadmin/features", { method: "POST", body: form });
      }
      setShowModal(false);
      fetchFeatures();
    } catch (e: any) {
      alert(e?.message || "Save failed");
    }
  };

  const deleteFeature = async (f: Feature) => {
    if (!confirm(`Delete feature ${f.name}?`)) return;
    try {
      await apiClient(`/superadmin/features/${f.id ?? f.code}`, { method: "DELETE" });
      fetchFeatures();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-black">Our Features</h1>
        <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={openCreate}>Add Feature</button>
      </div>
      <p className="mt-2 text-black">Manage application features from the main database.</p>

      {loading && <div className="mt-4 text-black">Loading...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}

      <div className="mt-4 overflow-auto border rounded">
        <table className="min-w-full text-left text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Feature ID</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Sort Order</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.id ?? f.code} className="border-t">
                <td className="px-3 py-2">{f.id}</td>
                <td className="px-3 py-2">{f.feature_id || '-'}</td>
                <td className="px-3 py-2">{f.code}</td>
                <td className="px-3 py-2">{f.name}</td>
                <td className="px-3 py-2">{f.sort_order}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 text-xs rounded ${f.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {f.status || 'active'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button className="px-3 py-1 rounded border text-black hover:bg-gray-100" onClick={() => openEdit(f)}>Edit</button>
                    <button className="px-3 py-1 rounded border text-black hover:bg-gray-100" onClick={() => deleteFeature(f)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {features.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center">No features found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative mx-auto mt-24 w-[95%] max-w-2xl rounded bg-white shadow-lg">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-black">{editing ? "Edit Feature" : "Add Feature"}</h2>
              <button className="text-black hover:opacity-80" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-black">Feature ID</label>
                <input
                  type="number"
                  className="mt-1 w-full rounded border px-3 py-2 text-black"
                  value={form.feature_id ?? ''}
                  onChange={(e) => setForm({ ...form, feature_id: Number(e.target.value) })}
                  placeholder="e.g. 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-black">Code</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded border px-3 py-2 text-black"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="ORG_PROFILE"
                  disabled={!!editing}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-black">Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded border px-3 py-2 text-black"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Organization Profile"
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

            <div className="p-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border text-black" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={saveFeature}>{editing ? "Save" : "Add"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
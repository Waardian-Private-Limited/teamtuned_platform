"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Plus, X, Edit, Trash2, RefreshCw, CheckCircle, AlertCircle, Settings } from "lucide-react";

type Category = { id: number; name: string; description?: string | null; status: "active" | "inactive" };
type Config = { can_negative: boolean; auto_close_days: number };

export default function WalletConfig() {
  const [tab, setTab] = useState<"categories" | "config">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [errorCat, setErrorCat] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [config, setConfig] = useState<Config>({ can_negative: false, auto_close_days: 0 });
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);

  const loadCategories = async () => {
    setLoadingCat(true);
    setErrorCat(null);
    try {
      const res = await apiClient<any>("/wallet-config/categories", { method: "GET", withAuth: true });
      const list: Category[] = Array.isArray(res) ? res : (res?.categories || []);
      setCategories(list);
    } catch (e: any) {
      setErrorCat(e?.message || "Failed to load categories");
    } finally {
      setLoadingCat(false);
    }
  };

  const loadConfig = async () => {
    setLoadingCfg(true);
    try {
      const res = await apiClient<any>("/wallet-config/config", { method: "GET", withAuth: true });
      const cfg: Config = res?.config || { can_negative: false, auto_close_days: 0 };
      setConfig(cfg);
    } finally {
      setLoadingCfg(false);
    }
  };

  useEffect(() => { loadCategories(); loadConfig(); }, []);

  const openNew = () => { setFormName(""); setFormDesc(""); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); };

  const saveCategory = async () => {
    if (!formName.trim()) return;
    setSaveLoading(true);
    try {
      await apiClient<any>("/wallet-config/categories", { method: "POST", withAuth: true, body: { name: formName.trim(), description: formDesc.trim() } });
      setModalOpen(false);
      await loadCategories();
    } finally { setSaveLoading(false); }
  };

  const updateCategory = async (id: number, payload: Partial<Category>) => {
    await apiClient<any>(`/wallet-config/categories/${id}`, { method: "PUT", withAuth: true, body: payload });
    await loadCategories();
  };

  const deleteCategory = async (id: number) => {
    await apiClient<any>(`/wallet-config/categories/${id}`, { method: "DELETE", withAuth: true });
    await loadCategories();
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await apiClient<any>("/wallet-config/config", { method: "PUT", withAuth: true, body: config });
    } finally { setSavingCfg(false); }
  };

  const catRows = useMemo(() => categories, [categories]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("categories")} className={`px-3 py-2 rounded-lg text-sm ${tab === "categories" ? "bg-blue-600 text-white" : "border border-gray-300"}`}>Categories</button>
          <button onClick={() => setTab("config")} className={`px-3 py-2 rounded-lg text-sm ${tab === "config" ? "bg-blue-600 text-white" : "border border-gray-300"}`}>Config</button>
        </div>
        {tab === "categories" && (
          <button onClick={openNew} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /><span>Add Category</span></button>
        )}
      </div>

      {tab === "categories" && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loadingCat ? (
            <div className="p-6 text-gray-500">Loading…</div>
          ) : errorCat ? (
            <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errorCat}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {catRows.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{c.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{c.description || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${c.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCategory(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })} className="px-2 py-1 border border-gray-300 rounded text-xs">Toggle</button>
                          <button onClick={() => updateCategory(c.id, { name: c.name, description: c.description })} className="p-1 rounded border border-gray-300"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => deleteCategory(c.id)} className="p-1 rounded border border-gray-300 text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {catRows.length === 0 && (
                    <tr><td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={4}>No categories</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "config" && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          {loadingCfg ? (
            <div className="text-gray-500">Loading…</div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Allow Negative Balance</label>
                <input type="checkbox" checked={config.can_negative} onChange={(e) => setConfig({ ...config, can_negative: e.target.checked })} />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-700">Budget Auto-close After Days</label>
                <input type="number" className="px-2 py-1 border border-gray-300 rounded text-sm w-24" value={String(config.auto_close_days)} onChange={(e) => setConfig({ ...config, auto_close_days: parseInt(e.target.value || '0') || 0 })} />
              </div>
              <button onClick={saveConfig} disabled={savingCfg} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2">
                {savingCfg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                <span>{savingCfg ? 'Saving…' : 'Save Settings'}</span>
              </button>
            </>
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md border border-gray-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Add Category</h3>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-600" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <div className="text-xs text-gray-500">Name</div>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Description</div>
                  <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={3} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={closeModal} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                  <button onClick={saveCategory} disabled={saveLoading || !formName.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2">
                    {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    <span>{saveLoading ? 'Saving…' : 'Save'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


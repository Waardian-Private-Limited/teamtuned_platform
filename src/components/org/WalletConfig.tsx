"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Plus, X, Edit, Trash2, RefreshCw, CheckCircle, AlertCircle, Settings, Lock, Unlock, Save } from "lucide-react";
import WalletWorkflowConfig from "./WalletWorkflowConfig";

type Category = { id: number; name: string; description?: string | null; status: "active" | "inactive" };
type Config = {
  can_negative: boolean;
  auto_close_days: number;
  physical_copies_required: boolean;
  physical_copy_start_day: number | null;
  physical_copy_end_day: number | null;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: number | null;
  lock_reason: string | null;
};

// Modern Toggle Component
function Toggle({ enabled, onChange, label, description }: { enabled: boolean; onChange: (val: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${enabled ? 'bg-indigo-600' : 'bg-gray-200'
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
        />
      </button>
    </div>
  );
}

export default function WalletConfig() {
  const [tab, setTab] = useState<"categories" | "config" | "workflows">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [errorCat, setErrorCat] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [config, setConfig] = useState<Config>({
    can_negative: false,
    auto_close_days: 0,
    physical_copies_required: false,
    physical_copy_start_day: null,
    physical_copy_end_day: null,
    is_locked: false,
    locked_at: null,
    locked_by: null,
    lock_reason: null,
  });
  const [loadingCfg, setLoadingCfg] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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
      const cfg: Config = res?.config || {
        can_negative: false,
        auto_close_days: 0,
        physical_copies_required: false,
        physical_copy_start_day: null,
        physical_copy_end_day: null,
        is_locked: false,
        locked_at: null,
        locked_by: null,
        lock_reason: null,
      };
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
      showSuccess("Category created successfully");
    } catch (e: any) {
      showError(e?.message || "Failed to create category");
    } finally { setSaveLoading(false); }
  };

  const updateCategory = async (id: number, payload: Partial<Category>) => {
    try {
      await apiClient<any>(`/wallet-config/categories/${id}`, { method: "PUT", withAuth: true, body: payload });
      await loadCategories();
      showSuccess("Category updated successfully");
    } catch (e: any) {
      showError(e?.message || "Failed to update category");
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await apiClient<any>(`/wallet-config/categories/${id}`, { method: "DELETE", withAuth: true });
      await loadCategories();
      showSuccess("Category deleted successfully");
    } catch (e: any) {
      showError(e?.message || "Failed to delete category");
    }
  };

  const saveConfig = async () => {
    setSavingCfg(true);
    try {
      await apiClient<any>("/wallet-config/config", { method: "PUT", withAuth: true, body: config });
      setIsEditingConfig(false);
      showSuccess("Configuration saved successfully");
    } catch (e: any) {
      showError(e?.message || "Failed to save configuration");
    } finally { setSavingCfg(false); }
  };



  const catRows = useMemo(() => categories, [categories]);

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setTab("categories")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "categories" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>Categories</button>
          <button onClick={() => setTab("config")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "config" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>Configuration</button>
          <button onClick={() => setTab("workflows")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "workflows" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}>Workflows</button>
        </div>
        {tab === "categories" && (
          <button onClick={openNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm"><Plus className="w-4 h-4" /><span>Add Category</span></button>
        )}
      </div>

      {/* Categories Tab */}
      {tab === "categories" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loadingCat ? (
            <div className="p-6 text-gray-500 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…</div>
          ) : errorCat ? (
            <div className="p-6 text-red-600 flex items-center gap-2"><AlertCircle className="w-5 h-5" />{errorCat}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {catRows.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{c.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{c.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateCategory(c.id, { status: c.status === 'active' ? 'inactive' : 'active' })} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">Toggle</button>
                          <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 rounded-lg border border-gray-300 text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {catRows.length === 0 && (
                    <tr><td className="px-6 py-12 text-center text-sm text-gray-500" colSpan={4}>No categories found. Click "Add Category" to create one.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Configuration Tab */}
      {tab === "config" && (
        <div className="space-y-6">
          {/* Header with Edit/Save buttons */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Wallet Configuration</h2>
            {!isEditingConfig ? (
              <button onClick={() => setIsEditingConfig(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                <Edit className="w-4 h-4" />
                Edit Configuration
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setIsEditingConfig(false); loadConfig(); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={saveConfig} disabled={savingCfg} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
                  {savingCfg ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {savingCfg ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

          {loadingCfg ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mr-3" />
              <span className="text-gray-600">Loading configuration…</span>
            </div>
          ) : (
            <>
              {/* General Settings */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">General Settings</h3>
                <div className="space-y-1 divide-y divide-gray-100">
                  <Toggle
                    enabled={config.can_negative}
                    onChange={(val) => isEditingConfig && setConfig({ ...config, can_negative: val })}
                    label="Allow Negative Balance"
                    description="Permit wallets to go into negative balance"
                  />
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <span className="text-sm font-medium text-gray-900">Budget Auto-close After Days</span>
                      <p className="text-xs text-gray-500 mt-0.5">Automatically close budgets after specified days</p>
                    </div>
                    <input
                      type="number"
                      disabled={!isEditingConfig}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                      value={String(config.auto_close_days)}
                      onChange={(e) => setConfig({ ...config, auto_close_days: parseInt(e.target.value || '0') || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Physical Copies */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Physical Copy Requirements</h3>
                <div className="space-y-4">
                  <Toggle
                    enabled={config.physical_copies_required}
                    onChange={(val) => isEditingConfig && setConfig({ ...config, physical_copies_required: val })}
                    label="Require Physical Copies"
                    description="Mandate physical document submission for expenses"
                  />
                  {config.physical_copies_required && (
                    <div className="pl-6 space-y-3 border-l-2 border-indigo-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Day of Month</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            disabled={!isEditingConfig}
                            placeholder="e.g., 1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                            value={config.physical_copy_start_day || ''}
                            onChange={(e) => setConfig({ ...config, physical_copy_start_day: e.target.value ? parseInt(e.target.value) : null })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Day of Month</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            disabled={!isEditingConfig}
                            placeholder="e.g., 31"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                            value={config.physical_copy_end_day || ''}
                            onChange={(e) => setConfig({ ...config, physical_copy_end_day: e.target.value ? parseInt(e.target.value) : null })}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Physical copies will be required for expenses submitted between these days of the month.</p>
                    </div>
                  )}
                </div>
              </div>


            </>
          )}
        </div>
      )}

      {/* Workflows Tab */}
      {tab === "workflows" && (
        <WalletWorkflowConfig />
      )}

      {/* Add Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Add Category</h3>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-5 h-5 text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="e.g., Office Supplies" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" rows={3} placeholder="Optional description..." />
              </div>
              <div className="flex items-center justify-end gap-2 pt-4">
                <button onClick={closeModal} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={saveCategory} disabled={saveLoading || !formName.trim()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  <span>{saveLoading ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Category</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this category? This action cannot be undone.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">Cancel</button>
              <button onClick={async () => {
                const id = deleteConfirmId;
                setDeleteConfirmId(null);
                try {
                  await apiClient<any>(`/wallet-config/categories/${id}`, { method: "DELETE", withAuth: true });
                  await loadCategories();
                  showSuccess("Category deleted successfully");
                } catch (e: any) {
                  showError(e?.message || "Failed to delete category");
                }
              }} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

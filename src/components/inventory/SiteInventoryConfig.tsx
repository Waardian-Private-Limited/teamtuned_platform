"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Save, Building2, Truck, Users, Package, CheckCircle2, AlertCircle, Pencil, Plus, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SiteInventorySettings {
    has_site_store: boolean;
    store_manager_id: number | null;
    receives_from_vendors: boolean;
    restock_mode: 'main_warehouse' | 'direct_purchase' | 'hybrid';
    is_main_warehouse: boolean;
}

interface Section {
    id: number;
    site_id: number;
    section_name: string;
}

interface Employee {
    id: number;
    name: string;
}

interface Site {
    id: number;
    name: string;
    code: string;
}

export default function SiteInventoryConfig({ siteId }: { siteId: string }) {
    const router = useRouter();
    const [settings, setSettings] = useState<SiteInventorySettings>({
        has_site_store: false,
        store_manager_id: null,
        receives_from_vendors: false,
        restock_mode: 'main_warehouse',
        is_main_warehouse: false,
    });
    const [sections, setSections] = useState<Section[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [siteInfo, setSiteInfo] = useState<Site | null>(null);
    const [newSectionName, setNewSectionName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, [siteId]);

    const fetchData = async () => {
        try {
            const [settingsRes, sectionsRes, employeesResRaw, siteRes] = await Promise.all([
                apiClient<{ settings: SiteInventorySettings }>(`/inventory/site-settings/${siteId}`, { method: 'GET', withAuth: true }),
                apiClient<{ sections: Section[] }>(`/inventory/site-sections/${siteId}`, { method: 'GET', withAuth: true }),
                apiClient<any>('/organization/employees', { method: 'GET', withAuth: true, params: { site_id: String(siteId), hq: '0' } }),
                apiClient<{ site: Site }>(`/sites/${siteId}`, { method: 'GET', withAuth: true })
            ]);

            if (settingsRes?.settings) {
                setSettings({
                    has_site_store: Boolean(settingsRes.settings.has_site_store),
                    store_manager_id: settingsRes.settings.store_manager_id,
                    receives_from_vendors: Boolean(settingsRes.settings.receives_from_vendors),
                    restock_mode: settingsRes.settings.restock_mode,
                    is_main_warehouse: Boolean(settingsRes.settings.is_main_warehouse),
                });
                setIsEditing(false);
            }
            setSections(sectionsRes?.sections || []);
            const empRaw = Array.isArray(employeesResRaw) ? employeesResRaw : (employeesResRaw?.employees || employeesResRaw?.items || []);
            const empList: Employee[] = (empRaw || []).map((e: any) => ({ id: Number(e.id), name: [e.first_name, e.last_name, e.name].filter(Boolean).join(' ').trim() || `Employee #${e.id}` }));
            setEmployees(empList);
            setSiteInfo(siteRes?.site || null);
        } catch (error) {
            console.error("Failed to fetch data:", error);
            setMessage({ type: 'error', text: 'Failed to load configuration' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await apiClient(`/inventory/site-settings/${siteId}`, {
                method: 'PUT',
                withAuth: true,
                body: settings
            });
            setMessage({ type: 'success', text: 'Configuration saved successfully' });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save configuration:", error);
            setMessage({ type: 'error', text: 'Failed to save configuration' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddSection = async () => {
        if (!newSectionName.trim()) return;

        try {
            const res = await apiClient<{ section: Section }>(`/inventory/site-sections/${siteId}`, {
                method: 'POST',
                withAuth: true,
                body: { section_name: newSectionName }
            });

            if (res?.section) {
                setSections([...sections, res.section]);
                setNewSectionName("");
            }
        } catch (error) {
            console.error("Failed to add section:", error);
            setMessage({ type: 'error', text: 'Failed to add section' });
        }
    };

    const handleDeleteSection = async (sectionId: number) => {
        try {
            await apiClient(`/inventory/site-sections/${sectionId}`, {
                method: 'DELETE',
                withAuth: true
            });
            setSections(sections.filter(s => s.id !== sectionId));
        } catch (error) {
            console.error("Failed to delete section:", error);
            setMessage({ type: 'error', text: 'Failed to delete section' });
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <Link
                    href="/org-admin/inventory/sites"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                >
                    <ArrowLeft size={16} />
                    Back to Sites
                </Link>
            </div>

            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Building2 className="text-indigo-600" size={28} />
                        {siteInfo ? siteInfo.name : 'Site Inventory Configuration'}
                    </h1>
                    {siteInfo?.code && (
                        <p className="text-sm text-slate-500 font-mono mt-1">Site Code: {siteInfo.code}</p>
                    )}
                    <p className="text-slate-600 mt-2">Configure inventory settings for this site.</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
                    >
                        <Pencil size={16} />
                        Edit Configuration
                    </button>
                )}
            </div>

            {message && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 space-y-8">

                    {/* Store Configuration */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Package size={20} className="text-slate-500" />
                            Store Configuration
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="block font-medium text-slate-900">Does the site have a Site Store?</span>
                                        <span className="text-sm text-slate-500">Enable if this site has a dedicated inventory store.</span>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.has_site_store}
                                            onChange={(e) => setSettings(prev => ({ ...prev, has_site_store: e.target.checked }))}
                                            disabled={!isEditing}
                                        />
                                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                                    </div>
                                </label>
                            </div>

                            {settings.has_site_store && (
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <label className="block font-medium text-slate-900 mb-2">Who is the Store Manager?</label>
                                    <select
                                        value={settings.store_manager_id || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, store_manager_id: e.target.value ? Number(e.target.value) : null }))}
                                        disabled={!isEditing}
                                        className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${!isEditing ? 'opacity-60 cursor-not-allowed bg-slate-100' : 'bg-white'}`}
                                    >
                                        <option value="">Select Store Manager</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Receiving Configuration */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Truck size={20} className="text-slate-500" />
                            Receiving Configuration
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="font-medium text-slate-900">Does this site receive goods directly from vendors?</span>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.receives_from_vendors}
                                            onChange={(e) => setSettings(prev => ({ ...prev, receives_from_vendors: e.target.checked }))}
                                            disabled={!isEditing}
                                        />
                                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                                    </div>
                                </label>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <span className="block font-medium text-slate-900">Is this the Main Warehouse?</span>
                                        <span className="text-sm text-slate-500">Mark if this site serves as the organization's main warehouse.</span>
                                    </div>
                                    <div className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={settings.is_main_warehouse}
                                            onChange={(e) => setSettings(prev => ({ ...prev, is_main_warehouse: e.target.checked }))}
                                            disabled={!isEditing}
                                        />
                                        <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Restock Mode */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Package size={20} className="text-slate-500" />
                            Restock Mode
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block font-medium text-slate-900 mb-2">How does this site restock inventory?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { value: 'main_warehouse', label: 'From Main Warehouse' },
                                    { value: 'direct_purchase', label: 'Direct Purchase' },
                                    { value: 'hybrid', label: 'Hybrid (Main → PR if no stock)' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => isEditing && setSettings(prev => ({ ...prev, restock_mode: option.value as any }))}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${settings.restock_mode === option.value
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                            } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        disabled={!isEditing}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Sections */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-slate-500" />
                            Site Sections
                        </h3>
                        <div className="space-y-3">
                            {sections.map((section) => (
                                <div key={section.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                                    <span className="text-slate-900 font-medium">{section.section_name}</span>
                                    {isEditing && (
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="text-red-600 hover:text-red-700 p-1"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}

                            {isEditing && (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newSectionName}
                                        onChange={(e) => setNewSectionName(e.target.value)}
                                        placeholder="New section name"
                                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddSection()}
                                    />
                                    <button
                                        onClick={handleAddSection}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                </div>

                {isEditing && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed font-medium shadow-sm"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

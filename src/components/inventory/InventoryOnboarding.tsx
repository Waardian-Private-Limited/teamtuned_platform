"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Save, Building2, Truck, ShoppingCart, CheckCircle2, AlertCircle, Pencil } from "lucide-react";

interface InventorySettings {
    has_main_warehouse: boolean;
    purchase_centralized: 'yes' | 'no' | 'hybrid';
    allow_site_vendors: boolean;
    allow_site_pr: boolean;
    qc_at_receiving: 'yes' | 'no' | 'category_based';
}

export default function InventoryOnboarding() {
    const [settings, setSettings] = useState<InventorySettings>({
        has_main_warehouse: false,
        purchase_centralized: 'no',
        allow_site_vendors: false,
        allow_site_pr: false,
        qc_at_receiving: 'no',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await apiClient<{ settings: InventorySettings }>('/inventory/settings', { method: 'GET', withAuth: true });
            if (res?.settings) {
                setSettings({
                    has_main_warehouse: Boolean(res.settings.has_main_warehouse),
                    purchase_centralized: res.settings.purchase_centralized,
                    allow_site_vendors: Boolean(res.settings.allow_site_vendors),
                    allow_site_pr: Boolean(res.settings.allow_site_pr),
                    qc_at_receiving: res.settings.qc_at_receiving,
                });
                setIsEditing(false);
            }
        } catch (error) {
            console.error("Failed to fetch inventory settings:", error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await apiClient('/inventory/settings', {
                method: 'PUT',
                withAuth: true,
                body: settings
            });
            setMessage({ type: 'success', text: 'Settings saved successfully' });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to save inventory settings:", error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Building2 className="text-indigo-600" size={28} />
                        Inventory Onboarding
                    </h1>
                    <p className="text-slate-600 mt-2">Configure your organization's inventory and purchasing workflows.</p>
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

                    {/* Warehouse Section */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Building2 size={20} className="text-slate-500" />
                            Warehouse Configuration
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="flex items-center justify-between cursor-pointer">
                                <div>
                                    <span className="block font-medium text-slate-900">Do you have a Main Warehouse?</span>
                                    <span className="text-sm text-slate-500">Enable if you have a central storage location that distributes to sites.</span>
                                </div>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.has_main_warehouse}
                                        onChange={(e) => setSettings(prev => ({ ...prev, has_main_warehouse: e.target.checked }))}
                                        disabled={!isEditing}
                                    />
                                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* Purchasing Section */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <ShoppingCart size={20} className="text-slate-500" />
                            Purchasing Workflow
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block font-medium text-slate-900 mb-2">Is Purchase Centralized?</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {['yes', 'no', 'hybrid'].map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => isEditing && setSettings(prev => ({ ...prev, purchase_centralized: option as any }))}
                                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${settings.purchase_centralized === option
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                } ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            disabled={!isEditing}
                                        >
                                            {option.charAt(0).toUpperCase() + option.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium text-slate-900">Allow Sites to add vendors?</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.allow_site_vendors}
                                                onChange={(e) => setSettings(prev => ({ ...prev, allow_site_vendors: e.target.checked }))}
                                                disabled={!isEditing}
                                            />
                                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium text-slate-900">Allow Sites to create PR?</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={settings.allow_site_pr}
                                                onChange={(e) => setSettings(prev => ({ ...prev, allow_site_pr: e.target.checked }))}
                                                disabled={!isEditing}
                                            />
                                            <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 ${!isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Receiving Section */}
                    <section>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                            <Truck size={20} className="text-slate-500" />
                            Receiving & QC
                        </h3>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <label className="block font-medium text-slate-900 mb-2">Do you need QC at receiving?</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { value: 'yes', label: 'Yes' },
                                    { value: 'no', label: 'No' },
                                    { value: 'category_based', label: 'Category-based' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => isEditing && setSettings(prev => ({ ...prev, qc_at_receiving: option.value as any }))}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${settings.qc_at_receiving === option.value
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

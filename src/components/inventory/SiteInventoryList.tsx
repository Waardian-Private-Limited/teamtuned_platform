"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Building2, Settings, CheckCircle2, AlertCircle, Loader2, Plus } from "lucide-react";
import Link from "next/link";

interface Site {
    id: number;
    site_name?: string;
    site_code?: string;
    name?: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
}

export default function SiteInventoryList() {
    const [sites, setSites] = useState<Site[]>([]);
    const [storesBySite, setStoresBySite] = useState<Record<number, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [creatingForSite, setCreatingForSite] = useState<number | null>(null);

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const res = await apiClient<{ sites: Site[] }>('/sites', { method: 'GET', withAuth: true });
            setSites(res?.sites || []);
            try {
                const st = await apiClient<{ stores: any[] }>("/inventory/site-stores", { method: 'GET', withAuth: true });
                const list = Array.isArray(st?.stores) ? st!.stores! : [];
                const map: Record<number, any> = {};
                list.forEach(s => { const sid = Number(s.site_id || s.siteId); if (sid) map[sid] = s; });
                setStoresBySite(map);
            } catch (_) {}
        } catch (err) {
            console.error("Failed to fetch sites:", err);
            setError("Failed to load sites");
        } finally {
            setLoading(false);
        }
    };

    const createStore = async (siteId: number) => {
        setCreatingForSite(siteId);
        try {
            const res = await apiClient<any>("/inventory/site-stores", { method: 'POST', withAuth: true, body: { site_id: siteId } });
            const store = res?.store || res;
            if (store && store.site_id) {
                setStoresBySite(prev => ({ ...prev, [Number(store.site_id)]: store }));
            }
        } catch (e) {
            console.error('Create store failed', e);
            alert((e as any)?.message || 'Failed to create store');
        } finally {
            setCreatingForSite(null);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3 border border-red-200">
                    <AlertCircle size={20} />
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <Building2 className="text-indigo-600" size={28} />
                    Site Inventory Configuration
                </h1>
                <p className="text-slate-600 mt-2">Configure inventory settings for each site/project.</p>
            </div>

            {sites.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                    <p className="text-slate-600">No sites found. Please create sites first.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site) => (
                        <div
                            key={site.id}
                            className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-slate-900 text-lg">
                                        {(site.site_name || site.name) || 'Unnamed Site'}
                                        {((site.site_code || site.code)) && (
                                            <span className="ml-2 text-xs text-slate-500 font-mono">[{site.site_code || site.code}]</span>
                                        )}
                                    </h3>
                                    {(site.address || site.city || site.state || site.pincode) && (
                                        <p className="text-sm text-slate-600 mt-2">
                                            {[site.address, site.city, site.state, site.pincode].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                    <div className="mt-2 text-sm">
                                        {storesBySite[site.id] ? (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="inline-flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
                                                    <CheckCircle2 size={16} /> Store Created
                                                </span>
                                                {storesBySite[site.id]?.manager_name && (
                                                    <span className="inline-flex items-center gap-2 text-slate-700 bg-slate-50 border border-slate-200 px-2 py-1 rounded">
                                                        Manager: {storesBySite[site.id].manager_name}
                                                    </span>
                                                )}
                                                {storesBySite[site.id]?.is_main_store ? (
                                                    <span className="inline-flex items-center gap-2 text-amber-800 bg-amber-100 border border-amber-200 px-2 py-1 rounded">
                                                        Main Store
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                const storeId = Number(storesBySite[site.id]?.id);
                                                                if (!storeId) return;
                                                                await apiClient(`/inventory/site-stores/${storeId}/main`, { method: 'PUT', withAuth: true });
                                                                setStoresBySite(prev => ({ ...prev, [site.id]: { ...prev[site.id], is_main_store: 1 } }));
                                                            } catch (e) {
                                                                alert((e as any)?.message || 'Failed to set main store');
                                                            }
                                                        }}
                                                        className="inline-flex items-center gap-2 px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs"
                                                    >
                                                        Set as Main Store
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => createStore(site.id)}
                                                disabled={creatingForSite === site.id}
                                                className="inline-flex items-center gap-2 px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs"
                                            >
                                                {creatingForSite === site.id ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Plus size={14} />
                                                )}
                                                Create Store
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <Building2 className="text-slate-400" size={20} />
                            </div>

                            {storesBySite[site.id] && (
                                <Link
                                    href={`/org-admin/inventory/sites/${site.id}`}
                                    className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                                >
                                    <Settings size={16} />
                                    Configure
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

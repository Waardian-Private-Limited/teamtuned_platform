"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import { Loader2, Settings } from "lucide-react";

type Organization = {
    id: number;
    organization_name: string;
    email: string;
    status: string;
};

type Feature = {
    id: number;
    code: string;
    name: string;
};

export default function OrgFeatures() {
    const [orgs, setOrgs] = React.useState<Organization[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [features, setFeatures] = React.useState<Feature[]>([]);
    const [selectedOrg, setSelectedOrg] = React.useState<Organization | null>(null);
    const [enabledFeatureIds, setEnabledFeatureIds] = React.useState<Set<number>>(new Set());
    const [modalLoading, setModalLoading] = React.useState(false);

    React.useEffect(() => {
        fetchOrgs();
    }, []);

    const fetchOrgs = async () => {
        setLoading(true);
        try {
            const data = await apiClient<Organization[]>("/superadmin/organizations", { method: "GET" });
            setOrgs(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load organizations");
        } finally {
            setLoading(false);
        }
    };

    const openManageFeatures = async (org: Organization) => {
        setSelectedOrg(org);
        setModalLoading(true);
        try {
            // Load All Features (Master)
            const allFeats = await apiClient<Feature[]>("/superadmin/features", { method: "GET" });
            setFeatures(Array.isArray(allFeats) ? allFeats : []);

            // Load Enabled Features for this Org
            const enabledIds = await apiClient<number[]>(`/superadmin/organizations/${org.id}/features`, { method: "GET" });
            setEnabledFeatureIds(new Set(enabledIds));
        } catch (e: any) {
            alert(e?.message || "Failed to load details");
        } finally {
            setModalLoading(false);
        }
    };

    const toggleFeature = (id: number) => {
        const next = new Set(enabledFeatureIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setEnabledFeatureIds(next);
    };

    const saveFeatures = async () => {
        if (!selectedOrg) return;
        try {
            await apiClient(`/superadmin/organizations/${selectedOrg.id}/sync-features`, {
                method: "POST",
                body: { featureIds: Array.from(enabledFeatureIds) },
            });
            alert("Features synced successfully");
            setSelectedOrg(null);
        } catch (e: any) {
            alert(e?.message || "Sync failed");
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-black">Organization Features</h1>
            </div>
            <p className="mt-2 text-black">Manage allowed features for each organization.</p>

            {loading && <div className="mt-4 text-black">Loading...</div>}
            {error && <div className="mt-4 text-red-600">{error}</div>}

            <div className="mt-4 overflow-auto border rounded max-h-[600px]">
                <table className="min-w-full text-left text-black">
                    <thead className="bg-gray-100 sticky top-0">
                        <tr>
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orgs.map((org) => (
                            <tr key={org.id} className="border-t">
                                <td className="px-3 py-2">{org.id}</td>
                                <td className="px-3 py-2 font-medium">{org.organization_name}</td>
                                <td className="px-3 py-2">{org.email}</td>
                                <td className="px-3 py-2">
                                    <span className={`px-2 py-1 text-xs rounded ${org.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {org.status}
                                    </span>
                                </td>
                                <td className="px-3 py-2">
                                    <button
                                        className="flex items-center gap-1 px-3 py-1 rounded bg-black text-white hover:bg-gray-800 text-sm"
                                        onClick={() => openManageFeatures(org)}
                                    >
                                        <Settings className="w-4 h-4" /> Manage Features
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {orgs.length === 0 && !loading && (
                            <tr>
                                <td colSpan={5} className="px-3 py-4 text-center">No organizations found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrg(null)} />
                    <div className="relative w-full max-w-2xl rounded bg-white shadow-lg flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b p-4">
                            <h2 className="text-lg font-semibold text-black">Manage Features: {selectedOrg.organization_name}</h2>
                            <button className="text-black hover:opacity-80" onClick={() => setSelectedOrg(null)}>✕</button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            {modalLoading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {features.map(feat => (
                                        <label key={feat.id} className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="mt-1"
                                                checked={enabledFeatureIds.has(feat.id)}
                                                onChange={() => toggleFeature(feat.id)}
                                            />
                                            <div>
                                                <div className="font-medium text-black">{feat.name}</div>
                                                <div className="text-xs text-gray-500">{feat.code}</div>
                                            </div>
                                        </label>
                                    ))}
                                    {features.length === 0 && <div className="text-gray-500">No features available.</div>}
                                </div>
                            )}
                        </div>

                        <div className="p-4 flex items-center justify-end gap-2 border-t">
                            <button className="px-4 py-2 rounded border text-black" onClick={() => setSelectedOrg(null)}>Cancel</button>
                            <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={saveFeatures}>Save & Sync</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

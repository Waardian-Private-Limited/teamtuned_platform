"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type AppVersion = {
    id?: number;
    platform: 'android' | 'ios';
    version: string;
    build_number?: number;
    is_major: boolean;
    is_active: boolean;
    store_url: string;
    features?: string;
    created_at?: string;
};

export default function AppVersionManagement() {
    const [versions, setVersions] = React.useState<AppVersion[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [showModal, setShowModal] = React.useState(false);
    const [platformFilter, setPlatformFilter] = React.useState<'android' | 'ios' | ''>('');

    const [form, setForm] = React.useState<AppVersion>({
        platform: 'android',
        version: '',
        build_number: 0,
        is_major: false,
        is_active: true,
        store_url: '',
        features: '',
    });

    const fetchVersions = async () => {
        setLoading(true);
        setError(null);
        try {
            const query = platformFilter ? `?platform=${platformFilter}` : '';
            const data = await apiClient<AppVersion[]>(`/superadmin/app-versions${query}`, { method: "GET" });
            setVersions(Array.isArray(data) ? data : []);
        } catch (e: any) {
            setError(e?.message || "Failed to load versions");
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchVersions();
    }, [platformFilter]);

    const openModal = (version?: AppVersion) => {
        if (version) {
            setForm({ ...version });
        } else {
            setForm({
                platform: 'android',
                version: '',
                build_number: 0,
                is_major: false,
                is_active: true,
                store_url: '',
                features: '',
            });
        }
        setShowModal(true);
    };

    const saveVersion = async () => {
        try {
            if (!form.version || !form.store_url) {
                alert("Version and Store URL are required");
                return;
            }

            if (form.id) {
                await apiClient(`/superadmin/app-versions/${form.id}`, { method: "PUT", body: form });
            } else {
                await apiClient("/superadmin/app-versions", { method: "POST", body: form });
            }
            setShowModal(false);
            fetchVersions();
        } catch (e: any) {
            alert(e?.message || "Save failed");
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-black">App Versions</h1>
                <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={() => openModal()}>Publish New Version</button>
            </div>
            <p className="mt-2 text-black">Manage forced updates for Android and iOS apps.</p>

            <div className="mt-4 flex gap-4">
                <button onClick={() => setPlatformFilter('')} className={`px-3 py-1 rounded border ${!platformFilter ? 'bg-gray-200' : ''}`}>All</button>
                <button onClick={() => setPlatformFilter('android')} className={`px-3 py-1 rounded border ${platformFilter === 'android' ? 'bg-gray-200' : ''}`}>Android</button>
                <button onClick={() => setPlatformFilter('ios')} className={`px-3 py-1 rounded border ${platformFilter === 'ios' ? 'bg-gray-200' : ''}`}>iOS</button>
            </div>

            {loading && <div className="mt-4 text-black">Loading...</div>}
            {error && <div className="mt-4 text-red-600">{error}</div>}

            <div className="mt-4 overflow-auto border rounded">
                <table className="min-w-full text-left text-black">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-3 py-2">Platform</th>
                            <th className="px-3 py-2">Version</th>
                            <th className="px-3 py-2">Build</th>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Store URL</th>
                            <th className="px-3 py-2">Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        {versions.map((v) => (
                            <tr key={v.id} className="border-t">
                                <td className="px-3 py-2 capitalize">{v.platform}</td>
                                <td className="px-3 py-2 font-medium">{v.version}</td>
                                <td className="px-3 py-2">{v.build_number}</td>
                                <td className="px-3 py-2">
                                    {v.is_major ? (
                                        <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 font-bold">MAJOR (Force)</span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Minor (Optional)</span>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    {v.is_active ? (
                                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Inactive</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 max-w-xs truncate" title={v.store_url}>
                                    <a href={v.store_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Link</a>
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-500">
                                    {v.created_at ? new Date(v.created_at).toLocaleString() : '-'}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <button
                                        onClick={() => openModal(v)}
                                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {versions.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-3 py-4 text-center">No versions found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg rounded bg-white shadow-lg">
                        <div className="flex items-center justify-between border-b p-4">
                            <h2 className="text-lg font-semibold text-black">{form.id ? 'Edit Version' : 'Publish New Version'}</h2>
                            <button className="text-black hover:opacity-80" onClick={() => setShowModal(false)}>✕</button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-black">Platform</label>
                                <select
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.platform}
                                    onChange={(e) => setForm({ ...form, platform: e.target.value as any })}
                                >
                                    <option value="android">Android</option>
                                    <option value="ios">iOS</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-black">Version (e.g. 1.0.5)</label>
                                    <input
                                        type="text"
                                        className="mt-1 w-full rounded border px-3 py-2 text-black"
                                        value={form.version}
                                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-black">Build Number</label>
                                    <input
                                        type="number"
                                        className="mt-1 w-full rounded border px-3 py-2 text-black"
                                        value={form.build_number}
                                        onChange={(e) => setForm({ ...form, build_number: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isMajor"
                                    className="h-4 w-4"
                                    checked={form.is_major}
                                    onChange={(e) => setForm({ ...form, is_major: e.target.checked })}
                                />
                                <label htmlFor="isMajor" className="text-sm font-medium text-black">
                                    This is a MAJOR update (Force Update)
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-black">Store URL</label>
                                <input
                                    type="text"
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    value={form.store_url}
                                    onChange={(e) => setForm({ ...form, store_url: e.target.value })}
                                    placeholder="https://play.google.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-black">What's New (Features)</label>
                                <textarea
                                    className="mt-1 w-full rounded border px-3 py-2 text-black"
                                    rows={4}
                                    value={form.features || ''}
                                    onChange={(e) => setForm({ ...form, features: e.target.value })}
                                    placeholder="- New Dashboard UI&#10;- Improved Performance&#10;- Bug Fixes"
                                />
                                <p className="text-xs text-gray-500 mt-1">Use bullet points for better readability in the app.</p>
                            </div>

                            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800">
                                ⚠️ Publishing this will automatically mark previous versions of {form.platform} as inactive.
                            </div>
                        </div>

                        <div className="p-4 flex items-center justify-end gap-2 border-t">
                            <button className="px-4 py-2 rounded border text-black" onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={saveVersion}>{form.id ? 'Save Changes' : 'Publish'}</button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import TeamTunedLoader from "@/components/common/TeamTunedLoader";
import {
    Plus,
    Search,
    Trash2,
    Edit2,
    User,
    MapPin,
    Shield,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    AlertCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

interface SiteLogin {
    id: number;
    site_id: number | null;
    username: string;
    collection_name: string | null;
    status: 'active' | 'inactive';
    created_at: string;
}

interface Site {
    id: number;
    name: string;
}

export default function SiteLoginsManager() {
    const [logins, setLogins] = useState<SiteLogin[]>([]);
    const [sites, setSites] = useState<Site[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLogin, setEditingLogin] = useState<SiteLogin | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        site_id: "",
        collection_name: "",
        status: "active"
    });
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [loginsRes, sitesRes] = await Promise.all([
                apiClient<{ success: boolean; data: SiteLogin[] }>('/organization/site-logins'),
                apiClient<{ status: string; sites: Site[] }>('/sites') // Standard sites endpoint often returns { status: 'success', sites: [...] }
            ]);

            setLogins(loginsRes.data || []);
            setSites(sitesRes.sites || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast.error("Failed to load site logins");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                site_id: formData.site_id ? parseInt(formData.site_id) : null,
                // Only send password if provided (for edit) or always for create
                ...(formData.password ? { password: formData.password } : {})
            };

            if (editingLogin) {
                // Update
                // If password empty, don't send it. But payload construction above handles it if empty string is falsy.
                if (!formData.password) delete (payload as any).password;

                await apiClient(`/organization/site-logins/${editingLogin.id}`, {
                    method: 'PUT',
                    body: payload
                });
                toast.success("Site Login updated successfully");
            } else {
                // Create
                if (!formData.password) {
                    toast.error("Password is required for new logins");
                    setSubmitting(false);
                    return;
                }
                await apiClient('/organization/site-logins', {
                    method: 'POST',
                    body: payload
                });
                toast.success("Site Login created successfully");
            }

            closeModal();
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this login?")) return;

        try {
            await apiClient(`/organization/site-logins/${id}`, { method: 'DELETE' });
            toast.success("Deleted successfully");
            setLogins(logins.filter(l => l.id !== id));
        } catch (error) {
            toast.error("Failed to delete");
        }
    };

    const openCreateModal = () => {
        setEditingLogin(null);
        setFormData({
            username: "",
            password: "",
            site_id: "",
            collection_name: "",
            status: "active"
        });
        setIsModalOpen(true);
    };

    const openEditModal = (login: SiteLogin) => {
        setEditingLogin(login);
        setFormData({
            username: login.username,
            password: "", // Leave empty to keep existing
            site_id: login.site_id?.toString() || "",
            collection_name: login.collection_name || "",
            status: login.status as string
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLogin(null);
        setFormData({ username: "", password: "", site_id: "", collection_name: "", status: "active" });
    };

    const filteredLogins = logins.filter(
        (l) =>
            l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.collection_name && l.collection_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) return <TeamTunedLoader />;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Logins</h1>
                    <p className="text-gray-500 mt-1">Manage Kiosk and Site-level credentials</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
                >
                    <Plus size={20} />
                    <span>New Login</span>
                </button>
            </div>

            {/* Search */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by username or collection name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                />
            </div>

            {/* List */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredLogins.map((login) => {
                    const siteName = sites.find(s => s.id === login.site_id)?.name || "All Sites (Unbound)";
                    return (
                        <div key={login.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Shield size={24} />
                                </div>
                                <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${login.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {login.status === 'active' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    <span className="uppercase">{login.status}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-lg text-gray-900 mb-1">{login.username}</h3>
                            <div className="space-y-2 text-sm text-gray-600 mb-4">
                                {login.collection_name && (
                                    <div className="flex items-center gap-2">
                                        <User size={16} className="text-gray-400" />
                                        <span>{login.collection_name}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className={!login.site_id ? "italic text-gray-400" : ""}>{siteName}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => openEditModal(login)}
                                    className="flex-1 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(login.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    )
                })}
                {filteredLogins.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                        <AlertCircle size={48} className="mb-4 opacity-20" />
                        <p>No site logins found</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl scale-100 transition-all">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                            {editingLogin ? "Edit Site Login" : "New Site Login"}
                        </h2>
                        <p className="text-sm text-gray-500 mb-6">Enter credentials for Kiosk access.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                                    placeholder="e.g. site_a_kiosk"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password {editingLogin && <span className="text-gray-400 font-normal">(Leave empty to keep current)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!editingLogin}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black pr-10"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Site */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Site Context (Optional)</label>
                                <select
                                    value={formData.site_id}
                                    onChange={e => setFormData({ ...formData, site_id: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                                >
                                    <option value="">No specific site (Global/Float)</option>
                                    {sites.map(site => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Collection Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Collection Name / Display Name</label>
                                <input
                                    type="text"
                                    value={formData.collection_name}
                                    onChange={e => setFormData({ ...formData, collection_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                                    placeholder="e.g. Main Gate Kiosk 1"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="active"
                                            checked={formData.status === 'active'}
                                            onChange={() => setFormData({ ...formData, status: 'active' })}
                                            className="accent-black"
                                        />
                                        <span className="text-sm">Active</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="status"
                                            value="inactive"
                                            checked={formData.status === 'inactive'}
                                            onChange={() => setFormData({ ...formData, status: 'inactive' })}
                                            className="accent-black"
                                        />
                                        <span className="text-sm">Inactive</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? "Saving..." : (editingLogin ? "Update" : "Create")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

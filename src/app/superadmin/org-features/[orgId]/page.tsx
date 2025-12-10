"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { apiClient } from "../../../../lib/apiClient";

interface AllowedFeature {
    id: number;
    feature_id: number;
    code: string;
    name: string;
    status: 'active' | 'inactive';
}

interface PermissionCategory {
    id: number;
    main_id: number;
    feature_id: number;
    code: string;
    name: string;
    status: 'active' | 'inactive';
    sort_order: number;
}

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${active
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
    >
        {children}
    </button>
);

export default function OrgFeaturesDetail() {
    const { orgId } = useParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'features' | 'categories'>('features');
    const [org, setOrg] = useState<any>(null);
    const [features, setFeatures] = useState<AllowedFeature[]>([]);
    const [categories, setCategories] = useState<PermissionCategory[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit/Dialog State
    const [editingItem, setEditingItem] = useState<any>(null);
    const [editName, setEditName] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (orgId) {
            fetchOrgDetails();
            fetchData();
        }
    }, [orgId, activeTab]);

    const fetchOrgDetails = async () => {
        try {
            const data = await apiClient(`/superadmin/organizations/${orgId}`);
            setOrg(data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'features') {
                const data = await apiClient<AllowedFeature[]>(`/superadmin/orgs/${orgId}/allowed-features`);
                setFeatures(data);
            } else {
                const data = await apiClient<PermissionCategory[]>(`/superadmin/orgs/${orgId}/permission-categories`);
                setCategories(data);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (item: any, type: 'feature' | 'category') => {
        const newStatus = item.status === 'active' ? 'inactive' : 'active';
        try {
            if (type === 'feature') {
                await apiClient(`/superadmin/orgs/${orgId}/allowed-features/${item.id}`, {
                    method: 'PUT',
                    body: { status: newStatus }
                });
            } else {
                await apiClient(`/superadmin/orgs/${orgId}/permission-categories/${item.id}`, {
                    method: 'PUT',
                    body: { status: newStatus }
                });
            }
            fetchData(); // Refresh
        } catch (error) {
            console.error("Failed to update status:", error);
            alert("Failed to update status");
        }
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setEditName(item.name);
        setIsDialogOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            if (activeTab === 'features') {
                await apiClient(`/superadmin/orgs/${orgId}/allowed-features/${editingItem.id}`, {
                    method: 'PUT',
                    body: { name: editName }
                });
            } else {
                await apiClient(`/superadmin/orgs/${orgId}/permission-categories/${editingItem.id}`, {
                    method: 'PUT',
                    body: { name: editName }
                });
            }
            setIsDialogOpen(false);
            setEditingItem(null);
            fetchData();
        } catch (error) {
            console.error("Failed to save:", error);
            alert("Failed to save changes");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this item? This action affects the organization's database directly.")) return;
        try {
            if (activeTab === 'features') {
                await apiClient(`/superadmin/orgs/${orgId}/allowed-features/${id}`, { method: 'DELETE' });
            } else {
                await apiClient(`/superadmin/orgs/${orgId}/permission-categories/${id}`, { method: 'DELETE' });
            }
            fetchData();
        } catch (error) {
            console.error("Failed to delete:", error);
            alert("Failed to delete item");
        }
    };

    if (!orgId) return <div>Invalid Organization ID</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold">{org?.organization_name || 'Organization'}</h1>
                    <p className="text-gray-500 text-sm">Manage Features & Permissions</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-2">
                    <TabButton active={activeTab === 'features'} onClick={() => setActiveTab('features')}>
                        Allowed Features
                    </TabButton>
                    <TabButton active={activeTab === 'categories'} onClick={() => setActiveTab('categories')}>
                        Permission Categories
                    </TabButton>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading data...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                                <tr>
                                    <th className="px-6 py-3">ID</th>
                                    <th className="px-6 py-3">Code</th>
                                    <th className="px-6 py-3">Name</th>
                                    {activeTab === 'categories' && <th className="px-6 py-3">Sort Order</th>}
                                    <th className="px-6 py-3 text-center">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(activeTab === 'features' ? features : categories).map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-mono text-gray-500">#{item.id}</td>
                                        <td className="px-6 py-3 font-mono text-xs bg-gray-50 rounded px-2 py-1">{item.code}</td>
                                        <td className="px-6 py-3 font-medium text-gray-900">{item.name}</td>
                                        {activeTab === 'categories' && <td className="px-6 py-3 text-gray-500">{item.sort_order}</td>}
                                        <td className="px-6 py-3 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(item, activeTab === 'features' ? 'feature' : 'category')}
                                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${item.status === 'active'
                                                    ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                    : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                                                    }`}
                                            >
                                                {item.status === 'active' ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                                {item.status}
                                            </button>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(item)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit Name"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(activeTab === 'features' ? features : categories).length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold mb-4">Edit {activeTab === 'features' ? 'Feature' : 'Category'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsDialogOpen(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

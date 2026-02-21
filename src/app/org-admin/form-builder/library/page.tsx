"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Edit3, Trash2, ArrowRight, Layout } from 'lucide-react';
import { apiClient } from "@/lib/apiClient";
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function FormLibraryPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await apiClient<any[]>('/form-builder/templates', { method: 'GET', withAuth: true });
            setTemplates(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const filtered = templates.filter(t =>
        !search || t.name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDeleteTemplate = async (id: number) => {
        if (!confirm('Are you sure you want to delete this template? All associated responses will also be removed.')) return;

        try {
            await apiClient.delete(`/form-builder/templates/${id}`, { withAuth: true });
            toast.success('Template deleted');
            fetchTemplates();
        } catch (err) {
            toast.error('Failed to delete template');
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-10">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-4">
                        <Layout className="text-blue-600" size={40} />
                        Forms Library
                    </h1>
                    <p className="text-gray-500 text-lg font-medium">Manage and access all your saved high-fidelity construction forms.</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search forms..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl focus:border-black outline-none transition-all w-80 shadow-sm font-medium"
                        />
                    </div>
                    <button
                        onClick={() => router.push('/org-admin/form-builder/upload')}
                        className="bg-black text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-xl"
                    >
                        <Plus size={20} />
                        New Form
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-gray-50 animate-pulse rounded-[2.5rem] border border-gray-100" />
                    ))}
                </div>
            ) : filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filtered.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all opacity-0 group-hover:opacity-100">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/org-admin/form-builder?id=${template.id}&analyzed=true`)}
                                        className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-inner">
                                <FileText size={32} />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-gray-900 leading-tight pr-10">{template.name}</h3>
                                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-gray-400">
                                    <span className="bg-gray-50 px-3 py-1 rounded-full">{template.type || 'Custom'}</span>
                                    <span>Added {new Date(template.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between items-center group-hover:border-gray-200 transition-colors">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400">
                                            {i}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => router.push(`/org-admin/form-builder?id=${template.id}&analyzed=true`)}
                                    className="flex items-center gap-2 text-sm font-black text-blue-600 group-hover:gap-4 transition-all"
                                >
                                    USE TEMPLATE
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[3rem]">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <Layout size={40} className="text-gray-300" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-gray-900">Your Library is Empty</h3>
                        <p className="text-gray-500 max-w-sm font-medium">Analyze your first construction document to see it appear here in your form library.</p>
                    </div>
                    <button
                        onClick={() => router.push('/org-admin/form-builder/upload')}
                        className="bg-black text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl hover:scale-105"
                    >
                        Analyze Document
                    </button>
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useState } from 'react';
import { BarChart3, FileText, Download, Share2, Search, Filter, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from "@/lib/apiClient";

export default function ReportingAssistantPage() {
    const [responses, setResponses] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchResponses = async () => {
            try {
                const data = await apiClient.get('/form-builder/responses', {}, { withAuth: true });
                setResponses(data);
                if (data.length > 0) setSelectedReport(data[0]);
            } catch (err) {
                toast.error('Failed to load reports');
            } finally {
                setLoading(false);
            }
        };
        fetchResponses();
    }, []);

    const formatDataForPreview = (data: any) => {
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            return Object.entries(parsed).map(([k, v]) => `• ${k}: ${v}`).join('\n');
        } catch {
            return 'Error parsing data';
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <BarChart3 className="text-blue-600" size={32} />
                        Reporting Assistant
                    </h1>
                    <p className="text-gray-500 text-lg">Generate mirrored construction reports from structured data.</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Search reports..." className="pl-12 pr-6 py-3 bg-white border border-gray-100 rounded-2xl focus:border-black outline-none transition-all w-64 shadow-sm" />
                    </div>
                    <button className="p-3 bg-white border border-gray-100 rounded-2xl hover:border-black transition-all shadow-sm">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Reports List */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Recent Submissions</h3>
                    <div className="space-y-3">
                        {responses.map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setSelectedReport(r)}
                                className={`w-full p-6 rounded-3xl border text-left transition-all duration-300 ${selectedReport?.id === r.id ? 'bg-black text-white shadow-xl scale-[1.02] border-transparent' : 'bg-white border-gray-100 hover:border-black'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl ${selectedReport?.id === r.id ? 'bg-white/10' : 'bg-blue-50 text-blue-600'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedReport?.id === r.id ? 'bg-white/20 text-white' : 'bg-green-50 text-green-600'}`}>
                                        DONE
                                    </span>
                                </div>
                                <p className="font-bold text-lg leading-tight">{r.template_name}</p>
                                <div className="mt-4 flex items-center justify-between text-xs opacity-60">
                                    <span>#{r.id}</span>
                                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Report Preview */}
                <div className="lg:col-span-2">
                    {selectedReport ? (
                        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[800px] animate-in slide-in-from-right-8 duration-500">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold text-gray-900">{selectedReport.template_name}</h3>
                                        <p className="text-sm text-gray-500">Previewing generated mirrored document</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-12 overflow-y-auto">
                                <div className="bg-gray-50 p-12 rounded-[2rem] border border-gray-200 shadow-inner font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                                    {formatDataForPreview(selectedReport.data)}
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-100 flex justify-center bg-gray-50/50 gap-4">
                                <button
                                    onClick={async () => {
                                        try {
                                            // 1. Get full detail (including template structure)
                                            const detail = await apiClient.get(`/form-builder/responses/${selectedReport.id}`, {}, { withAuth: true });

                                            // 2. Generate report with REAL detail
                                            const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/form-builder/generate-report`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                },
                                                body: JSON.stringify({
                                                    template: detail.template_fields,
                                                    formData: detail.data
                                                })
                                            });
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `Report_${selectedReport.template_name}_${selectedReport.id}.xlsx`;
                                            a.click();
                                        } catch (err) {
                                            toast.error('Export failed');
                                        }
                                    }}
                                    className="px-8 py-4 bg-black text-white rounded-2xl font-bold shadow-lg hover:bg-gray-800 transition-all"
                                >
                                    Export to Excel (100% Match)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-[2.5rem]">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <FileText size={32} className="text-gray-300" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-gray-900">Select a submission</h3>
                                <p className="text-gray-500 max-w-xs">Pick a document from the list to preview its structured mirrored report.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

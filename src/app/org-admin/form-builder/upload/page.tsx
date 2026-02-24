"use client";

import React, { useState } from 'react';
import { Upload, FileText, ChevronRight, CheckCircle, Loader2, BarChart3, Settings, Download, Layout, Image } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function OrgFormBuilderUpload() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [activeStep, setActiveStep] = useState(1);

    const handleDownloadSample = async () => {
        try {
            let response;
            if (activeStep === 2 && analysisResult) {
                // Generate mirrored template from current analysis result
                response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/form-builder/generate-template`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                    body: JSON.stringify({ layout: analysisResult })
                });
            } else {
                response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/form-builder/download-sample`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = activeStep === 2 ? `Template_${analysisResult.form_name || 'Mirrored'}.xlsx` : 'Construction_Template.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download template');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setIsAnalyzing(true);

            try {
                // Real File Upload to Analyzer
                const formData = new FormData();
                formData.append('file', selectedFile);

                const response: any = await apiClient.post('/form-builder/analyze', formData, { withAuth: true });

                setAnalysisResult(response);
                setActiveStep(2);
                toast.success('Document structure analyzed successfully!');
            } catch (error: any) {
                toast.error(error.message || 'Analysis failed');
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <div className="header flex justify-between items-start">
                <div className="space-y-2">
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Construction Document Analyzer</h1>
                    <p className="text-gray-500 text-lg">Upload your construction templates to automatically extract structural layouts and fields.</p>
                </div>
                <button
                    onClick={handleDownloadSample}
                    className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-3 rounded-2xl font-bold text-gray-700 hover:border-black transition-all shadow-sm"
                >
                    <Download size={18} />
                    Download Sample Excel
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Steps Sidebar */}
                <div className="space-y-4">
                    {[
                        { step: 1, label: 'Upload Template', sub: 'PDF, Excel or Word', icon: Upload },
                        { step: 2, label: 'Review Structure', sub: 'Extracted Sections', icon: FileText },
                        { step: 3, label: 'Finalize & Save', sub: 'Deploy for use', icon: CheckCircle }
                    ].map((s) => (
                        <div key={s.step} className={`p-6 rounded-3xl border transition-all duration-300 ${activeStep === s.step ? 'bg-black text-white shadow-2xl scale-105 border-transparent' : 'bg-white border-gray-100 text-gray-400'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${activeStep === s.step ? 'bg-white/10' : 'bg-gray-50'}`}>
                                    <s.icon size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">Step {s.step}</p>
                                    <p className="text-lg font-bold">{s.label}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {activeStep === 1 && (
                        <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-20 text-center space-y-6 hover:border-black transition-colors group relative overflow-hidden">
                            <input
                                type="file"
                                accept=".pdf,.xlsx,.png,.jpg,.jpeg"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isAnalyzing}
                            />
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto group-hover:bg-black group-hover:text-white transition-all">
                                {isAnalyzing ? <Loader2 className="animate-spin" size={32} /> : <Upload size={32} />}
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Drag & Drop Template</h3>
                                <p className="text-gray-500">or click to browse from your computer</p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                {['PDF', 'XLSX', 'IMAGE'].map(ext => (
                                    <span key={ext} className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-bold text-gray-400">{ext}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeStep === 2 && analysisResult && (
                        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-700">
                            <div className="bg-black p-8 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">Document Layout Preview</h2>
                                    <p className="text-gray-400 text-xs mt-1">Found {analysisResult.sections?.length} lines to be converted into form fields</p>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        onClick={handleDownloadSample}
                                        className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 border border-white/20 transition-all flex items-center gap-2"
                                    >
                                        <Download size={18} />
                                        Mirror to Excel Template
                                    </button>
                                    <button
                                        onClick={() => setActiveStep(3)}
                                        className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg"
                                    >
                                        Confirm Layout & Save
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-12 space-y-2 bg-gray-50 max-h-[600px] overflow-y-auto">
                                {analysisResult.sections?.map((section: any, sIdx: number) => (
                                    <div key={sIdx} className="bg-white border-l-4 border-black p-4 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex flex-wrap gap-6 items-center">
                                            {section.fields?.map((field: any, fIdx: number) => (
                                                <div key={fIdx} className="flex-1 min-w-[200px]">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${field.field_type === 'media' ? 'text-blue-500' : 'text-gray-400'}`}>
                                                            {field.field_type === 'media' ? 'MEDIA' : field.field_type} FIELD
                                                        </span>
                                                        {field.field_type === 'media' && <Image size={12} className="text-blue-500" />}
                                                    </div>
                                                    <div className={`p-3 rounded-xl border ${field.field_type === 'media' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                                        <p className={`font-bold ${field.field_type === 'media' ? 'text-blue-900' : 'text-gray-900'}`}>{field.label}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(!analysisResult.sections || analysisResult.sections.length === 0) && (
                                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                                        <p className="text-gray-400 font-bold">No fields detected. Try another file structure.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-yellow-50 border-t border-yellow-100 flex items-center gap-3">
                                <Settings size={18} className="text-yellow-600" />
                                <p className="text-sm text-yellow-800 font-medium">This layout will be used to generate your digital form. Every field name will be preserved 100%.</p>
                            </div>
                        </div>
                    )}

                    {activeStep === 3 && (
                        <div className="bg-white rounded-[2rem] p-12 text-center space-y-8 animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle size={48} />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-black text-gray-900">Template Ready</h2>
                                <p className="text-gray-500 text-lg">Your template has been added to the library and is ready for data entry.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button
                                    onClick={() => router.push('/org-admin/form-builder/library')}
                                    className="p-6 bg-blue-50 text-blue-800 rounded-3xl border border-blue-100 hover:border-blue-600 transition-all text-left space-y-2 group"
                                >
                                    <div className="p-3 bg-white w-fit rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Layout size={20} /></div>
                                    <p className="font-bold">Forms Library</p>
                                    <p className="text-sm opacity-70">View and manage saved forms</p>
                                </button>
                                <button
                                    onClick={() => router.push('/org-admin/form-builder/reports')}
                                    className="p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-black transition-all text-left space-y-2 group"
                                >
                                    <div className="p-3 bg-white w-fit rounded-2xl group-hover:bg-black group-hover:text-white transition-all"><BarChart3 size={20} /></div>
                                    <p className="font-bold">View Reports</p>
                                    <p className="text-sm text-gray-500">Real-time data insights</p>
                                </button>
                                <button
                                    onClick={() => router.push('/org-admin/form-builder/configuration')}
                                    className="p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:border-black transition-all text-left space-y-2 group"
                                >
                                    <div className="p-3 bg-white w-fit rounded-2xl group-hover:bg-black group-hover:text-white transition-all"><Settings size={20} /></div>
                                    <p className="font-bold">Configuration</p>
                                    <p className="text-sm text-gray-500">Fine-tune form settings</p>
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setAnalysisResult(null);
                                    setActiveStep(1);
                                    setFile(null);
                                }}
                                className="text-blue-600 font-bold hover:underline"
                            >
                                Upload another document
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

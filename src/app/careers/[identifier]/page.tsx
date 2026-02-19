"use client";

import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import {
    Briefcase, MapPin, ArrowRight, Search, Share2, Calendar, ChevronRight, QrCode, Globe, Download, X, Copy, Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '@/lib/apiClient';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import GlobalHeader from '@/components/shared/GlobalHeader';
import GlobalFooter from '@/components/shared/GlobalFooter';

export default function CareerPage() {
    const { identifier } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDept, setSelectedDept] = useState('All Departments');
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchOpenings = async () => {
            try {
                const res = await apiClient.get(`/hr-operation/public/openings/${identifier}`);
                if (res.success) {
                    setData(res.data);
                } else {
                    toast.error(res.message || 'Failed to load openings');
                }
            } catch (err) {
                toast.error('Organization or positions not found');
            } finally {
                setLoading(false);
            }
        };
        fetchOpenings();
    }, [identifier]);

    const copyToClipboard = () => {
        const url = typeof window !== 'undefined' ? window.location.href : '';
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadQRCode = () => {
        const svg = document.getElementById('portal-qr-code');
        if (!svg || !data) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new (window as any).Image();

        img.onload = () => {
            canvas.width = 1200;
            canvas.height = 1600;
            if (!ctx) return;

            const gradient = ctx.createLinearGradient(0, 0, 1200, 1600);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(1, '#f8fafc');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1200, 1600);

            ctx.shadowColor = 'rgba(0,0,0,0.1)';
            ctx.shadowBlur = 40;
            ctx.fillStyle = '#ffffff';
            if (typeof (ctx as any).roundRect === 'function') {
                (ctx as any).roundRect(100, 100, 1000, 1400, 60);
                ctx.fill();
            } else {
                ctx.fillRect(100, 100, 1000, 1400);
                ctx.fill();
            }
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#000000';
            ctx.font = 'bold 80px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(data.organizationName.toUpperCase(), 600, 300);

            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 40px sans-serif';
            ctx.fillText('CAREER PORTAL', 600, 380);

            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#f1f5f9';
            ctx.lineWidth = 2;
            const qrBoxSize = 700;
            const qrX = 250;
            const qrY = 500;

            if (typeof (ctx as any).roundRect === 'function') {
                (ctx as any).roundRect(qrX - 40, qrY - 40, qrBoxSize + 80, qrBoxSize + 80, 40);
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(qrX - 40, qrY - 40, qrBoxSize + 80, qrBoxSize + 80);
            }

            ctx.drawImage(img, qrX, qrY, qrBoxSize, qrBoxSize);

            ctx.fillStyle = '#2563eb';
            ctx.font = 'bold 50px sans-serif';
            ctx.fillText('SCAN TO APPLY', 600, 1350);

            ctx.fillStyle = '#94a3b8';
            ctx.font = '500 30px sans-serif';
            ctx.fillText('Join our world-class team today', 600, 1430);

            const pngFile = canvas.toDataURL("image/png", 1.0);
            const downloadLink = document.createElement("a");
            downloadLink.download = `${data.organizationName}_Official_QR_Portal.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const departments = data?.departments
        ? ['All Departments', ...data.departments]
        : ['All Departments'];

    const filteredOpenings = data?.openings?.filter((o: any) => {
        const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = selectedDept === 'All Departments' || o.department === selectedDept;
        return matchesSearch && matchesDept;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">Portal Loading</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="p-10 bg-white rounded-[32px] shadow-xl border border-gray-100">
                        <Briefcase size={48} className="mx-auto text-gray-200 mb-6" />
                        <h2 className="text-xl font-bold text-gray-900">Portal Not Found</h2>
                        <p className="text-gray-500 mt-2 text-sm">We couldn't locate the requested career portal.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <GlobalHeader role="org-admin" />

            <main className="flex-1">
                {/* Modern Hero Section */}
                <section className="bg-gray-50 border-b border-gray-100 py-20">
                    <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-gray-100 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{data.openings.length} Positions Available</span>
                            </div>
                            <h2 className="text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]">
                                Do more of what <span className="text-blue-600">you love.</span>
                            </h2>
                            <p className="text-lg text-gray-500 font-medium leading-relaxed max-w-xl">
                                Join our mission to build the future of project management and HR excellence.
                                We're looking for passionate individuals to grow with us.
                            </p>

                            <div className="flex flex-wrap gap-8 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-gray-100 shadow-sm"><Globe size={18} className="text-blue-600" /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Environment</p>
                                        <p className="text-sm font-bold">Remote-First</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsShareModalOpen(true)}
                                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        <Share2 size={16} /> Share Portal
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-gray-100 space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b border-gray-50 pb-4">Organization Location</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <MapPin size={24} className="text-blue-600 mt-1 shrink-0" />
                                    <div>
                                        <p className="text-base font-bold text-gray-900">{data.location?.address || 'Headquarters'}</p>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {data.location?.city && `${data.location.city}, `}
                                            {data.location?.country || ''}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-50 flex items-center gap-6">
                                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                                    <QRCodeSVG
                                        id="portal-qr-code"
                                        value={typeof window !== 'undefined' ? window.location.href : ''}
                                        size={80}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                        <QrCode size={14} className="text-blue-600" />
                                        SCAN TO APPLY
                                    </h4>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1 leading-relaxed">
                                        Scan this QR code with your phone to quickly share this portal or apply on the go.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Filter & Job List */}
                <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
                    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col lg:flex-row gap-6 items-center">
                        <div className="flex-1 w-full relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                            <input
                                type="text"
                                placeholder="Search and find your role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-16 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-4 focus:ring-blue-500/5 font-bold transition-all placeholder:text-gray-300"
                            />
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide w-full lg:w-auto px-2">
                            {departments.map((dept) => (
                                <button
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={`px-5 py-3 rounded-xl whitespace-nowrap text-[11px] font-black transition-all border ${selectedDept === dept
                                            ? 'bg-black text-white border-black shadow-lg shadow-black/10'
                                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:text-black'
                                        }`}
                                >
                                    {dept.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 py-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredOpenings.length === 0 ? (
                            <div className="col-span-full text-center py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
                                <Briefcase size={40} className="mx-auto text-gray-100 mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No openings found matching your criteria.</p>
                            </div>
                        ) : (
                            filteredOpenings.map((job: any) => (
                                <div key={job.id} className="group relative bg-white border border-gray-100 p-8 rounded-[32px] hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300">
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <span className="px-3 py-1 bg-gray-50 border border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest rounded-lg">
                                                    {job.type}
                                                </span>
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                                                    {job.department}
                                                </span>
                                            </div>
                                        </div>

                                        <h4 className="text-2xl font-bold text-gray-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">{job.title}</h4>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2 mb-8 flex-1">
                                            {job.description || "Be a part of our core team helping solve complex user problems with clean design and code."}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-y-4 gap-x-6 border-t border-gray-50 pt-6">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                <MapPin size={14} className="text-gray-300" />
                                                {job.location || 'Distributed'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                <span className="text-gray-300 font-bold">$</span>
                                                {job.salary_range || 'Competitive'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 ml-auto">
                                                <Calendar size={14} className="text-gray-300" />
                                                Active Role
                                            </div>
                                        </div>

                                        <div className="mt-8">
                                            <button
                                                onClick={() => window.location.href = `/interview/apply?token=PUBLIC&job=${job.id}&orgId=${data.orgId}`}
                                                className="w-full flex items-center justify-between px-6 py-4 bg-gray-50 group-hover:bg-black group-hover:text-white rounded-2xl transition-all duration-300 font-black text-[10px] tracking-widest uppercase"
                                            >
                                                Apply Now
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <GlobalFooter orgName={data.organizationName} />

            {/* Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}></div>
                    <div className="relative bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">Share Portal</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Spread the word</p>
                            </div>
                            <button onClick={() => setIsShareModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-black">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex flex-col items-center gap-6">
                                <div className="p-8 bg-white rounded-[32px] border border-gray-100 shadow-xl">
                                    <QRCodeSVG
                                        id="portal-qr-code"
                                        value={typeof window !== 'undefined' ? window.location.href : ''}
                                        size={200}
                                        level="H"
                                    />
                                </div>
                                <button onClick={downloadQRCode} className="flex items-center gap-2 text-xs font-black text-blue-600 tracking-widest uppercase hover:underline">
                                    <Download size={16} /> Download Official QR
                                </button>
                            </div>
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Portal Link</p>
                                <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-2xl">
                                    <input readOnly value={typeof window !== 'undefined' ? window.location.href : ''} className="flex-1 bg-transparent px-4 py-2 text-sm font-bold outline-none text-gray-500" />
                                    <button onClick={copyToClipboard} className={`p-3 rounded-xl transition-all ${copied ? 'bg-green-500 text-white' : 'bg-black text-white'}`}>
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

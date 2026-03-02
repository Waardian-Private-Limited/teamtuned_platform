"use client";

import React, { useState, useEffect } from 'react';
import NextImage from 'next/image';
import {
    Briefcase, MapPin, ArrowRight, Search, Share2, Calendar, ChevronRight, QrCode, Globe, Download, X, Copy, Check, Eye, Clock, Award, DollarSign, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [referralToken, setReferralToken] = useState<string | null>(null);

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

        // Extract referral token from URL
        const searchParams = new URLSearchParams(window.location.search);
        const refEmp = searchParams.get('ref_emp');
        if (refEmp) {
            setReferralToken(refEmp);
        }
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
        <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white text-gray-900">
            {/* Minimal Navigation Bar */}
            <nav className="sticky top-0 z-[100] bg-white text-black border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-4"
                    >
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-sm border border-gray-100">
                            <Briefcase size={12} className="text-black" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-black">Careers</span>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-6"
                    >
                        <button
                            onClick={() => setIsShareModalOpen(true)}
                            className="group flex items-center gap-2 text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest transition-all"
                        >
                            <Share2 size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Share</span>
                        </button>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 hidden md:block">Powered by</span>
                            <img
                                src="/assets/LogoBlackText.png"
                                alt="TeamTuned"
                                className="h-6 opacity-80 hover:opacity-100 transition-opacity"
                            />
                        </div>
                    </motion.div>
                </div>
            </nav>

            <main className="flex-1 pb-32">
                {/* Immersive Hero Section */}
                <section className="relative pt-16 pb-20 overflow-hidden bg-white">
                    <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center gap-3 p-2 bg-gray-50 border border-gray-100 rounded-lg shadow-sm mb-6"
                        >
                            {data.logo_url && (
                                <img
                                    src={data.logo_url}
                                    alt={data.organizationName}
                                    className="w-6 h-6 object-contain rounded-sm"
                                />
                            )}
                            <span className="text-xs font-black uppercase tracking-widest text-gray-900">{data.organizationName}</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="text-3xl md:text-3xl font-black tracking-tighter text-gray-900 uppercase mb-4 leading-[1]"
                        >
                            Join the {data.organizationName} Mission
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-base md:text-lg text-gray-400 font-medium max-w-xl mx-auto leading-relaxed"
                        >
                            We're building the infrastructure for the next generation of teams. <br className="hidden md:block" />
                            Help us define the future of coordination and efficiency.
                        </motion.p>
                    </div>

                    {/* Subtle Background Accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none opacity-[0.02]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 2 }}
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-black to-transparent rounded-[100%] blur-[120px]"
                        ></motion.div>
                    </div>
                </section>

                {/* Floating Search & Filter Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="max-w-2xl mx-auto px-6 -mt-8 relative z-20"
                >
                    <div className="bg-white p-1 rounded-lg shadow-xl flex flex-col md:flex-row gap-1 items-center border border-gray-100">
                        <div className="flex-1 w-full relative">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search roles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-14 pr-6 py-3 bg-gray-50 border border-transparent hover:border-gray-200 rounded-md outline-none focus:bg-white focus:border-black/5 transition-all placeholder:text-gray-400 font-bold text-gray-900 text-sm"
                            />
                        </div>
                        <div className="w-full md:w-48 relative">
                            <select
                                value={selectedDept}
                                onChange={(e) => setSelectedDept(e.target.value)}
                                className="w-full px-5 py-3 bg-gray-50 border border-transparent hover:border-gray-200 rounded-md outline-none focus:bg-white focus:border-black/5 transition-all appearance-none text-[10px] text-gray-600 font-black tracking-widest uppercase cursor-pointer"
                            >
                                {departments.map((dept) => (
                                    <option key={dept} value={dept} className="bg-white text-black py-2">
                                        {dept}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Jobs Grid / List */}
                <div className="max-w-5xl mx-auto px-6 py-20">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="flex items-center justify-between mb-12 px-4"
                    >
                        <div className="space-y-1">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Open Positions</h2>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{filteredOpenings.length} Opportunities available</p>
                        </div>
                    </motion.div>

                    <div className="space-y-3">
                        {filteredOpenings.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-24 bg-gray-50/50 rounded-lg border-2 border-dashed border-gray-100 flex flex-col items-center gap-6"
                            >
                                <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <Briefcase size={32} className="text-gray-200" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching roles found</h3>
                                    <p className="text-xs text-gray-400 font-medium">Try adjusting your filters or search terms.</p>
                                </div>
                            </motion.div>
                        ) : (
                            filteredOpenings.map((job: any, index: number) => (
                                <motion.div
                                    key={job.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.05 * index }}
                                    whileHover={{ y: -2 }}
                                    className="group relative bg-white border border-gray-100 p-8 rounded-lg hover:border-gray-200 hover:shadow-sm transition-all duration-300"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-center gap-4">
                                                <span className="px-2 py-1 bg-gray-50 rounded-sm text-[9px] font-black text-gray-400 uppercase tracking-widest transition-colors border border-gray-100">
                                                    {job.department}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest transition-colors">
                                                    <Clock size={12} className="text-gray-300" />
                                                    {job.type}
                                                </div>
                                            </div>

                                            <h4 className="text-xl md:text-2xl font-black text-gray-900 transition-all duration-300 tracking-tight uppercase leading-none">
                                                {job.title}
                                            </h4>

                                            <div className="flex flex-wrap items-center gap-6 text-[11px] font-black text-gray-400 transition-colors uppercase tracking-[0.1em]">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-gray-300" />
                                                    {job.location || 'Pune'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <DollarSign size={14} className="text-gray-300" />
                                                    {job.salary_range || 'Competitive'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => { setSelectedJob(job); setIsDetailsModalOpen(true); }}
                                                className="px-6 py-3 bg-white text-gray-500 rounded-sm hover:text-black hover:bg-gray-50 border border-gray-100 transition-all font-black text-[11px] tracking-widest uppercase flex items-center gap-3"
                                            >
                                                Details
                                            </button>
                                            <button
                                                onClick={() => {
                                                    let url = `/interview/apply?token=PUBLIC&job=${job.id}&orgId=${data.orgId}`;
                                                    if (referralToken) url += `&referred_by=${referralToken}`;
                                                    window.location.href = url;
                                                }}
                                                className="px-8 py-3 bg-black text-white rounded-sm hover:bg-gray-900 transition-all font-black text-[11px] tracking-widest uppercase flex items-center gap-3 shadow-md"
                                            >
                                                Apply <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            <GlobalFooter orgName={data.organizationName} />

            {/* Premium Job Details Modal */}
            <AnimatePresence>
                {isDetailsModalOpen && selectedJob && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setIsDetailsModalOpen(false)}
                        ></motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: 10 }}
                            className="relative bg-white w-full max-w-3xl max-h-[90vh] rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-100"
                        >
                            {/* Modal Header */}
                            <div className="px-10 py-10 border-b border-gray-100 bg-gray-50/50 relative">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="px-2 py-1 bg-black text-white rounded-sm text-[8px] font-black uppercase tracking-widest cursor-default">
                                            {selectedJob.department}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedJob.type}</span>
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">{selectedJob.title}</h3>
                                    <div className="flex items-center gap-6 text-[11px] font-black text-gray-400 uppercase tracking-widest pt-2">
                                        <div className="flex items-center gap-2"><MapPin size={14} className="text-black" /> {selectedJob.location || 'Pune'}</div>
                                        <div className="flex items-center gap-2"><Calendar size={14} className="text-black" /> {new Date(selectedJob.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <button onClick={() => setIsDetailsModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-black hover:text-white rounded-md transition-all duration-300 text-gray-400">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-10 overflow-y-auto flex-1 bg-white">
                                <div className="flex flex-col gap-12">
                                    <section className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-0.5 w-12 bg-black"></div>
                                            <h5 className="text-xs font-black text-gray-900 uppercase tracking-[0.3em]">Role Overview</h5>
                                        </div>
                                        <p className="text-base text-gray-600 font-medium leading-[1.8] whitespace-pre-wrap max-w-2xl">
                                            {selectedJob.description || "No description provided."}
                                        </p>
                                    </section>

                                    {selectedJob.requirements && (
                                        <section className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="h-0.5 w-12 bg-black"></div>
                                                <h5 className="text-xs font-black text-gray-900 uppercase tracking-[0.3em]">Experience Required</h5>
                                            </div>
                                            <div className="p-8 bg-gray-50 rounded-md border border-gray-100">
                                                <p className="text-base text-gray-600 font-medium leading-[1.8] whitespace-pre-wrap">
                                                    {selectedJob.requirements}
                                                </p>
                                            </div>
                                        </section>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-10 py-8 border-t border-gray-100 bg-gray-50/80 flex flex-wrap items-center justify-between gap-4">
                                {selectedJob.jd_url ? (
                                    <button
                                        onClick={() => window.open(selectedJob.jd_url, '_blank')}
                                        className="px-6 py-4 bg-white border border-gray-200 text-black rounded-md hover:bg-black hover:text-white transition-all duration-300 font-black text-[10px] tracking-widest uppercase flex items-center gap-3 shadow-sm"
                                    >
                                        <Download size={16} /> Job Description PDF
                                    </button>
                                ) : (
                                    <div />
                                )}

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsDetailsModalOpen(false)}
                                        className="px-8 py-4 text-gray-400 hover:text-black transition-all font-black text-[10px] tracking-widest uppercase"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            let url = `/interview/apply?token=PUBLIC&job=${selectedJob.id}&orgId=${data.orgId}`;
                                            if (referralToken) url += `&referred_by=${referralToken}`;
                                            window.location.href = url;
                                        }}
                                        className="px-10 py-4 bg-black text-white rounded-md hover:bg-gray-800 transition-all font-black text-[11px] tracking-widest uppercase shadow-xl shadow-black/20"
                                    >
                                        Submit Application
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Share Modal */}
            <AnimatePresence>
                {isShareModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setIsShareModalOpen(false)}
                        ></motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="relative bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col border border-gray-100"
                        >
                            <div className="p-10 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Expand the Team</h3>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Help others find their mission</p>
                                </div>
                                <button onClick={() => setIsShareModalOpen(false)} className="p-3 hover:bg-black hover:text-white rounded-md transition-all duration-300 text-gray-400">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-10 space-y-10">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="p-8 bg-white rounded-md border border-gray-100 shadow-xl">
                                        <QRCodeSVG
                                            id="portal-qr-code"
                                            value={typeof window !== 'undefined' ? window.location.href : ''}
                                            size={200}
                                            level="H"
                                        />
                                    </div>
                                    <button onClick={downloadQRCode} className="flex items-center gap-2 text-[10px] font-black text-black tracking-widest uppercase hover:underline">
                                        <Download size={14} /> Download official asset
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Portal URL</p>
                                    <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-100 rounded-md group">
                                        <input readOnly value={typeof window !== 'undefined' ? window.location.href : ''} className="flex-1 bg-transparent px-4 py-2 text-sm font-bold outline-none text-gray-900 group-hover:text-black transition-colors" />
                                        <button onClick={copyToClipboard} className={`p-4 rounded-md transition-all duration-300 ${copied ? 'bg-green-500 text-white' : 'bg-black text-white hover:scale-95'}`}>
                                            {copied ? <Check size={20} /> : <Copy size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

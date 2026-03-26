"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Receipt, RefreshCw, Download, Search, Filter, X, ChevronDown, ChevronUp,
    CheckCircle, Clock, AlertCircle, DollarSign, Building2, Paperclip, ExternalLink, FileText,
    TrendingUp, ChevronLeft, ChevronRight, Plus, MoreVertical, ThumbsUp, ThumbsDown, Eye, Users
} from "lucide-react";
import { apiClient, getBackendUrl } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import toast, { Toaster } from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Reimbursement {
    id: number;
    employee_id: number;
    employee_name: string;
    emp_code?: string;
    department_name?: string;
    reason: string;
    category: string;
    amount: number;
    attachment_url?: string;
    status: "Pending" | "Approved" | "Rejected";
    payment_status?: "Pending" | "Disbursed";
    cheque_number?: string;
    transaction_number?: string;
    reviewed_by?: string;
    review_notes?: string;
    reviewed_at?: string;
    created_at: string;
}

function formatCurrency(val: number | undefined | null) {
    if (val === undefined || val === null || isNaN(Number(val))) return "₹0";
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(val));
}

function fmtDate(s?: string) {
    if (!s) return "—";
    const date = new Date(s);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function getAttachmentUrl(url?: string) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${getBackendUrl()}${url}`;
}

// ── Status Helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        Pending: "bg-amber-50 text-amber-700 border-amber-200",
        Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
        Rejected: "bg-red-50 text-red-700 border-red-200",
    };
    const icons: Record<string, React.ReactNode> = {
        Pending: <Clock className="w-3 h-3" />,
        Approved: <CheckCircle className="w-3 h-3" />,
        Rejected: <AlertCircle className="w-3 h-3" />,
    };
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {icons[status]}
            {status}
        </span>
    );
}

// ── Category Badge ────────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: string }) {
    const colors: Record<string, string> = {
        Travel: "bg-blue-50 text-blue-700",
        Medical: "bg-rose-50 text-rose-700",
        Food: "bg-orange-50 text-orange-700",
        "Office Supplies": "bg-violet-50 text-violet-700",
        Equipment: "bg-indigo-50 text-indigo-700",
        Training: "bg-teal-50 text-teal-700",
        Other: "bg-gray-100 text-gray-600",
    };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${colors[cat] || colors.Other}`}>{cat}</span>;
}


// ── Add Reimbursement Modal ───────────────────────────────────────────────────
interface AddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    categories: { id: number; name: string }[];
}

function AddReimbursementModal({ isOpen, onClose, onSuccess, categories }: AddModalProps) {
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reason || !amount || !category) {
            toast.error("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("reason", reason);
            formData.append("amount", amount);
            formData.append("category", category);
            if (file) formData.append("attachment", file);

            const res = await apiClient("/reimbursements", {
                method: "POST",
                body: formData,
                withAuth: true,
            }) as any;

            if (res?.success) {
                toast.success("Reimbursement submitted");
                onSuccess();
                onClose();
            } else {
                toast.error(res?.message || "Failed to submit");
            }
        } catch (err: any) {
            toast.error(err.message || "Submission error");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-900">Add Reimbursement</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-100 focus:ring-2 focus:ring-gray-900 transition-all outline-none bg-gray-50"
                            required
                        >
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Amount *</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-100 focus:ring-2 focus:ring-gray-900 transition-all outline-none bg-gray-50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Reason *</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="What is this for?"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-100 focus:ring-2 focus:ring-gray-900 transition-all outline-none resize-none bg-gray-50"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Attachment (Optional)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-lg hover:border-gray-900 transition-colors cursor-pointer relative bg-gray-50/30">
                            <div className="space-y-1 text-center">
                                <Paperclip className="mx-auto h-10 w-10 text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <span className="relative cursor-pointer rounded-md font-medium text-gray-900 hover:text-gray-800">
                                        {file ? file.name : "Upload a file"}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                            </div>
                            <input
                                type="file"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                        </div>
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-gray-200 hover:bg-black transition-all disabled:opacity-50"
                        >
                            {loading ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// ── Action Dropdown ──────────────────────────────────────────────────────────
function ActionDropdown({
    item,
    isHR,
    onApprove,
    onReject,
    onViewAttachment
}: {
    item: Reimbursement;
    isHR: boolean;
    onApprove: (item: Reimbursement) => void;
    onReject: (item: Reimbursement) => void;
    onViewAttachment: (url: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const showReviewActions = isHR && item.status === "Pending";

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-[60] py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                    {item.attachment_url && (
                        <button
                            onClick={() => { onViewAttachment(getAttachmentUrl(item.attachment_url)); setIsOpen(false); }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Eye className="w-4 h-4 text-gray-900" /> View Attachment
                        </button>
                    )}
                    {showReviewActions && (
                        <>
                            <div className="my-1 border-t border-gray-50" />
                            <button
                                onClick={() => { onApprove(item); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-bold uppercase tracking-widest text-[10px]"
                            >
                                <ThumbsUp className="w-4 h-4" /> Approve
                            </button>
                            <button
                                onClick={() => { onReject(item); setIsOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-bold uppercase tracking-widest text-[10px]"
                            >
                                <ThumbsDown className="w-4 h-4" /> Reject
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors font-bold uppercase tracking-widest text-[10px]"
                    >
                        <X className="w-4 h-4" /> Close
                    </button>
                </div>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReimbursementManagement({ isHR = true }: { isHR?: boolean }) {
    const [items, setItems] = useState<Reimbursement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const limit = pageSize;

    // Sites
    const [siteOptions, setSiteOptions] = useState<{ id: number; name: string }[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>("");

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [categoryFilter, setCategoryFilter] = useState<string>("");
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Action modal
    const [actionModal, setActionModal] = useState<{ item: Reimbursement; type: "approve" | "reject" } | null>(null);
    const [actionNote, setActionNote] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Export modal
    const [showExportModal, setShowExportModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Attachment preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Categories
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await apiClient("/reimbursements/categories", { method: "GET", withAuth: true }) as any;
            if (res?.success) setCategories(res.data || []);
        } catch { /* ignore */ }
    }, []);

    const fetchData = useCallback(async (pg = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = { page: String(pg), limit: String(limit) };
            if (statusFilter !== "All") params.status = statusFilter;
            if (categoryFilter) params.category = categoryFilter;
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;
            if (search) params.q = search;
            if (selectedSiteId) params.site_id = selectedSiteId;
            const endpoint = isHR ? "/reimbursements" : "/reimbursements/my";
            const res = await apiClient(endpoint, { method: "GET", params, withAuth: true }) as any;
            if (res?.success) {
                setItems(res.data || []);
                setTotal(res.total || res.data?.length || 0);
            }
        } catch (e: any) {
            setError(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [isHR, statusFilter, categoryFilter, fromDate, toDate, search, selectedSiteId, limit]);

    // Load sites on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
                const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
                setSiteOptions(list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || s.id) })));
            } catch { setSiteOptions([]); }
        })();
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => { fetchData(1); setPage(1); }, [statusFilter, categoryFilter, fromDate, toDate, selectedSiteId]);

    // Stats from loaded data
    const pendingCount = items.filter(i => i.status === "Pending").length;
    const approvedCount = items.filter(i => i.status === "Approved").length;
    const rejectedCount = items.filter(i => i.status === "Rejected").length;
    const approvedTotal = items.filter(i => i.status === "Approved").reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Approval action
    const handleAction = async () => {
        if (!actionModal) return;
        setActionLoading(true);
        try {
            const url = `/reimbursements/${actionModal.item.id}/${actionModal.type}`;
            await apiClient(url, { method: "PUT", body: { review_notes: actionNote }, withAuth: true }) as any;
            showSuccess(`Reimbursement ${actionModal.type}d successfully`);
            setActionModal(null);
            setActionNote("");
            fetchData(page);
        } catch (e: any) {
            showError(e.message || "Action failed");
        } finally {
            setActionLoading(false);
        }
    };

    // Export
    const handleExport = () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";
        const params = new URLSearchParams();
        if (statusFilter !== "All") params.set("status", statusFilter);
        if (fromDate) params.set("from_date", fromDate);
        if (toDate) params.set("to_date", toDate);
        if (selectedSiteId) params.set("site_id", String(selectedSiteId));
        const url = `${base}/reimbursements/export?${params.toString()}&token=${token}`;
        window.open(url, "_blank");
        setShowExportModal(false);
    };

    return (
        <>
            <Toaster position="top-right" />

            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">
                                    {isHR ? "Reimbursements" : "My Reimbursements"}
                                </h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {isHR ? "Review and manage employee reimbursement requests" : "Your submitted reimbursement requests"}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Refresh Button */}
                                <button
                                    onClick={() => fetchData(1)}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Refresh</span>
                                </button>

                                {isHR && (
                                    <button
                                        onClick={() => setShowExportModal(true)}
                                        className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                                    >
                                        <Download className="w-4 h-4" />
                                        <span>Export</span>
                                    </button>
                                )}

                                {!isHR && (
                                    <button
                                        onClick={() => setShowAddModal(true)}
                                        className="px-4 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add Reimbursement</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Stats Cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: "Pending Review", value: pendingCount, icon: <Clock className="w-5 h-5 text-orange-600" />, bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-600", valText: "text-orange-900" },
                            { label: "This Month Approved", value: approvedCount, icon: <CheckCircle className="w-5 h-5 text-green-600" />, bg: "bg-green-50", border: "border-green-100", text: "text-green-600", valText: "text-green-900" },
                            { label: "This Month Rejected", value: rejectedCount, icon: <AlertCircle className="w-5 h-5 text-red-600" />, bg: "bg-red-50", border: "border-red-100", text: "text-red-600", valText: "text-red-900" },
                            { label: "Approved Total", value: formatCurrency(approvedTotal), icon: <TrendingUp className="w-5 h-5 text-violet-600" />, bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600", valText: "text-violet-900" }
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} rounded-xl p-4 border ${s.border}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
                                        <p className={`text-xl font-bold ${s.valText} mt-1`}>{s.value}</p>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        {s.icon}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Filters & Table ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Filter Bar */}
                        <div className="p-4 border-b border-gray-100 flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                {/* Status Tabs */}
                                <div className="flex bg-gray-100 p-1 rounded-xl">
                                    {["All", "Pending", "Approved", "Rejected"].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => { setStatusFilter(s); setPage(1); }}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter === s
                                                ? "bg-gray-900 text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-700"
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-3 flex-1 justify-end">
                                    {/* Site Selection */}
                                    {isHR && siteOptions.length > 0 && (
                                        <div className="relative min-w-[180px]">
                                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <select
                                                value={selectedSiteId}
                                                onChange={(e) => { setSelectedSiteId(e.target.value); setPage(1); }}
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all appearance-none"
                                            >
                                                <option value="">All Sites</option>
                                                {siteOptions.map((s) => (
                                                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                <ChevronDown className="h-4 w-4 text-gray-400" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Search */}
                                    <div className="relative flex-1 max-w-xs">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && fetchData(1)}
                                            placeholder="Search employee, category..."
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>

                                    {/* Advanced Filter Toggle */}
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`p-2 rounded-xl border transition-all ${showFilters
                                            ? "bg-gray-900 border-gray-900 text-white"
                                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        <Filter className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Advanced Filters */}
                            {showFilters && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gray-900"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">From Date</label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">To Date</label>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gray-900"
                                        />
                                    </div>
                                    <div className="flex items-end">
                                        {(categoryFilter || fromDate || toDate) && (
                                            <button
                                                onClick={() => { setCategoryFilter(""); setFromDate(""); setToDate(""); }}
                                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <X className="w-4 h-4" /> Reset Filters
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto relative min-h-[400px]">
                            {loading ? (
                                <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center gap-2">
                                        <RefreshCw className="w-8 h-8 text-gray-900 animate-spin" />
                                        <p className="text-xs font-bold text-gray-900 uppercase tracking-widest">Loading...</p>
                                    </div>
                                </div>
                            ) : error ? (
                                <div className="p-12 text-center text-sm text-red-500 font-medium">{error}</div>
                            ) : items.length === 0 ? (
                                <div className="p-20 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                                        <Receipt className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">No Records Found</h3>
                                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md">
                                        <tr className="border-b border-gray-100">
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Employee</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Category</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Reason</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Amount</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">Reviewed By</th>
                                            <th className="px-5 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 bg-white">
                                        {(() => {
                                            const rendered: React.ReactNode[] = [];
                                            let currentEmpId: number | null = null;
                                            let currentEmpName = "";
                                            let subtotal = 0;

                                            items.forEach((item, index) => {
                                                const isNewEmp = item.employee_id !== currentEmpId;

                                                if (isNewEmp && currentEmpId !== null) {
                                                    rendered.push(
                                                        <tr key={`subtotal-${currentEmpId}`} className="bg-gray-50/30">
                                                            <td colSpan={3} className="px-5 py-2 text-right">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtotal — {currentEmpName}</span>
                                                            </td>
                                                            <td className="px-5 py-2 text-right">
                                                                <span className="text-xs font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                                                            </td>
                                                            <td colSpan={4} className="px-5 py-2"></td>
                                                        </tr>
                                                    );
                                                    subtotal = 0;
                                                }

                                                currentEmpId = item.employee_id;
                                                currentEmpName = item.employee_name;
                                                subtotal += Number(item.amount || 0);

                                                rendered.push(
                                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                                    <Users className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900 leading-none">{item.employee_name}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">
                                                                        {item.emp_code || `ID: ${item.employee_id}`} {item.department_name ? `• ${item.department_name}` : ""}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <CategoryBadge cat={item.category} />
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <p className="text-xs text-gray-600 max-w-[200px] truncate leading-relaxed" title={item.reason}>
                                                                {item.reason}
                                                            </p>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <p className="text-xs font-bold text-gray-900 tracking-tight">{formatCurrency(item.amount)}</p>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                {fmtDate(item.created_at)}
                                                            </p>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <StatusBadge status={item.status} />
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {item.reviewed_by ? (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">{item.reviewed_by}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[120px]" title={item.review_notes}>{item.review_notes}</p>
                                                                    {item.payment_status === "Disbursed" && (
                                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                                            {item.cheque_number && <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-blue-100">Chq: {item.cheque_number}</span>}
                                                                            {item.transaction_number && <span className="bg-violet-50 text-violet-600 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-violet-100">Txn: {item.transaction_number}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <ActionDropdown
                                                                item={item}
                                                                isHR={isHR}
                                                                onApprove={(it) => { setActionModal({ item: it, type: "approve" }); setActionNote(""); }}
                                                                onReject={(it) => { setActionModal({ item: it, type: "reject" }); setActionNote(""); }}
                                                                onViewAttachment={setPreviewUrl}
                                                            />
                                                        </td>
                                                    </tr>
                                                );

                                                if (index === items.length - 1) {
                                                    rendered.push(
                                                        <tr key={`subtotal-last-${currentEmpId}`} className="bg-gray-50/30">
                                                            <td colSpan={3} className="px-5 py-2 text-right">
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtotal — {currentEmpName}</span>
                                                            </td>
                                                            <td className="px-5 py-2 text-right">
                                                                <span className="text-xs font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                                                            </td>
                                                            <td colSpan={4} className="px-5 py-2"></td>
                                                        </tr>
                                                    );
                                                }
                                            });

                                            return rendered;
                                        })()}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {!loading && items.length > 0 && (
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <p className="text-xs font-medium text-gray-500">
                                        Showing <span className="font-bold text-gray-900">{(page - 1) * pageSize + 1}</span> to <span className="font-bold text-gray-900">{Math.min(page * pageSize, total)}</span> of <span className="font-bold text-gray-900">{total}</span> entries
                                    </p>
                                    <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                                        <label className="text-xs font-medium text-gray-500">Show</label>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                            className="bg-white border border-gray-200 rounded-lg text-xs font-bold px-2 py-1 outline-none transition-all focus:border-gray-900"
                                        >
                                            {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => { setPage(p => p - 1); fetchData(page - 1); }}
                                            disabled={page === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-900 hover:border-gray-900 disabled:opacity-30 transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>

                                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                            .map((p, i, arr) => (
                                                <React.Fragment key={p}>
                                                    {i > 0 && arr[i - 1] !== p - 1 && <span className="text-gray-400 px-1">...</span>}
                                                    <button
                                                        onClick={() => { setPage(p); fetchData(p); }}
                                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${p === page
                                                            ? "bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-200"
                                                            : "bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-900"
                                                            }`}
                                                    >
                                                        {p}
                                                    </button>
                                                </React.Fragment>
                                            ))}

                                        <button
                                            onClick={() => { setPage(p => p + 1); fetchData(page + 1); }}
                                            disabled={page === totalPages}
                                            className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-400 hover:text-gray-900 hover:border-gray-900 disabled:opacity-30 transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {/* ── Action Modal ── */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${actionModal.type === "approve" ? "bg-emerald-100" : "bg-red-100"}`}>
                                    {actionModal.type === "approve"
                                        ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        : <X className="w-4 h-4 text-red-600" />}
                                </div>
                                <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                                    {actionModal.type === "approve" ? "Approve" : "Reject"} Reimbursement
                                </h2>
                            </div>
                            <button onClick={() => setActionModal(null)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 text-xs space-y-2.5 border border-gray-100">
                                <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee</span><span className="font-bold text-gray-900">{actionModal.item.employee_name}</span></div>
                                <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</span><span className="font-bold text-gray-900">{actionModal.item.category}</span></div>
                                <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reason</span><span className="text-right max-w-[60%] text-gray-600 font-medium">{actionModal.item.reason}</span></div>
                                <div className="flex justify-between"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</span><span className="text-sm font-black text-gray-900">{formatCurrency(actionModal.item.amount)}</span></div>
                                {actionModal.item.attachment_url && (
                                    <div className="flex justify-between items-center pt-2.5 border-t border-gray-200">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attachment</span>
                                        <button onClick={() => setPreviewUrl(getAttachmentUrl(actionModal.item.attachment_url!))}
                                            className="flex items-center gap-1.5 text-gray-900 hover:text-black font-bold text-[10px] uppercase tracking-widest px-2 py-1.5 bg-white border border-gray-200 rounded-lg transition-colors">
                                            <Paperclip className="w-3 h-3" /> View
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">
                                    {actionModal.type === "reject" ? "Rejection Reason *" : "Notes (optional)"}
                                </label>
                                <textarea value={actionNote} onChange={e => setActionNote(e.target.value)} rows={3}
                                    placeholder={actionModal.type === "reject" ? "Please provide a reason…" : "Add notes if any…"}
                                    className="w-full border border-gray-200 rounded-lg text-xs px-3 py-2 text-gray-700 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900 transition-all resize-none bg-gray-50" />
                            </div>
                        </div>
                        <div className="flex gap-2 p-5 pt-0">
                            <button onClick={() => setActionModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest py-3 rounded-lg hover:bg-gray-50 transition-all">Cancel</button>
                            <button onClick={handleAction} disabled={actionLoading || (actionModal.type === "reject" && !actionNote.trim())}
                                className={`flex-1 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-lg transition-all disabled:opacity-50 ${actionModal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100" : "bg-red-600 hover:bg-red-700 shadow-md shadow-red-100"}`}>
                                {actionLoading ? "…" : actionModal.type === "approve" ? "Confirm Approve" : "Confirm Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Export Modal ── */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-wide">Export Data</h3>
                            <button onClick={() => setShowExportModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Status Filter</label>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gray-900 transition-all">
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">From Date</label>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gray-900 transition-all" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">To Date</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-gray-900 transition-all" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setShowExportModal(false)} className="flex-1 border border-gray-200 rounded-lg py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all">Cancel</button>
                            <button onClick={handleExport} className="flex-1 bg-gray-900 text-white rounded-lg py-3 text-[10px] font-black uppercase tracking-widest hover:bg-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-gray-200">
                                <Download className="w-4 h-4" /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Attachment Preview Modal ── */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white">
                                    <Paperclip className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Attachment Preview</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-900 hover:text-black px-4 py-2 bg-white border border-gray-200 rounded-lg transition-all">
                                    <ExternalLink className="w-3.5 h-3.5" /> Open Full
                                </a>
                                <button onClick={() => setPreviewUrl(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-gray-100/50 min-h-[300px] max-h-[70vh] overflow-auto">
                            {/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(previewUrl) ? (
                                <img src={previewUrl} alt="Attachment" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg border border-white" />
                            ) : /\.pdf(\?|$)/i.test(previewUrl) ? (
                                <iframe src={previewUrl} className="w-full h-[65vh] rounded-lg border border-gray-200 shadow-inner" title="PDF Preview" />
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-12">
                                    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100">
                                        <FileText className="w-16 h-16 text-gray-300" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">No Preview Available</p>
                                        <p className="text-xs text-gray-400 mt-1">This file type must be downloaded to view.</p>
                                    </div>
                                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all shadow-lg shadow-gray-200">
                                        <Download className="w-4 h-4" /> Download File
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <AddReimbursementModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={() => fetchData(1)}
                categories={categories}
            />
        </>
    );
}

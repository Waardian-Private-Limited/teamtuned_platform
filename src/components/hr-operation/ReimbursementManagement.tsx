"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    Receipt, RefreshCw, Download, Search, Filter, X, ChevronDown, ChevronUp,
    CheckCircle, Clock, AlertCircle, DollarSign, Building2, Paperclip, ExternalLink, FileText,
    TrendingUp, ChevronLeft, ChevronRight
} from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { Toaster } from "react-hot-toast";

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
    reviewed_by?: string;
    review_notes?: string;
    reviewed_at?: string;
    created_at: string;
}

function formatCurrency(val: number | undefined | null) {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function fmtDate(s?: string) {
    return s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
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

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ReimbursementManagement({ isHR = true }: { isHR?: boolean }) {
    const [items, setItems] = useState<Reimbursement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;

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

    // Attachment preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
    }, []);

    useEffect(() => { fetchData(1); setPage(1); }, [statusFilter, categoryFilter, fromDate, toDate, selectedSiteId]);

    // Stats from loaded data
    const pendingCount = items.filter(i => i.status === "Pending").length;
    const approvedTotal = items.filter(i => i.status === "Approved").reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

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
        const url = `${base}/reimbursements/export?${params}&token=${token}`;
        window.open(url, "_blank");
        setShowExportModal(false);
    };

    return (
        <>
            <Toaster position="top-right" />

            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                {isHR ? "Reimbursements" : "My Reimbursements"}
                            </h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {isHR ? "Review and manage employee reimbursement requests" : "Your submitted reimbursement requests"}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isHR && (
                                <button
                                    onClick={() => setShowExportModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all text-sm font-medium"
                                >
                                    <Download className="w-4 h-4" />
                                    Export
                                </button>
                            )}
                            <button
                                onClick={() => fetchData(page)}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all text-sm font-medium"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* ── Stats ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { label: "Total Requests", value: String(total), sub: "all submissions", icon: <Receipt className="w-5 h-5 text-violet-600" />, border: "border-l-violet-500", iconBg: "bg-violet-50" },
                            { label: "Pending Review", value: String(pendingCount), sub: "awaiting decision", icon: <Clock className="w-5 h-5 text-amber-600" />, border: "border-l-amber-500", iconBg: "bg-amber-50" },
                            { label: "Approved Total", value: formatCurrency(approvedTotal), sub: `of ${formatCurrency(totalAmount)} requested`, icon: <TrendingUp className="w-5 h-5 text-emerald-600" />, border: "border-l-emerald-500", iconBg: "bg-emerald-50" },
                        ].map(s => (
                            <div key={s.label} className={`bg-white border border-gray-200 border-l-4 ${s.border} rounded-xl p-5 flex items-center justify-between shadow-sm`}>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                                    <p className="text-xl font-bold text-gray-900 mt-1">{s.value}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                                </div>
                                <div className={`p-2.5 ${s.iconBg} rounded-xl`}>{s.icon}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── Filters & Table ── */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Filter Bar */}
                        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-gray-100">
                            {/* Status tabs */}
                            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                                {["All", "Pending", "Approved", "Rejected"].map(s => (
                                    <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${statusFilter === s ? "bg-gray-900 text-white shadow" : "text-gray-500 hover:text-gray-800"}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>

                            {/* Site filter */}
                            {isHR && siteOptions.length > 0 && (
                                <select value={selectedSiteId} onChange={e => { setSelectedSiteId(e.target.value); setPage(1); }}
                                    className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 outline-none focus:ring-2 focus:ring-violet-500">
                                    <option value="">All Sites</option>
                                    {siteOptions.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                                </select>
                            )}

                            {/* Search */}
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
                                <Search className="w-3.5 h-3.5 text-gray-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && fetchData(1)}
                                    placeholder="Search employee, reason…"
                                    className="bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none flex-1" />
                            </div>

                            {/* Advanced filter toggle */}
                            <button onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
                                <Filter className="w-3.5 h-3.5" />
                                Date / Category
                                {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {showFilters && (
                            <div className="flex flex-wrap gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/60">
                                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-violet-500">
                                    <option value="">All Categories</option>
                                    {["Travel", "Medical", "Food", "Office Supplies", "Equipment", "Training", "Other"].map(c =>
                                        <option key={c} value={c}>{c}</option>)}
                                </select>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">From</span>
                                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                        className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-violet-500" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">To</span>
                                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                                        className="text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-violet-500" />
                                </div>
                                {(categoryFilter || fromDate || toDate) && (
                                    <button onClick={() => { setCategoryFilter(""); setFromDate(""); setToDate(""); }}
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-2">
                                        <X className="w-3.5 h-3.5" /> Clear
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Table */}
                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="p-8 flex items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="p-8 text-center text-sm text-red-500">{error}</div>
                            ) : items.length === 0 ? (
                                <div className="p-12 flex flex-col items-center gap-3">
                                    <div className="p-4 bg-gray-100 rounded-full"><Receipt className="w-8 h-8 text-gray-400" /></div>
                                    <p className="text-sm font-medium text-gray-500">No reimbursements found</p>
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            <th className="px-4 py-3 text-left">Employee</th>
                                            <th className="px-4 py-3 text-left">Category</th>
                                            <th className="px-4 py-3 text-left">Reason</th>
                                            <th className="px-4 py-3 text-right">Amount</th>
                                            <th className="px-4 py-3 text-left">Date</th>
                                            <th className="px-4 py-3 text-left">Status</th>
                                            <th className="px-4 py-3 text-center">Attach</th>
                                            <th className="px-4 py-3 text-left">Reviewed By</th>
                                            {isHR && <th className="px-4 py-3 text-center">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {items.map(item => (
                                            <tr key={item.id} className="hover:bg-gray-50/60 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900">{item.employee_name}</div>
                                                    <div className="text-[10px] text-gray-400">{item.emp_code || ""}{item.department_name ? ` · ${item.department_name}` : ""}</div>
                                                </td>
                                                <td className="px-4 py-3"><CategoryBadge cat={item.category} /></td>
                                                <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={item.reason}>{item.reason}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(item.created_at)}</td>
                                                <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.attachment_url ? (
                                                        <button onClick={() => setPreviewUrl(item.attachment_url!)}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors">
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {item.reviewed_by ? (
                                                        <div>
                                                            <div>{item.reviewed_by}</div>
                                                            {item.review_notes && <div className="text-gray-400 truncate max-w-[120px]" title={item.review_notes}>{item.review_notes}</div>}
                                                        </div>
                                                    ) : "—"}
                                                </td>
                                                {isHR && (
                                                    <td className="px-4 py-3">
                                                        {item.status === "Pending" ? (
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button onClick={() => { setActionModal({ item, type: "approve" }); setActionNote(""); }}
                                                                    className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                                                                    <CheckCircle className="w-3 h-3" /> Approve
                                                                </button>
                                                                <button onClick={() => { setActionModal({ item, type: "reject" }); setActionNote(""); }}
                                                                    className="flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                                                                    <X className="w-3 h-3" /> Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 text-center block">—</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {!loading && total > 0 && (
                            <div className="px-4 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-semibold text-gray-800">{(page - 1) * limit + 1}–{Math.min(page * limit, total)}</span>{" "}
                                    of <span className="font-semibold text-gray-800">{total}</span> requests
                                </p>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setPage(p => p - 1); fetchData(page - 1); }} disabled={page === 1}
                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                        </button>
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                            return (
                                                <button key={p} onClick={() => { setPage(p); fetchData(p); }}
                                                    className={`w-8 h-8 text-xs font-semibold rounded-xl border transition-all ${p === page ? "bg-gray-900 text-white border-gray-900 shadow-sm" : "border-gray-200 hover:bg-gray-50 text-gray-700"}`}>
                                                    {p}
                                                </button>
                                            );
                                        })}
                                        <button onClick={() => { setPage(p => p + 1); fetchData(page + 1); }} disabled={page === totalPages}
                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors">
                                            Next <ChevronRight className="w-3.5 h-3.5" />
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
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
                            <button onClick={() => setActionModal(null)}><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-3 text-xs space-y-1.5">
                                <div className="flex justify-between"><span className="text-gray-500">Employee</span><span className="font-bold">{actionModal.item.employee_name}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{actionModal.item.category}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Reason</span><span className="text-right max-w-[60%] text-gray-700">{actionModal.item.reason}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-black">{formatCurrency(actionModal.item.amount)}</span></div>
                                {actionModal.item.attachment_url && (
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                        <span className="text-gray-500">Attachment</span>
                                        <button onClick={() => setPreviewUrl(actionModal.item.attachment_url!)}
                                            className="flex items-center gap-1.5 text-violet-600 hover:text-violet-800 font-medium px-2 py-1 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors">
                                            <Paperclip className="w-3 h-3" /> View
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    {actionModal.type === "reject" ? "Rejection Reason *" : "Notes (optional)"}
                                </label>
                                <textarea value={actionNote} onChange={e => setActionNote(e.target.value)} rows={3}
                                    placeholder={actionModal.type === "reject" ? "Please provide a reason…" : "Add notes if any…"}
                                    className="mt-1.5 w-full border border-gray-200 rounded-xl text-xs px-3 py-2 text-gray-700 placeholder-gray-400 outline-none focus:border-violet-400 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-2 p-5 pt-0">
                            <button onClick={() => setActionModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-xs font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-gray-50">Cancel</button>
                            <button onClick={handleAction} disabled={actionLoading || (actionModal.type === "reject" && !actionNote.trim())}
                                className={`flex-1 text-white text-xs font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors disabled:opacity-50 ${actionModal.type === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>
                                {actionLoading ? "…" : actionModal.type === "approve" ? "Confirm Approve" : "Confirm Reject"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Export Modal ── */}
            {showExportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-black text-gray-900">Export Reimbursements</h3>
                            <button onClick={() => setShowExportModal(false)}><X className="w-4 h-4 text-gray-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Status Filter</label>
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none">
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">From Date</label>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">To Date</label>
                                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setShowExportModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                            <button onClick={handleExport} className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Download Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Attachment Preview Modal ── */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-violet-600" />
                                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Attachment</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium px-3 py-1.5 bg-violet-50 rounded-lg">
                                    <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                                </a>
                                <button onClick={() => setPreviewUrl(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                                    <X className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px] max-h-[70vh] overflow-auto">
                            {/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(previewUrl) ? (
                                <img src={previewUrl} alt="Attachment" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow" />
                            ) : /\.pdf(\?|$)/i.test(previewUrl) ? (
                                <iframe src={previewUrl} className="w-full h-[65vh] rounded-lg" title="PDF Preview" />
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-8">
                                    <div className="p-5 bg-gray-100 rounded-2xl">
                                        <FileText className="w-12 h-12 text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500">This file type cannot be previewed directly.</p>
                                    <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700">
                                        <ExternalLink className="w-4 h-4" /> Download / Open
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

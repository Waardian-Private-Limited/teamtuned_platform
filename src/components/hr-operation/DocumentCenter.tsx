"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Search, Users, FileText, Download, Mail, Loader2, ChevronLeft,
    ChevronRight, CheckCircle, Building, Briefcase, Calendar, Filter,
    FileCheck, FilePlus, FileSignature, RefreshCw, X
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    employee_code?: string;
    designation?: string;
    department_name?: string;
    joining_date?: string;
    site_name?: string;
    status: string;
    profile_image_url?: string;
    salary?: number;
}

type DocType = "appointment" | "offer" | "joining";

interface DocConfig {
    type: DocType;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    color: string;
    bg: string;
    border: string;
    iconBg: string;
}

const DOC_TYPES: DocConfig[] = [
    {
        type: "appointment",
        label: "Appointment Letter",
        description: "Official confirmation of employment with terms & conditions",
        icon: FileCheck,
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        iconBg: "bg-blue-100",
    },
    {
        type: "offer",
        label: "Offer Letter",
        description: "Formal offer with CTC, designation, and joining details",
        icon: FilePlus,
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        iconBg: "bg-emerald-100",
    },
    {
        type: "joining",
        label: "Joining Letter",
        description: "Welcome letter with employee code, checklist, and joining date",
        icon: FileSignature,
        color: "text-violet-700",
        bg: "bg-violet-50",
        border: "border-violet-200",
        iconBg: "bg-violet-100",
    },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DocumentCenter() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("active");
    const [pagination, setPagination] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });

    // Per-row per-type generating state: `${empId}-${type}`
    const [generating, setGenerating] = useState<Record<string, boolean>>({});
    const [emailing, setEmailing] = useState<Record<string, boolean>>({});

    // Modal for confirming email send
    const [emailModal, setEmailModal] = useState<{ emp: Employee; type: DocType } | null>(null);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";

    const getAuthHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch { }
        return headers;
    }, []);

    const fetchEmployees = useCallback(async (pg = pagination.page) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pg),
                limit: String(pagination.limit),
                status: statusFilter,
                search,
            });
            const res = await fetch(`${API_BASE}/document-center/employees?${params}`, {
                credentials: "include",
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                setEmployees(data.data || []);
                setPagination(p => ({ ...p, ...data.pagination }));
            }
        } catch {
            toast.error("Failed to load employees");
        } finally {
            setLoading(false);
        }
    }, [API_BASE, getAuthHeaders, pagination.limit, statusFilter, search]);

    useEffect(() => { fetchEmployees(1); }, [statusFilter]);

    const handleGenerate = useCallback(async (emp: Employee, type: DocType, sendEmail = false) => {
        const key = `${emp.id}-${type}`;
        const setFn = sendEmail ? setEmailing : setGenerating;
        setFn(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch(`${API_BASE}/document-center/employees/${emp.id}/generate`, {
                method: "POST",
                credentials: "include",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ type, send_email: sendEmail }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || "Failed to generate document");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const nameSlug = `${emp.first_name}-${emp.last_name}`.replace(/\s+/g, "-");
            a.download = `${type}-letter-${nameSlug}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(sendEmail
                ? `${type.charAt(0).toUpperCase() + type.slice(1)} letter downloaded & emailed to ${emp.email}`
                : `${type.charAt(0).toUpperCase() + type.slice(1)} letter downloaded`
            );
            if (sendEmail) setEmailModal(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to generate document");
        } finally {
            setFn(prev => ({ ...prev, [key]: false }));
        }
    }, [API_BASE, getAuthHeaders]);

    const totalGenerated = 0; // could be tracked via a counter if needed

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/25">
                            <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Document Center</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Generate & email professional HR letters with organization letterhead</p>
                        </div>
                    </div>
                </div>

                {/* ── Doc Type Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {DOC_TYPES.map(doc => (
                        <div key={doc.type} className={`flex items-start gap-4 p-4 rounded-xl border ${doc.bg} ${doc.border}`}>
                            <div className={`p-2.5 ${doc.iconBg} rounded-lg flex-shrink-0`}>
                                <doc.icon className={`w-5 h-5 ${doc.color}`} />
                            </div>
                            <div>
                                <p className={`text-sm font-semibold ${doc.color}`}>{doc.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{doc.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && fetchEmployees(1)}
                                placeholder="Search employees by name, code, or designation..."
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        >
                            <option value="active">Active Employees</option>
                            <option value="inactive">Inactive Employees</option>
                            <option value="all">All Employees</option>
                        </select>
                        <button
                            onClick={() => fetchEmployees(1)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all shadow-sm"
                        >
                            <Filter className="w-4 h-4" />
                            Search
                        </button>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            Employees
                            {!loading && <span className="text-xs font-normal text-gray-500 ml-1">({pagination.totalItems} total)</span>}
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                    <th className="px-6 py-3.5 text-left">Employee</th>
                                    <th className="px-6 py-3.5 text-left">Designation / Dept</th>
                                    <th className="px-6 py-3.5 text-left">Joining Date</th>
                                    <th className="px-6 py-3.5 text-center">Appointment</th>
                                    <th className="px-6 py-3.5 text-center">Offer</th>
                                    <th className="px-6 py-3.5 text-center">Joining</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            {Array.from({ length: 6 }).map((__, j) => (
                                                <td key={j} className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-full" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : employees.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-gray-100 rounded-full">
                                                    <Users className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-500">No employees found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    employees.map(emp => (
                                        <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors group">
                                            {/* Employee */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {emp.profile_image_url ? (
                                                        <img src={emp.profile_image_url} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm ring-1 ring-gray-200" alt="" />
                                                    ) : (
                                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                            {emp.first_name?.[0]}{emp.last_name?.[0]}
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 truncate">{emp.first_name} {emp.last_name}</p>
                                                        <p className="text-xs text-gray-400">{emp.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Designation */}
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-gray-700">{emp.designation || "—"}</p>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <Building className="w-3 h-3" /> {emp.department_name || emp.site_name || "—"}
                                                </p>
                                            </td>
                                            {/* Joining Date */}
                                            <td className="px-6 py-4">
                                                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                    {emp.joining_date ? new Date(emp.joining_date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                                </p>
                                            </td>
                                            {/* Action columns per doc type */}
                                            {DOC_TYPES.map(doc => {
                                                const dlKey = `${emp.id}-${doc.type}`;
                                                const emailKey = `${emp.id}-${doc.type}`;
                                                const isGenning = generating[dlKey];
                                                const isEmailing = emailing[emailKey];
                                                return (
                                                    <td key={doc.type} className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleGenerate(emp, doc.type, false)}
                                                                disabled={isGenning || isEmailing}
                                                                title={`Download ${doc.label}`}
                                                                className={`p-2 rounded-lg border transition-all ${doc.bg} ${doc.border} ${doc.color} hover:shadow-sm disabled:opacity-40`}
                                                            >
                                                                {isGenning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                                            </button>
                                                            <button
                                                                onClick={() => emp.email ? setEmailModal({ emp, type: doc.type }) : toast.error("No email address for this employee")}
                                                                disabled={isGenning || isEmailing}
                                                                title={`Email ${doc.label}`}
                                                                className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-all disabled:opacity-40"
                                                            >
                                                                {isEmailing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination bar ── */}
                    {!loading && pagination.totalItems > 0 && (
                        <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            {/* Left: record info */}
                            <p className="text-xs text-gray-500">
                                Showing{" "}
                                <span className="font-semibold text-gray-800">
                                    {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                                </span>{" "}
                                of <span className="font-semibold text-gray-800">{pagination.totalItems}</span> employees
                            </p>

                            {/* Centre: page buttons */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    {/* Prev */}
                                    <button
                                        onClick={() => { const p = pagination.page - 1; setPagination(prev => ({ ...prev, page: p })); fetchEmployees(p); }}
                                        disabled={pagination.page === 1}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                    </button>

                                    {/* Page number pills */}
                                    {(() => {
                                        const total = pagination.totalPages;
                                        const cur = pagination.page;
                                        const pages: (number | '…')[] = [];
                                        if (total <= 7) {
                                            for (let i = 1; i <= total; i++) pages.push(i);
                                        } else {
                                            pages.push(1);
                                            if (cur > 3) pages.push('…');
                                            for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
                                            if (cur < total - 2) pages.push('…');
                                            pages.push(total);
                                        }
                                        return pages.map((p, i) =>
                                            p === '…' ? (
                                                <span key={`e-${i}`} className="px-1.5 text-gray-400 text-xs">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => { setPagination(prev => ({ ...prev, page: p as number })); fetchEmployees(p as number); }}
                                                    className={`w-8 h-8 text-xs font-semibold rounded-lg border transition-all ${p === cur
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        );
                                    })()}

                                    {/* Next */}
                                    <button
                                        onClick={() => { const p = pagination.page + 1; setPagination(prev => ({ ...prev, page: p })); fetchEmployees(p); }}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                    >
                                        Next <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Right: per-page selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">Per page</span>
                                <select
                                    value={pagination.limit}
                                    onChange={e => {
                                        const newLimit = Number(e.target.value);
                                        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                                        fetchEmployees(1);
                                    }}
                                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                >
                                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Email Confirmation Modal ── */}
            {emailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-amber-100 rounded-xl">
                                    <Mail className="w-5 h-5 text-amber-700" />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900">Send & Download</h3>
                                    <p className="text-xs text-gray-500">
                                        {DOC_TYPES.find(d => d.type === emailModal.type)?.label}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setEmailModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                                    {emailModal.emp.first_name?.[0]}{emailModal.emp.last_name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{emailModal.emp.first_name} {emailModal.emp.last_name}</p>
                                    <p className="text-xs text-blue-600">{emailModal.emp.email}</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600">
                            This will generate the <strong>{DOC_TYPES.find(d => d.type === emailModal.type)?.label}</strong> as a PDF,
                            download it to your device, and also send it to the employee's email address.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setEmailModal(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleGenerate(emailModal.emp, emailModal.type, true)}
                                disabled={!!emailing[`${emailModal.emp.id}-${emailModal.type}`]}
                                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-medium hover:bg-amber-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {emailing[`${emailModal.emp.id}-${emailModal.type}`]
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                    : <><Mail className="w-4 h-4" /> Send & Download</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

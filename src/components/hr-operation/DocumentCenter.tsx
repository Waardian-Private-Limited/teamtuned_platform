"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Search, Users, FileText, Download, Mail, Loader2, ChevronLeft,
    ChevronRight, CheckCircle, Building, Calendar, Filter,
    FileCheck, FilePlus, FileSignature, X, PenTool, Upload, Trash2,
    CheckCircle2, AlertCircle, Image as ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    gender?: string;
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

interface SignatureConfig {
    signature_url: string | null;
    signatory_name: string | null;
    signatory_designation: string | null;
}

interface OfferModalState {
    emp: Employee;
    isEmail: boolean;
    interviewDate: string;
    joiningDate: string;
    issueDate: string;
}

function toInputDate(dateStr?: string | null): string {
    if (!dateStr) return "";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
    } catch {
        return "";
    }
}

function getTodayInput(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
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

    // Digital Signature State
    const [signatureConfig, setSignatureConfig] = useState<SignatureConfig>({
        signature_url: null,
        signatory_name: null,
        signatory_designation: null,
    });
    const [signatureModalOpen, setSignatureModalOpen] = useState(false);
    const [includeSignature, setIncludeSignature] = useState(true);
    const [signatureFile, setSignatureFile] = useState<File | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [signatoryNameInput, setSignatoryNameInput] = useState("");
    const [signatoryDesignationInput, setSignatoryDesignationInput] = useState("");
    const [savingSignature, setSavingSignature] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Per-row per-type generating state: `${empId}-${type}`
    const [generating, setGenerating] = useState<Record<string, boolean>>({});
    const [emailing, setEmailing] = useState<Record<string, boolean>>({});

    // Modal for confirming email send
    const [emailModal, setEmailModal] = useState<{ emp: Employee; type: DocType } | null>(null);

    // Modal for Offer Letter dates (Final Interview Date & Joining Date)
    const [offerModal, setOfferModal] = useState<OfferModalState | null>(null);

    const openOfferModal = useCallback((emp: Employee, isEmail = false) => {
        const today = getTodayInput();
        const currentJoining = toInputDate(emp.joining_date) || today;
        setOfferModal({
            emp,
            isEmail,
            interviewDate: today,
            joiningDate: currentJoining,
            issueDate: today,
        });
    }, []);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002/api/v1";

    const getAuthHeaders = useCallback((): Record<string, string> => {
        const headers: Record<string, string> = { "ngrok-skip-browser-warning": "true" };
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch { }
        return headers;
    }, []);

    // Fetch signature settings from backend
    const fetchSignatureSettings = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/document-center/signature`, {
                credentials: "include",
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success && data.data) {
                setSignatureConfig(data.data);
                setSignaturePreview(data.data.signature_url || null);
                setSignatoryNameInput(data.data.signatory_name || "");
                setSignatoryDesignationInput(data.data.signatory_designation || "");
            }
        } catch (err) {
            console.error("Failed to fetch signature settings:", err);
        }
    }, [API_BASE, getAuthHeaders]);

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

    useEffect(() => { 
        fetchEmployees(1); 
        fetchSignatureSettings();
    }, [statusFilter, fetchSignatureSettings]);

    const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file (PNG, JPG, or WebP)");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image file size should be less than 5MB");
            return;
        }

        setSignatureFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setSignaturePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveSignature = async () => {
        setSavingSignature(true);
        try {
            let res;
            if (signatureFile) {
                const formData = new FormData();
                formData.append("signature", signatureFile);
                if (signatoryNameInput) formData.append("signatory_name", signatoryNameInput);
                if (signatoryDesignationInput) formData.append("signatory_designation", signatoryDesignationInput);

                res = await fetch(`${API_BASE}/document-center/signature`, {
                    method: "POST",
                    credentials: "include",
                    headers: getAuthHeaders(),
                    body: formData,
                });
            } else {
                res = await fetch(`${API_BASE}/document-center/signature`, {
                    method: "POST",
                    credentials: "include",
                    headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({
                        signature_url: signaturePreview,
                        signatory_name: signatoryNameInput,
                        signatory_designation: signatoryDesignationInput,
                    }),
                });
            }

            const data = await res.json();
            if (data.success) {
                toast.success("Digital signature updated successfully");
                setSignatureConfig(data.data);
                setSignatureModalOpen(false);
                setSignatureFile(null);
            } else {
                throw new Error(data.message || "Failed to save signature");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to save signature");
        } finally {
            setSavingSignature(false);
        }
    };

    const handleRemoveSignature = async () => {
        if (!confirm("Are you sure you want to remove the digital signature?")) return;
        setSavingSignature(true);
        try {
            const res = await fetch(`${API_BASE}/document-center/signature`, {
                method: "DELETE",
                credentials: "include",
                headers: getAuthHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("Digital signature removed");
                setSignatureConfig({ signature_url: null, signatory_name: null, signatory_designation: null });
                setSignaturePreview(null);
                setSignatureFile(null);
                setSignatureModalOpen(false);
            }
        } catch {
            toast.error("Failed to remove signature");
        } finally {
            setSavingSignature(false);
        }
    };

    const handleGenerate = useCallback(async (
        emp: Employee, 
        type: DocType, 
        sendEmail = false,
        extraData?: {
            interview_date?: string;
            joining_date?: string;
            issue_date?: string;
        }
    ) => {
        if (type === "offer" && !extraData) {
            openOfferModal(emp, sendEmail);
            return;
        }

        const key = `${emp.id}-${type}`;
        const setFn = sendEmail ? setEmailing : setGenerating;
        setFn(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch(`${API_BASE}/document-center/employees/${emp.id}/generate`, {
                method: "POST",
                credentials: "include",
                headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    type, 
                    send_email: sendEmail,
                    include_signature: includeSignature,
                    ...(extraData || {})
                }),
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
            setOfferModal(null);
        } catch (err: any) {
            toast.error(err.message || "Failed to generate document");
        } finally {
            setFn(prev => ({ ...prev, [key]: false }));
        }
    }, [API_BASE, getAuthHeaders, includeSignature, openOfferModal]);

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

                    {/* Digital Signature Action Button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setSignaturePreview(signatureConfig.signature_url);
                                setSignatoryNameInput(signatureConfig.signatory_name || "");
                                setSignatoryDesignationInput(signatureConfig.signatory_designation || "");
                                setSignatureFile(null);
                                setSignatureModalOpen(true);
                            }}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-gray-200 hover:border-blue-400 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-600 shadow-sm transition-all group"
                        >
                            <div className={`w-2.5 h-2.5 rounded-full ${signatureConfig.signature_url ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-400 ring-2 ring-amber-200'}`} />
                            <PenTool className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                            <span>Digital Signature</span>
                            {signatureConfig.signature_url ? (
                                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-medium border border-emerald-200">
                                    Active
                                </span>
                            ) : (
                                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium border border-amber-200">
                                    Not Set
                                </span>
                            )}
                        </button>
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

                {/* ── Filters & Options ── */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
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

                    {/* Signature attachment toggle bar */}
                    <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-gray-700 font-medium">
                            <input
                                type="checkbox"
                                checked={includeSignature}
                                onChange={e => setIncludeSignature(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span>Include digital signature automatically on all generated letters</span>
                        </label>
                        {signatureConfig.signature_url ? (
                            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Signature attached: {signatureConfig.signatory_designation || signatureConfig.signatory_name || "Authorized Signatory"}
                            </span>
                        ) : (
                            <span className="text-amber-600 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                No signature configured. <button onClick={() => setSignatureModalOpen(true)} className="underline hover:text-amber-800 font-medium">Add one now</button>
                            </span>
                        )}
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
                                    employees.map(emp => {
                                        const salutation = emp.gender?.toLowerCase() === 'female' ? 'Ms.' : (emp.gender?.toLowerCase() === 'male' ? 'Mr.' : '');
                                        return (
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
                                                            <p className="font-semibold text-gray-900 truncate">
                                                                {salutation ? <span className="text-gray-500 font-normal mr-1">{salutation}</span> : null}
                                                                {emp.first_name} {emp.last_name}
                                                            </p>
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
                                                                    onClick={() => {
                                                                        if (doc.type === "offer") {
                                                                            openOfferModal(emp, false);
                                                                        } else {
                                                                            handleGenerate(emp, doc.type, false);
                                                                        }
                                                                    }}
                                                                    disabled={isGenning || isEmailing}
                                                                    title={`Download ${doc.label}${includeSignature && signatureConfig.signature_url ? ' (with digital signature)' : ''}`}
                                                                    className={`p-2 rounded-lg border transition-all ${doc.bg} ${doc.border} ${doc.color} hover:shadow-sm disabled:opacity-40`}
                                                                >
                                                                    {isGenning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        if (!emp.email) {
                                                                            toast.error("No email address for this employee");
                                                                            return;
                                                                        }
                                                                        if (doc.type === "offer") {
                                                                            openOfferModal(emp, true);
                                                                        } else {
                                                                            setEmailModal({ emp, type: doc.type });
                                                                        }
                                                                    }}
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
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Pagination bar ── */}
                    {!loading && pagination.totalItems > 0 && (
                        <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-gray-500">
                                Showing{" "}
                                <span className="font-semibold text-gray-800">
                                    {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                                </span>{" "}
                                of <span className="font-semibold text-gray-800">{pagination.totalItems}</span> employees
                            </p>

                            {pagination.totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => { const p = pagination.page - 1; setPagination(prev => ({ ...prev, page: p })); fetchEmployees(p); }}
                                        disabled={pagination.page === 1}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                    </button>

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

                                    <button
                                        onClick={() => { const p = pagination.page + 1; setPagination(prev => ({ ...prev, page: p })); fetchEmployees(p); }}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                    >
                                        Next <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

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

            {/* ── Digital Signature Modal ── */}
            {signatureModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-gray-100">
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 rounded-xl">
                                    <PenTool className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Digital Signature Settings</h3>
                                    <p className="text-xs text-gray-500">Configure signature image and signatory details for all HR letters</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSignatureModalOpen(false)} 
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Signature Preview & Upload Box */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                                Signature Image (PNG / Transparent recommended)
                            </label>
                            
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleSignatureFileChange}
                                accept="image/png,image/jpeg,image/jpg,image/webp"
                                className="hidden"
                            />

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-5 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-blue-50/20 group"
                            >
                                {signaturePreview ? (
                                    <div className="space-y-3">
                                        <div className="h-28 flex items-center justify-center bg-white rounded-lg p-2 border border-gray-200 shadow-inner">
                                            <img
                                                src={signaturePreview}
                                                alt="Signature Preview"
                                                className="max-h-24 max-w-full object-contain"
                                            />
                                        </div>
                                        <p className="text-xs text-blue-600 font-medium group-hover:underline flex items-center justify-center gap-1.5">
                                            <Upload className="w-3.5 h-3.5" />
                                            Click to change signature image
                                        </p>
                                    </div>
                                ) : (
                                    <div className="py-6 space-y-2">
                                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 group-hover:scale-105 transition-transform">
                                            <Upload className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm font-semibold text-gray-700">Click to upload signature</p>
                                        <p className="text-xs text-gray-400">PNG, JPG, or WebP up to 5MB (transparent PNG works best)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Signatory Name & Designation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Signatory Name
                                </label>
                                <input
                                    type="text"
                                    value={signatoryNameInput}
                                    onChange={e => setSignatoryNameInput(e.target.value)}
                                    placeholder="e.g. John Doe / Director"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Designation / Title
                                </label>
                                <input
                                    type="text"
                                    value={signatoryDesignationInput}
                                    onChange={e => setSignatoryDesignationInput(e.target.value)}
                                    placeholder="e.g. Authorized Signatory"
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                            <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                            <p>
                                When saved, this signature will automatically appear above the Authorized Signatory line on all <strong>Appointment</strong>, <strong>Offer</strong>, and <strong>Joining</strong> letters.
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between gap-3 pt-2">
                            {signatureConfig.signature_url ? (
                                <button
                                    type="button"
                                    onClick={handleRemoveSignature}
                                    disabled={savingSignature}
                                    className="px-3 py-2 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Remove Signature
                                </button>
                            ) : <div />}

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSignatureModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveSignature}
                                    disabled={savingSignature || (!signaturePreview && !signatureFile)}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {savingSignature ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save Signature"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Email Confirmation Modal ── */}
            {emailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 border border-gray-100">
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
                            <button onClick={() => setEmailModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                                    {emailModal.emp.first_name?.[0]}{emailModal.emp.last_name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {emailModal.emp.gender?.toLowerCase() === 'female' ? 'Ms. ' : (emailModal.emp.gender?.toLowerCase() === 'male' ? 'Mr. ' : '')}
                                        {emailModal.emp.first_name} {emailModal.emp.last_name}
                                    </p>
                                    <p className="text-xs text-blue-600">{emailModal.emp.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            <p>
                                This will generate the <strong>{DOC_TYPES.find(d => d.type === emailModal.type)?.label}</strong> as a PDF,
                                download it to your device, and also email it to the employee.
                            </p>
                            {signatureConfig.signature_url && (
                                <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Digital signature will be attached automatically.
                                </p>
                            )}
                        </div>

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

            {/* ── Offer Letter Date Confirmation Modal ── */}
            {offerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 border border-gray-100">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-50 rounded-xl">
                                    <FilePlus className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Download Offer Letter</h3>
                                    <p className="text-xs text-gray-500">Confirm interview date &amp; joining date for this letter</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOfferModal(null)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Candidate Summary Card */}
                        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                                    {offerModal.emp.first_name?.[0]}{offerModal.emp.last_name?.[0]}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {offerModal.emp.gender?.toLowerCase() === 'female' ? 'Ms. ' : (offerModal.emp.gender?.toLowerCase() === 'male' ? 'Mr. ' : '')}
                                        {offerModal.emp.first_name} {offerModal.emp.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">{offerModal.emp.designation || 'Engineer'} • {offerModal.emp.department_name || 'Operations'}</p>
                                </div>
                            </div>
                            {offerModal.emp.joining_date && (
                                <span className="text-xs bg-white px-2.5 py-1 rounded-md border border-gray-200 text-gray-600 font-medium">
                                    System: {new Date(offerModal.emp.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </span>
                            )}
                        </div>

                        {/* Date Inputs Form */}
                        <div className="space-y-4">
                            {/* 1. Final Interview Date */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Final Interview Date <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={offerModal.interviewDate}
                                        onChange={e => setOfferModal(prev => prev ? { ...prev, interviewDate: e.target.value } : null)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Reflected in letter: <em>"As per your Final interview dated {offerModal.interviewDate ? offerModal.interviewDate.split('-').reverse().join('.') : '...'}"</em>
                                </p>
                            </div>

                            {/* 2. Expected Joining Date */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                                        Expected Joining Date <span className="text-red-500">*</span>
                                    </label>
                                    {offerModal.emp.joining_date && (
                                        <button
                                            type="button"
                                            onClick={() => setOfferModal(prev => prev ? { ...prev, joiningDate: toInputDate(prev.emp.joining_date) || prev.joiningDate } : null)}
                                            className="text-[11px] text-emerald-600 hover:underline font-medium"
                                        >
                                            Reset to profile date
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={offerModal.joiningDate}
                                        onChange={e => setOfferModal(prev => prev ? { ...prev, joiningDate: e.target.value } : null)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Reflected in letter: <em>"You are required to join duties bef : {offerModal.joiningDate ? offerModal.joiningDate.split('-').reverse().join('.') : '...'}"</em>
                                </p>
                            </div>

                            {/* 3. Offer Issue Date */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
                                    Letter Issue Date
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={offerModal.issueDate}
                                        onChange={e => setOfferModal(prev => prev ? { ...prev, issueDate: e.target.value } : null)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">
                                    Appears at top-right of letterhead: <em>Date: {offerModal.issueDate ? offerModal.issueDate.split('-').reverse().join('.') : '...'}</em>
                                </p>
                            </div>
                        </div>

                        {/* Signature Notice */}
                        {includeSignature && signatureConfig.signature_url && (
                            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                <span>
                                    Digital signature ({signatureConfig.signatory_designation || signatureConfig.signatory_name || 'Authorized Signatory'}) will be included.
                                </span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setOfferModal(null)}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <div className="flex items-center gap-2">
                                {offerModal.emp.email && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleGenerate(offerModal.emp, "offer", true, {
                                                interview_date: offerModal.interviewDate,
                                                joining_date: offerModal.joiningDate,
                                                issue_date: offerModal.issueDate,
                                            });
                                        }}
                                        disabled={generating[`${offerModal.emp.id}-offer`] || emailing[`${offerModal.emp.id}-offer`]}
                                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {emailing[`${offerModal.emp.id}-offer`] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                        Email &amp; Download
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleGenerate(offerModal.emp, "offer", false, {
                                            interview_date: offerModal.interviewDate,
                                            joining_date: offerModal.joiningDate,
                                            issue_date: offerModal.issueDate,
                                        });
                                    }}
                                    disabled={generating[`${offerModal.emp.id}-offer`] || emailing[`${offerModal.emp.id}-offer`]}
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {generating[`${offerModal.emp.id}-offer`] ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Download className="w-4 h-4" /> Download PDF</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

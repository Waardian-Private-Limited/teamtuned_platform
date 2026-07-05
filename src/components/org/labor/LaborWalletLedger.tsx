"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { 
    Wallet, 
    Search, 
    ChevronLeft, 
    ChevronRight,
    ChevronDown, 
    Loader2, 
    ArrowUpRight, 
    ArrowDownLeft,
    Calendar,
    User,
    RefreshCcw,
    X,
    Clock,
    Plus,
    CheckCircle2,
    AlertCircle,
    FileText,
    ExternalLink,
    Download,
    Receipt,
    Building2,
    Briefcase,
    Trash2
} from "lucide-react";

export default function LaborWalletLedger() {
    const [loading, setLoading] = useState(true);
    const [ledger, setLedger] = useState<any[]>([]);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10, // Match default limit
        totalPages: 0
    });
    const [search, setSearch] = useState("");
    const [laborerId, setLaborerId] = useState("");
    
    // Site & Contractor Filter States
    const [sites, setSites] = useState<any[]>([]);
    const [siteId, setSiteId] = useState<string>("");
    const [contractors, setContractors] = useState<any[]>([]);
    const [contractorId, setContractorId] = useState<string>("");

    const { role } = useAuth();
    const isOrgAdmin = role?.toLowerCase() === 'orgadmin';

    // Sync Modal State
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [syncPreview, setSyncPreview] = useState<any>(null);
    const [syncDates, setSyncDates] = useState({
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0]
    });

    // Laborer Selection for Filter/Credit
    const [allLaborers, setAllLaborers] = useState<any[]>([]);
    const [labLoading, setLabLoading] = useState(false);

    // Credit Modal State
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditData, setCreditData] = useState({
        laborer_id: "",
        laborer_name: "",
        amount: "",
        description: ""
    });
    const [crediting, setCrediting] = useState(false);

    // Stats State
    const [stats, setStats] = useState({
        total_balance: 0,
        active_subscriptions: 0,
        month_debits: 0,
        month_credits: 0
    });

    function useCountUp(target: number, duration = 800) {
        const [v, setV] = useState(0);
        useEffect(() => {
            let raf: number;
            const start = performance.now();
            const step = (ts: number) => {
                const p = Math.min((ts - start) / duration, 1);
                setV(p * (Number.isFinite(target) ? target : 0));
                if (p < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
            return () => { if (raf) cancelAnimationFrame(raf); };
        }, [target, duration]);
        return v;
    }

    const totalBalance = useCountUp(stats.total_balance);
    const activeSubs = Math.floor(useCountUp(stats.active_subscriptions));
    const monthDebits = useCountUp(stats.month_debits);
    const monthCredits = useCountUp(stats.month_credits);

    const [activeTab, setActiveTab] = useState<"ledger" | "invoices">("ledger");

    // Invoices State
    const [invoices, setInvoices] = useState<any[]>([]);
    const [invLoading, setInvLoading] = useState(false);
    const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);
    const [invPagination, setInvPagination] = useState({
        page: 1, limit: 20, total: 0, totalPages: 1
    });

    // Raise Invoice State
    const [showRaiseModal, setShowRaiseModal] = useState(false);
    const [raiseDates, setRaiseDates] = useState({
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        notes: ""
    });
    const [invoiceSummary, setInvoiceSummary] = useState<any>(null);
    const [raising, setRaising] = useState(false);

    // Mark Paid State
    const [showPaidModal, setShowPaidModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [paidData, setPaidData] = useState({
        transaction_id: "",
        payment_mode: "UPI",
        payment_date: new Date().toISOString().split('T')[0],
        notes: ""
    });
    const [showExportModal, setShowExportModal] = useState(false);

    useEffect(() => {
        fetchLedger();
        fetchInvoices();
        fetchStats();
    }, [pagination.page, pagination.limit, invPagination.page, invPagination.limit, search, laborerId, siteId, contractorId, activeTab]);

    useEffect(() => {
        fetchAllLaborers();
        fetchSites();
    }, []);

    useEffect(() => {
        fetchContractors();
    }, [siteId]);

    const fetchSites = async () => {
        try {
            const res = await apiClient.get("/sites", { incharge_only: "0" });
            if (res.success) {
                setSites(res.sites || res.data || []);
            }
        } catch (error) {
            console.error("Error fetching sites:", error);
        }
    };

    const fetchContractors = async () => {
        try {
            const res = await apiClient.get("/labor/contractors", { site_id: siteId || undefined });
            if (res.success) {
                setContractors(res.contractors || res.data || []);
            }
        } catch (error) {
            console.error("Error fetching contractors:", error);
        }
    };

    const fetchAllLaborers = async () => {
        try {
            setLabLoading(true);
            const res = await apiClient.get("/labor/laborers", { limit: 1000 });
            if (res.success) {
                setAllLaborers(res.laborers || []);
            }
        } catch (error) {
            console.error("Error fetching laborers:", error);
        } finally {
            setLabLoading(false);
        }
    };

    const fetchLedger = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/labor/billing/ledger", {
                page: pagination.page,
                limit: pagination.limit,
                search,
                laborer_id: laborerId || undefined,
                site_id: siteId || undefined,
                contractor_id: contractorId || undefined
            });
            if (res.success) {
                setLedger(res.ledger);
                setPagination(prev => ({
                    ...prev,
                    page: Number(res.pagination.page),
                    total: Number(res.pagination.total),
                    totalPages: Number(res.pagination.totalPages)
                }));
            }
        } catch (error) {
            console.error("Error fetching ledger:", error);
            toast.error("Failed to load wallet ledger");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await apiClient.get("/labor/billing/stats");
            if (res.success) {
                setStats(res.stats);
            }
        } catch (error) {
            console.error("Error fetching wallet stats:", error);
        }
    };

    const fetchInvoices = async () => {
        try {
            setInvLoading(true);
            const res = await apiClient.get("/labor/billing/invoices", {
                page: invPagination.page,
                limit: invPagination.limit
            });
            if (res.success) {
                setInvoices(res.invoices);
                setInvPagination(prev => ({
                    ...prev,
                    page: Number(res.pagination.page),
                    total: Number(res.pagination.total),
                    totalPages: Number(res.pagination.totalPages)
                }));
            }
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setInvLoading(false);
        }
    };

    const fetchInvoiceSummary = async () => {
        if (!raiseDates.fromDate || !raiseDates.toDate) {
            setInvoiceSummary(null);
            return;
        }
        try {
            const res = await apiClient.get("/labor/billing/invoice-summary", { 
                fromDate: raiseDates.fromDate, 
                toDate: raiseDates.toDate 
            });
            if (res.success) {
                setInvoiceSummary(res.summary);
            } else {
                setInvoiceSummary(null);
            }
        } catch (error: any) {
            console.error("Error fetching invoice summary:", error);
            toast.error(error.message || "Failed to get invoice summary");
            setInvoiceSummary(null);
        }
    };

    useEffect(() => {
        if (showRaiseModal) {
            fetchInvoiceSummary();
        }
    }, [showRaiseModal, raiseDates.fromDate, raiseDates.toDate]);

    const handleRaiseInvoice = async () => {
        try {
            setRaising(true);
            const res = await apiClient.post("/labor/billing/invoice", raiseDates);
            if (res.success) {
                toast.success(res.message);
                setShowRaiseModal(false);
                fetchInvoices();
                fetchStats();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to raise invoice");
        } finally {
            setRaising(false);
        }
    };

    const handleMarkPaid = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setRaising(true);
            const res = await apiClient.put(`/labor/billing/invoice/${selectedInvoice.id}`, {
                status: 'PAID',
                ...paidData
            });
            if (res.success) {
                toast.success("Invoice marked as PAID");
                setShowPaidModal(false);
                fetchInvoices();
                fetchStats();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to update invoice");
        } finally {
            setRaising(false);
        }
    };

    const handleSyncPreview = async () => {
        if (!syncDates.fromDate || !syncDates.toDate) {
            toast.error("Please select both dates");
            return;
        }
        try {
            setPreviewing(true);
            setSyncPreview(null);
            const res = await apiClient.get("/labor/billing/sync-preview", syncDates);
            if (res.success) {
                setSyncPreview(res.preview);
            } else {
                toast.error("Failed to load preview");
            }
        } catch (error: any) {
            toast.error(error.message || "Preview failed");
        } finally {
            setPreviewing(false);
        }
    };

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await apiClient.post("/labor/billing/sync-historical", syncDates);
            if (res.success) {
                toast.success(res.message);
                setShowSyncModal(false);
                setSyncPreview(null);
                fetchLedger();
                fetchStats();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to sync historical data");
        } finally {
            setSyncing(false);
        }
    };

    const handleClearLedger = async () => {
        if (!window.confirm("ARE YOU SURE? This will PERMANENTLY delete all transaction history and reset all laborer wallet balances to 0. This cannot be undone.")) return;
        
        try {
            setLoading(true);
            const res = await apiClient.post("/labor/billing/clear-ledger");
            if (res.success) {
                toast.success(res.message);
                fetchLedger();
                fetchStats();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to clear ledger");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCredit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setCrediting(true);
            const res = await apiClient.post("/labor/billing/credit", creditData);
            if (res.success) {
                toast.success(res.message);
                setShowCreditModal(false);
                setCreditData({ laborer_id: "", laborer_name: "", amount: "", description: "" });
                fetchLedger();
                fetchStats();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to add credit");
        } finally {
            setCrediting(false);
        }
    };

    const handleDeleteRow = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this transaction row? This will recalculate and adjust all subsequent running balances and wallet balances in the ledger and reports!")) {
            return;
        }

        try {
            setLoading(true);
            const res = await apiClient.delete(`/labor/billing/ledger/${id}`);
            if (res.success) {
                toast.success(res.message || "Transaction deleted successfully");
                fetchLedger();
                fetchStats();
            } else {
                toast.error(res.message || "Failed to delete transaction");
            }
        } catch (error: any) {
            console.error("handleDeleteRow error:", error);
            toast.error(error.message || "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async (inv: any) => {
        try {
            setDownloadingInvoiceId(inv.id);
            const blob = await apiClient.get(`/labor/billing/invoice/${inv.id}/download`, {}, { 
                responseType: 'blob',
                withAuth: true 
            });
            
            const url = window.URL.createObjectURL(new Blob([blob as any]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice-${inv.invoice_number}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Invoice downloaded successfully");
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Failed to download invoice");
        } finally {
            setDownloadingInvoiceId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        // Force IST (UTC + 5.5 hours) for display
        const date = new Date(dateStr);
        return date.toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    };

    const formatCurrency = (val: number | string) => {
        const n = typeof val === 'string' ? parseFloat(val) : val;
        if (isNaN(n)) return "0.00";
        // Round to 2 decimals if more, otherwise keep as is (but user asked to keep actual values just round off at 2 if more)
        // We'll show 2 decimals consistently for a clean look, as per standard billing UIs
        return n.toLocaleString('en-IN', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-black flex items-center gap-3 tracking-tighter">
                        <Wallet className="text-black" size={32} /> Labor Wallet Ledger
                    </h1>
                    <p className="text-black/60 font-medium mt-2">Monitor transactions, manage balances, and track labor attendance billing.</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex bg-gray-100/80 p-1 rounded-lg shadow-inner mr-2">
                        <button 
                            onClick={() => setActiveTab("ledger")}
                            className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'ledger' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ledger
                        </button>
                        <button 
                            onClick={() => setActiveTab("invoices")}
                            className={`px-5 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'invoices' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Invoices
                        </button>
                    </div>

                    {activeTab === 'ledger' ? (
                        <>
                            {isOrgAdmin && (
                                <>
                                    <button
                                        onClick={() => {
                                            setCreditData({ laborer_id: "", laborer_name: "", amount: "", description: "" });
                                            setShowCreditModal(true);
                                        }}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-semibold text-sm shadow-sm"
                                    >
                                        <Plus size={18} /> Add Balance
                                    </button>
                                    <button
                                        onClick={() => setShowSyncModal(true)}
                                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all font-semibold text-sm shadow-sm"
                                    >
                                        <RefreshCcw size={18} className="text-blue-600" /> Sync History
                                    </button>
                                    <button
                                        onClick={handleClearLedger}
                                        className="flex items-center gap-2 bg-white border border-red-100 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-all font-semibold text-sm shadow-sm"
                                    >
                                        <RefreshCcw size={18} /> Clear Ledger
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={() => setShowRaiseModal(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all font-semibold text-sm shadow-sm"
                        >
                            <Plus size={18} /> Raise Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-50/80 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-white rounded-xl text-blue-600 shadow-sm">
                            <Wallet size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total Outstanding</span>
                    </div>
                    <div className="text-3xl font-black text-blue-900 tracking-tighter">₹{formatCurrency(totalBalance)}</div>
                </div>

                <div className="bg-orange-50/50 p-6 rounded-xl border border-orange-100 shadow-sm hover:bg-orange-50/80 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-white rounded-xl text-orange-600 shadow-sm">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Monthly Debits</span>
                    </div>
                    <div className="text-3xl font-black text-orange-900 tracking-tighter">₹{formatCurrency(monthDebits)}</div>
                </div>

                <div className="bg-green-50/50 p-6 rounded-xl border border-green-100 shadow-sm hover:bg-green-50/80 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-white rounded-xl text-green-600 shadow-sm">
                            <ArrowDownLeft size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Monthly Credits</span>
                    </div>
                    <div className="text-3xl font-black text-green-900 tracking-tighter">₹{formatCurrency(monthCredits)}</div>
                </div>

                <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100 shadow-sm hover:bg-purple-50/80 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-white rounded-xl text-purple-600 shadow-sm">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Active Subscriptions</span>
                    </div>
                    <div className="text-3xl font-black text-purple-900 tracking-tighter">{activeSubs}</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex flex-col lg:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by laborer name or description..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPagination({ ...pagination, page: 1 });
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium outline-none"
                    />
                </div>

                {/* Site Filter */}
                <div className="relative w-full lg:w-48">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        value={siteId}
                        onChange={(e) => {
                            setSiteId(e.target.value);
                            setContractorId(""); // Reset contractor on site change
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-semibold appearance-none outline-none"
                    >
                        <option value="">All Sites</option>
                        {sites.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>

                {/* Contractor Filter */}
                <div className="relative w-full lg:w-48">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        value={contractorId}
                        onChange={(e) => {
                            setContractorId(e.target.value);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-semibold appearance-none outline-none"
                    >
                        <option value="">All Contractors</option>
                        {contractors.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>

                {/* Laborer Filter */}
                <div className="relative w-full lg:w-48">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        value={laborerId}
                        onChange={(e) => {
                            setLaborerId(e.target.value);
                            setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-semibold appearance-none outline-none"
                    >
                        <option value="">All Laborers</option>
                        {allLaborers.map(l => (
                            <option key={l.id} value={l.id}>
                                {l.name} {l.is_active === 0 ? '(Inactive)' : ''}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>

                <button
                    onClick={() => setShowExportModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm whitespace-nowrap w-full lg:w-auto justify-center"
                >
                    <Download size={16} /> Export
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {activeTab === 'ledger' ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">ID</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Laborer Details</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Transaction Date</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Description</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Amount (₹)</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Running Bal.</th>
                                        {isOrgAdmin && (
                                            <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-center">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={isOrgAdmin ? 8 : 7} className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                                    <span className="text-xs font-medium">Crunching transaction history...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : ledger.length === 0 ? (
                                        <tr>
                                            <td colSpan={isOrgAdmin ? 8 : 7} className="px-6 py-20 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-4 bg-gray-50 rounded-full mb-2">
                                                        <FileText size={40} className="text-gray-300" />
                                                    </div>
                                                    <p className="font-semibold text-gray-600">No transactions found</p>
                                                    <p className="text-sm">Try adjusting your filters or search term.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        ledger.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/80 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100/80 px-2 py-1 rounded border border-gray-100">
                                                        #{item.id}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100/50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold group-hover:scale-105 transition-transform shrink-0">
                                                            {item.laborer_name?.charAt(0) || "L"}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-gray-900 truncate">{item.laborer_name}</div>
                                                            <div className="text-[10px] text-gray-500 font-bold tracking-tight uppercase">Ph: {item.laborer_phone || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-900 font-semibold">{formatDate(item.transaction_date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 font-medium max-w-xs">
                                                    {item.description}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                                        item.type === 'DEBIT' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                                                    }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                                                    ₹{formatCurrency(item.amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="inline-block px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold text-gray-900">
                                                        ₹{formatCurrency(item.org_wallet_balance || item.wallet_balance)}
                                                    </div>
                                                </td>
                                                {isOrgAdmin && (
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => handleDeleteRow(item.id)}
                                                            className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 border border-transparent hover:border-red-600 rounded transition-all cursor-pointer inline-flex items-center justify-center"
                                                            title="Delete transaction"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                )}
                                             </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Ledger Pagination */}
                        {pagination.total > 0 && (
                            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
                                <div className="text-xs text-gray-500 font-medium">
                                    Displaying <span className="text-gray-900 font-bold">{(pagination.page - 1) * pagination.limit + 1}</span> - <span className="text-gray-900 font-bold">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="text-gray-900 font-bold">{pagination.total}</span> entries
                                </div>
                                
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-500 font-bold">Rows:</span>
                                        <select
                                            value={pagination.limit}
                                            onChange={(e) => {
                                                const newLimit = parseInt(e.target.value);
                                                setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
                                            }}
                                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                            disabled={pagination.page === 1 || loading}
                                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>

                                        <div className="flex items-center gap-1">
                                            {(() => {
                                                const pages = [];
                                                const maxVisible = 5;
                                                let startPage = Math.max(1, pagination.page - Math.floor(maxVisible / 2));
                                                let endPage = Math.min(pagination.totalPages, startPage + maxVisible - 1);

                                                if (endPage - startPage + 1 < maxVisible) {
                                                    startPage = Math.max(1, endPage - maxVisible + 1);
                                                }

                                                if (startPage > 1) {
                                                    pages.push(
                                                        <button key={1} onClick={() => setPagination(p => ({ ...p, page: 1 }))}
                                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === 1 ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "hover:bg-gray-100 text-gray-600"}`}>1</button>
                                                    );
                                                    if (startPage > 2) pages.push(<span key="e1" className="text-gray-400 text-xs px-1">...</span>);
                                                }

                                                for (let p = startPage; p <= endPage; p++) {
                                                    pages.push(
                                                        <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))}
                                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === p ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "hover:bg-gray-100 text-gray-600"}`}>{p}</button>
                                                    );
                                                }

                                                if (endPage < pagination.totalPages) {
                                                    if (endPage < pagination.totalPages - 1) pages.push(<span key="e2" className="text-gray-400 text-xs px-1">...</span>);
                                                    pages.push(
                                                        <button key={pagination.totalPages} onClick={() => setPagination(p => ({ ...p, page: p.totalPages }))}
                                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === pagination.totalPages ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "hover:bg-gray-100 text-gray-600"}`}>{pagination.totalPages}</button>
                                                    );
                                                }
                                                return pages;
                                            })()}
                                        </div>

                                        <button
                                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                                            disabled={pagination.page === pagination.totalPages || loading}
                                            className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Invoice Ref</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Billing Cycle</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest">Breakdown</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Final Amount</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-black/40 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {invLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="animate-spin text-blue-600" size={32} />
                                                    <span className="text-xs font-medium">Loading invoices...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="p-4 bg-gray-50 rounded-full mb-2">
                                                        <FileText size={40} className="text-gray-300" />
                                                    </div>
                                                    <p className="font-semibold text-gray-600">No invoices yet</p>
                                                    <p className="text-sm">Generate your first invoice to get started.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50/80 transition-all border-b border-gray-50 group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-gray-900">{inv.invoice_number}</span>
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase">Raised: {new Date(inv.created_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-700">
                                                        <Calendar size={12} />
                                                        {new Date(inv.from_date).toLocaleDateString()} - {new Date(inv.to_date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Subs: {inv.subscription_count}</span>
                                                        <span className="text-[10px] font-semibold text-gray-500 uppercase">Attendance: {inv.punch_count}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                                                    ₹{formatCurrency(inv.total_amount)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleDownloadInvoice(inv)}
                                                            disabled={downloadingInvoiceId === inv.id}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all border border-blue-100 flex items-center gap-2 font-bold text-[10px] uppercase"
                                                        >
                                                            {downloadingInvoiceId === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                                            Download
                                                        </button>
                                                        {inv.status === 'PENDING' && isOrgAdmin && (
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedInvoice(inv);
                                                                    setShowPaidModal(true);
                                                                }}
                                                                className="text-white bg-blue-600 hover:bg-blue-700 font-bold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition-all shadow-sm"
                                                            >
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                        {inv.status === 'PAID' && (
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-[10px] font-bold text-green-600 uppercase italic">Paid on {new Date(inv.paid_at).toLocaleDateString()}</span>
                                                                <span className="text-[9px] text-gray-400 font-medium">{inv.payment_mode} | {inv.transaction_id}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Invoice Pagination */}
                        {invPagination.total > 0 && (
                            <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-4">
                                <div className="text-xs text-gray-500 font-medium">
                                    Displaying <span className="text-gray-900 font-bold">{(invPagination.page - 1) * invPagination.limit + 1}</span> - <span className="text-gray-900 font-bold">{Math.min(invPagination.page * invPagination.limit, invPagination.total)}</span> of <span className="text-gray-900 font-bold">{invPagination.total}</span> invoices
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setInvPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                        disabled={invPagination.page === 1 || invLoading}
                                        className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {[...Array(invPagination.totalPages)].map((_, i) => (
                                            <button
                                                key={i + 1}
                                                onClick={() => setInvPagination(prev => ({ ...prev, page: i + 1 }))}
                                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${invPagination.page === i + 1 ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "hover:bg-gray-100 text-gray-600"}`}
                                            >
                                                {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => setInvPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                                        disabled={invPagination.page === invPagination.totalPages || invLoading}
                                        className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Sync Historical Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => !syncing && !previewing && (setShowSyncModal(false), setSyncPreview(null))}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <RefreshCcw className="text-blue-600" size={20} /> Sync Historical Billing
                            </h3>
                            <button
                                onClick={() => { if (!syncing && !previewing) { setShowSyncModal(false); setSyncPreview(null); } }}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <p className="text-sm text-gray-500">
                                Select a date range to preview missing billing entries before adding them to the ledger.
                            </p>

                            {/* Date Range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        value={syncDates.fromDate}
                                        onChange={(e) => { setSyncDates({...syncDates, fromDate: e.target.value}); setSyncPreview(null); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
                                    <input
                                        type="date"
                                        value={syncDates.toDate}
                                        onChange={(e) => { setSyncDates({...syncDates, toDate: e.target.value}); setSyncPreview(null); }}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                                    />
                                </div>
                            </div>

                            {/* Preview Result */}
                            {syncPreview && (
                                <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
                                    <div className="px-4 py-3 bg-blue-100 flex items-center justify-between">
                                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Sync Preview</span>
                                        <span className="text-xs text-blue-500">{syncPreview.fromDate} → {syncPreview.toDate}</span>
                                    </div>

                                    {/* Before / Adding / After table */}
                                    <div className="px-4 pt-3 pb-1">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-xs text-gray-400 uppercase border-b border-blue-100">
                                                    <th className="text-left pb-2 font-semibold">Type</th>
                                                    <th className="text-right pb-2 font-semibold">Before</th>
                                                    <th className="text-right pb-2 font-semibold text-orange-500">+ Adding</th>
                                                    <th className="text-right pb-2 font-semibold text-green-600">After</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-50">
                                                <tr>
                                                    <td className="py-2 text-gray-700 font-medium">
                                                        Registration
                                                        {syncPreview.missingRegistration > 0 && (
                                                            <span className="ml-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                                                                {syncPreview.missingRegistration} missing
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-right text-gray-600">₹{syncPreview.currentRegistrationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-2 text-right text-orange-500 font-semibold">
                                                        {syncPreview.estimatedRegistrationTotal > 0 ? `+₹${syncPreview.estimatedRegistrationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="py-2 text-right text-green-700 font-bold">₹{syncPreview.afterRegistrationTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-700 font-medium">
                                                        Attendance
                                                        {syncPreview.missingAttendance > 0 && (
                                                            <span className="ml-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                                                                {syncPreview.missingAttendance} missing
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 text-right text-gray-600">₹{syncPreview.currentAttendanceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-2 text-right text-orange-500 font-semibold">
                                                        {syncPreview.estimatedAttendanceTotal > 0 ? `+₹${syncPreview.estimatedAttendanceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="py-2 text-right text-green-700 font-bold">₹{syncPreview.afterAttendanceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                                <tr className="border-t-2 border-blue-200 bg-blue-100/40">
                                                    <td className="py-2 text-gray-800 font-bold text-xs uppercase">Total</td>
                                                    <td className="py-2 text-right text-gray-700 font-bold">₹{syncPreview.currentTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    <td className="py-2 text-right text-orange-600 font-bold">
                                                        {syncPreview.estimatedTotal > 0 ? `+₹${syncPreview.estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="py-2 text-right text-green-700 font-extrabold">₹{syncPreview.afterTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {syncPreview.totalMissing === 0 && (
                                        <div className="px-4 pb-3 pt-1 text-center text-sm text-green-600 font-semibold">
                                            ✅ All entries are already up to date — nothing to sync.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Buttons */}
                            {!syncPreview ? (
                                <button
                                    onClick={handleSyncPreview}
                                    disabled={previewing}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md shadow-blue-200 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {previewing ? <><span className="animate-spin">⏳</span> Checking...</> : "Preview Missing Entries"}
                                </button>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setSyncPreview(null)}
                                        disabled={syncing}
                                        className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all text-sm"
                                    >
                                        ← Change Dates
                                    </button>
                                    <button
                                        onClick={handleSync}
                                        disabled={syncing || syncPreview.totalMissing === 0}
                                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-md shadow-green-200 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        {syncing ? <><span className="animate-spin">⏳</span> Syncing...</> : `Confirm & Add ${syncPreview.totalMissing} Entries`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Add Credit Modal */}
            {showCreditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => !crediting && setShowCreditModal(false)}
                    />
                    <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Wallet className="text-green-600" size={20} /> Add Balance
                            </h3>
                            <button 
                                onClick={() => !crediting && setShowCreditModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddCredit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Laborer</label>
                                <select
                                    required
                                    value={creditData.laborer_id}
                                    onChange={(e) => {
                                        const lab = allLaborers.find(l => String(l.id) === e.target.value);
                                        setCreditData({
                                            ...creditData,
                                            laborer_id: e.target.value,
                                            laborer_name: lab ? lab.name : ""
                                        });
                                    }}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 transition-all font-bold text-sm outline-none"
                                >
                                    <option value="">Choose Laborer...</option>
                                    {allLaborers.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} {l.phone ? `(${l.phone})` : ''} {l.registration_status === 'terminated' ? '[Terminated]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                                    <input 
                                        type="number"
                                        required
                                        min="1"
                                        value={creditData.amount}
                                        onChange={(e) => setCreditData({...creditData, amount: e.target.value})}
                                        placeholder="e.g. 500"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 transition-all font-bold text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description / Notes</label>
                                    <input 
                                        type="text"
                                        value={creditData.description}
                                        onChange={(e) => setCreditData({...creditData, description: e.target.value})}
                                        placeholder="Manual Recharge, etc."
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={crediting}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-green-200 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {crediting ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : "Add Balance Now"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Raise Invoice Modal */}
            {showRaiseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity"
                        onClick={() => !raising && setShowRaiseModal(false)}
                    />
                    <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 border border-gray-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <FileText className="text-white" size={20} />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                    Raise New Invoice
                                </h3>
                            </div>
                            <button 
                                onClick={() => !raising && setShowRaiseModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100 shadow-sm"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6">01. Billing Period</h4>
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">From Date</label>
                                                <input 
                                                    type="date"
                                                    value={raiseDates.fromDate}
                                                    onChange={(e) => setRaiseDates({...raiseDates, fromDate: e.target.value})}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-sm bg-gray-50/30"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">To Date</label>
                                                <input 
                                                    type="date"
                                                    value={raiseDates.toDate}
                                                    onChange={(e) => setRaiseDates({...raiseDates, toDate: e.target.value})}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-sm bg-gray-50/30"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wider">Notes / Reference</label>
                                            <textarea 
                                                value={raiseDates.notes}
                                                onChange={(e) => setRaiseDates({...raiseDates, notes: e.target.value})}
                                                placeholder="Enter billing notes or reference details..."
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm h-32 resize-none bg-gray-50/30"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col h-full">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6">02. Invoice Summary</h4>
                                <div className="flex-grow bg-gray-50 rounded-lg p-6 border border-gray-200/60 space-y-5 relative">
                                    {invoiceSummary ? (
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 border border-gray-100 shadow-sm rounded-lg flex justify-between items-center group hover:border-blue-200 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Subscriptions</span>
                                                    <span className="text-xs font-black text-gray-900">{invoiceSummary.subscription_count} entries</span>
                                                </div>
                                                <span className="text-base font-black text-gray-900">₹{formatCurrency(invoiceSummary.subscription_total)}</span>
                                            </div>
                                            
                                            <div className="bg-white p-4 border border-gray-100 shadow-sm rounded-lg flex justify-between items-center group hover:border-blue-200 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Attendance Punches</span>
                                                    <span className="text-xs font-black text-gray-900">{invoiceSummary.attendance_count} records</span>
                                                </div>
                                                <span className="text-base font-black text-gray-900">₹{formatCurrency(invoiceSummary.attendance_total)}</span>
                                            </div>

                                            <div className="pt-6 mt-4 border-t border-dashed border-gray-300">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Payable</span>
                                                    <div className="text-right">
                                                        <div className="text-3xl font-black text-blue-600 tracking-tighter">₹{formatCurrency(invoiceSummary.total_amount)}</div>
                                                        <div className="text-[9px] font-bold text-gray-400 uppercase mt-1">Inclusive of all taxes</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {invoiceSummary.total_amount > 0 ? (
                                                <button
                                                    onClick={handleRaiseInvoice}
                                                    disabled={raising}
                                                    className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-lg shadow-xl shadow-gray-200 disabled:opacity-50 transition-all mt-8 flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                                                >
                                                    {raising ? <Loader2 className="animate-spin" size={16} /> : "Generate Invoice Now"}
                                                </button>
                                            ) : (
                                                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-3 mt-8">
                                                    <AlertCircle className="text-amber-600 shrink-0" size={18} />
                                                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase">No billable items detected for this range. Please adjust dates to proceed.</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3">
                                            <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                                                <Loader2 className="animate-spin text-blue-600" size={24} />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Calculating...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mark as Paid Modal */}
            {showPaidModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div 
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => !raising && setShowPaidModal(false)}
                    />
                    <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50/50">
                            <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                                <CheckCircle2 className="text-green-600" size={24} /> Mark as Paid
                            </h3>
                            <button 
                                onClick={() => !raising && setShowPaidModal(false)}
                                className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"
                            >
                                <X size={20} className="text-gray-400" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleMarkPaid} className="p-8 space-y-6">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">{selectedInvoice.invoice_number}</p>
                                    <p className="text-sm font-black text-gray-900">Final Amount</p>
                                </div>
                                <p className="text-xl font-black text-gray-900">₹{formatCurrency(selectedInvoice.total_amount)}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Payment Mode</label>
                                    <select 
                                        value={paidData.payment_mode}
                                        onChange={(e) => setPaidData({...paidData, payment_mode: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 transition-all font-bold"
                                    >
                                        <option value="UPI">UPI / GPay / PhonePe</option>
                                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                                        <option value="CASH">Cash Payment</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Transaction ID / Ref #</label>
                                    <input 
                                        type="text"
                                        required
                                        value={paidData.transaction_id}
                                        onChange={(e) => setPaidData({...paidData, transaction_id: e.target.value})}
                                        placeholder="e.g. 1234567890"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Payment Date</label>
                                    <input 
                                        type="date"
                                        required
                                        value={paidData.payment_date}
                                        onChange={(e) => setPaidData({...paidData, payment_date: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={raising}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-lg shadow-xl shadow-green-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {raising ? <Loader2 className="animate-spin" size={20} /> : "Confirm Payment Received"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showExportModal && (
                <LedgerExportModal
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </div>
    );
}

// Ledger Export Modal Component
function LedgerExportModal({ onClose }: { onClose: () => void }) {
    const [fromDate, setFromDate] = useState(
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    );
    const [toDate, setToDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [type, setType] = useState<'all' | 'attendance' | 'registration'>('all');
    const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
    const [exportMode, setExportMode] = useState<'full' | 'breakdown'>('full');
    const [submitting, setSubmitting] = useState(false);

    // Site & Contractor selections inside export
    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<string>("");
    const [contractors, setContractors] = useState<any[]>([]);
    const [selectedContractorId, setSelectedContractorId] = useState<string>("");

    useEffect(() => {
        fetchSites();
    }, []);

    useEffect(() => {
        fetchContractors();
    }, [selectedSiteId]);

    const fetchSites = async () => {
        try {
            const res = await apiClient.get("/sites", { incharge_only: "0" });
            if (res.success) {
                setSites(res.sites || res.data || []);
            }
        } catch (error) {}
    };

    const fetchContractors = async () => {
        try {
            const res = await apiClient.get("/labor/contractors", { site_id: selectedSiteId || undefined });
            if (res.success) {
                setContractors(res.contractors || res.data || []);
            }
        } catch (error) {}
    };

    const downloadLedger = async () => {
        try {
            setSubmitting(true);
            const token = localStorage.getItem('token');
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3006/api/v1';

            const res = await fetch(`${baseUrl}/labor/billing/ledger/export`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify({
                    fromDate,
                    toDate,
                    type,
                    format: exportFormat,
                    siteId: selectedSiteId || undefined,
                    contractorId: selectedContractorId || undefined,
                    mode: exportMode
                }),
            });

            if (!res.ok) throw new Error('Failed to download ledger report');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Labor_Ledger_${fromDate}_to_${toDate}.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            onClose();
        } catch (err: any) {
            console.error('Export error:', err);
            toast.error(err.message || 'Failed to download ledger report');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-250">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">Export Labor Wallet Ledger</h3>
                        <p className="text-blue-100 text-xs mt-1">Download transaction history, summary cards and breakdowns</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Date Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">From Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">To Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Site & Contractor selections */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Site</label>
                            <select
                                value={selectedSiteId}
                                onChange={(e) => {
                                    setSelectedSiteId(e.target.value);
                                    setSelectedContractorId("");
                                }}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                            >
                                <option value="">All Sites</option>
                                {sites.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Contractor</label>
                            <select
                                value={selectedContractorId}
                                onChange={(e) => setSelectedContractorId(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                            >
                                <option value="">All Contractors</option>
                                {contractors.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Filter Type & Mode */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Txn Filter Type</label>
                            <select
                                value={type}
                                onChange={(e: any) => setType(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                            >
                                <option value="all">All (Passbook)</option>
                                <option value="attendance">Attendance Only</option>
                                <option value="registration">Registration Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Export Mode</label>
                            <select
                                value={exportMode}
                                onChange={(e: any) => setExportMode(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                            >
                                <option value="full">Full Ledger Passbook</option>
                                <option value="breakdown">Breakdown Summary Only</option>
                            </select>
                        </div>
                    </div>

                    {/* Export Format */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Export Format</label>
                        <div className="flex gap-6 mt-1 ml-1">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="radio"
                                    name="export_format"
                                    value="excel"
                                    checked={exportFormat === 'excel'}
                                    onChange={() => setExportFormat('excel')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 font-semibold">Excel (.xlsx)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="radio"
                                    name="export_format"
                                    value="pdf"
                                    checked={exportFormat === 'pdf'}
                                    onChange={() => setExportFormat('pdf')}
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700 font-semibold">PDF (.pdf)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 font-bold text-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={downloadLedger}
                        disabled={submitting}
                        className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-md shadow-green-100 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4" />
                                Download Report
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

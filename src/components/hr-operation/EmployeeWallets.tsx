"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    Search, Loader2, ArrowUpRight, ArrowDownLeft, Lock, Unlock, Plus,
    RefreshCw, FileText, ChevronLeft, ChevronRight, X, DollarSign,
    Wallet, Users, TrendingUp, AlertCircle, CheckCircle, Info,
    Filter, ChevronDown, ChevronUp, Building, ShieldOff
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";


// ── Types ─────────────────────────────────────────────────────────────────────

interface EmployeeWallet {
    employee_id: number;
    first_name: string;
    last_name: string;
    department_name: string;
    wallet_id: number;
    current_balance: number;
    min_balance: number;
    is_locked: number;
    currency: string;
}

interface EmployeeNoWallet {
    employee_id: number;
    first_name: string;
    last_name: string;
    department_name: string;
}

interface WalletTransaction {
    id: number;
    type: "Credit" | "Debit";
    reference_type: string;
    amount: number;
    balance_before: number;
    balance_after: number;
    remarks: string | null;
    added_by_first_name: string | null;
    added_by_last_name?: string | null;
    added_by_department_name?: string | null;
    created_at: string;
    status?: "Pending" | "Approved" | "Rejected";
    acknowledged_at?: string | null;
    rejection_reason?: string | null;
    added_by_name?: string | null;
}

interface Department { id: number; name: string; }

// ── Animated counter ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 800) {
    const [v, setV] = useState(0);
    useEffect(() => {
        let raf: number;
        const start = performance.now();
        const step = (ts: number) => {
            const p = Math.min((ts - start) / duration, 1);
            setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => { if (raf) cancelAnimationFrame(raf); };
    }, [target, duration]);
    return v;
}

// ── Notification helper ───────────────────────────────────────────────────────

function showNotification(message: string, type: "success" | "error") {
    const container = document.getElementById("notif-container") || (() => {
        const d = document.createElement("div");
        d.id = "notif-container";
        Object.assign(d.style, { position: "fixed", top: "20px", right: "20px", zIndex: "9999" });
        document.body.appendChild(d);
        return d;
    })();
    const n = document.createElement("div");
    n.className = `p-4 mb-3 rounded-xl shadow-lg border flex items-center gap-3 text-sm font-medium transition-opacity ${type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`;
    n.textContent = message;
    container.appendChild(n);
    setTimeout(() => { n.style.opacity = "0"; setTimeout(() => n.remove(), 400); }, 4000);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
    label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string;
}) {
    return (
        <div className={`${color} rounded-xl p-4 border`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function EmployeeWallets() {
    const { role, permissions } = useAuth();

    // ── Permissions ──────────────────────────────────────────────────────────
    const isOrgAdmin = (role || '').toLowerCase() === 'orgadmin';
    const hasPerm = (code: string) =>
        (permissions || []).some((p) => (p || '').toUpperCase() === code.toUpperCase());
    const isReimbAdmin = isOrgAdmin || hasPerm('REIMB_ADMIN') || hasPerm('WALLET_ADMIN');
    const canView       = isReimbAdmin || hasPerm('EMP_WALLET_VIEW') || hasPerm('REIMBUSMENT_WALLET_VIEW');
    const canCreate     = isReimbAdmin || hasPerm('EMP_WALLET_CREATE') || hasPerm('REIMBUSMENT_WALLET_CREATE');
    const canTopUp      = isReimbAdmin || hasPerm('EMP_WALLET_TOPUP') || hasPerm('REIMBUSMENT_WALLET_TOPOP');
    const canLock       = isReimbAdmin || hasPerm('EMP_WALLET_LOCK') || hasPerm('REIMBUSMENT_WALLET_EDIT');

    // Wallets (employees WITH wallets)
    const [wallets, setWallets] = useState<EmployeeWallet[]>([]);
    const [walletsLoading, setWalletsLoading] = useState(true);
    const [walletsTotal, setWalletsTotal] = useState(0);
    const [walletsPage, setWalletsPage] = useState(1);
    const [walletsSearch, setWalletsSearch] = useState("");
    const [walletsDept, setWalletsDept] = useState("");
    const walletsLimit = 10;

    // Employees without wallets
    const [noWalletEmps, setNoWalletEmps] = useState<EmployeeNoWallet[]>([]);
    const [noWalletLoading, setNoWalletLoading] = useState(true);
    const [noWalletTotal, setNoWalletTotal] = useState(0);
    const [noWalletPage, setNoWalletPage] = useState(1);
    const [noWalletSearch, setNoWalletSearch] = useState("");
    const noWalletLimit = 6;

    // Common
    const [departments, setDepartments] = useState<Department[]>([]);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Stats (derived from a summary call or the wallet list totals)
    const [statsTotal, setStatsTotal] = useState(0);
    const [statsTotalBalance, setStatsTotalBalance] = useState(0);
    const [statsLocked, setStatsLocked] = useState(0);
    const [statsNoWallet, setStatsNoWallet] = useState(0);

    // Animated counters
    const cntWallets = useCountUp(statsTotal);
    const cntBalance = useCountUp(Math.floor(statsTotalBalance));
    const cntLocked = useCountUp(statsLocked);
    const cntNoWallet = useCountUp(statsNoWallet);

    // Create wallet modal
    const [showCreate, setShowCreate] = useState(false);
    const [createEmp, setCreateEmp] = useState<EmployeeNoWallet | null>(null);
    const [createBalance, setCreateBalance] = useState("");
    const [createCurrency, setCreateCurrency] = useState("INR");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Top-up modal
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpWallet, setTopUpWallet] = useState<EmployeeWallet | null>(null);
    const [topUpAmount, setTopUpAmount] = useState("");
    const [topUpMode, setTopUpMode] = useState("Cash");
    const [topUpRemarks, setTopUpRemarks] = useState("");
    const [topUpLoading, setTopUpLoading] = useState(false);

    // Ledger modal
    const [showLedger, setShowLedger] = useState(false);
    const [ledgerWallet, setLedgerWallet] = useState<EmployeeWallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    const [ledgerPage, setLedgerPage] = useState(1);
    const [ledgerTotal, setLedgerTotal] = useState(0);
    const ledgerLimit = 10;

    // ── Fetch wallets (WITH wallets) ──────────────────────────────────────────
    const fetchWallets = useCallback(async () => {
        if (!canView) return;
        setWalletsLoading(true);
        try {
            const q = new URLSearchParams({
                search: walletsSearch,
                page: walletsPage.toString(),
                limit: walletsLimit.toString(),
                ...(walletsDept && { department_id: walletsDept }),
            });
            const res = await apiClient<any>(`/reimbursements/wallets?${q}`, { method: "GET", withAuth: true });
            if (res.success) {
                setWallets(res.data || []);
                setWalletsTotal(res.total || 0);

                // Update stats from this paginated data — we separately call summary
                const all = res.data || [];
                setStatsTotalBalance(all.reduce((s: number, w: EmployeeWallet) => s + Number(w.current_balance || 0), 0));
                setStatsLocked(all.filter((w: EmployeeWallet) => w.is_locked).length);
            }
        } catch (e) {
            console.error("Fetch wallets error:", e);
        } finally {
            setWalletsLoading(false);
        }
    }, [canView, walletsSearch, walletsPage, walletsDept]);

    // ── Fetch employees WITHOUT wallets ───────────────────────────────────────
    const fetchNoWallet = useCallback(async () => {
        if (!canView) return;
        setNoWalletLoading(true);
        try {
            const q = new URLSearchParams({
                search: noWalletSearch,
                page: noWalletPage.toString(),
                limit: noWalletLimit.toString(),
            });
            const res = await apiClient<any>(`/reimbursements/wallets/employees-without?${q}`, { method: "GET", withAuth: true });
            if (res.success) {
                setNoWalletEmps(res.data || []);
                setNoWalletTotal(res.total || 0);
                setStatsNoWallet(res.total || 0);
            }
        } catch (e) {
            console.error("Fetch no-wallet emps error:", e);
        } finally {
            setNoWalletLoading(false);
        }
    }, [canView, noWalletSearch, noWalletPage]);

    const fetchDepartments = useCallback(async () => {
        if (!canView) return;
        try {
            const res = await apiClient<any>("/organization/departments", { method: "GET", withAuth: true });
            const list = Array.isArray(res) ? res : (res?.departments || []);
            setDepartments(list);
        } catch { }
    }, [canView]);

    useEffect(() => { fetchWallets(); }, [fetchWallets]);
    useEffect(() => { fetchNoWallet(); }, [fetchNoWallet]);
    useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
    useEffect(() => { setStatsTotal(walletsTotal); }, [walletsTotal]);

    const refreshAll = () => { fetchWallets(); fetchNoWallet(); };

    // ── Create wallet ─────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!createEmp) return;
        setCreateLoading(true);
        setCreateError(null);
        try {
            await apiClient<any>("/reimbursements/wallets/create", {
                method: "POST", withAuth: true,
                body: { employee_id: createEmp.employee_id, initial_balance: parseFloat(createBalance) || 0, currency: createCurrency },
            });
            showNotification("Wallet created successfully", "success");
            setShowCreate(false);
            setCreateEmp(null);
            setCreateBalance("");
            refreshAll();
        } catch (e: any) {
            setCreateError(e?.message || "Failed to create wallet");
        } finally {
            setCreateLoading(false);
        }
    };

    // ── Top-up ────────────────────────────────────────────────────────────────
    const handleTopUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topUpWallet || !topUpAmount || parseFloat(topUpAmount) <= 0) return;
        setTopUpLoading(true);
        try {
            const res = await apiClient<any>("/reimbursements/wallets/topup", {
                method: "POST", withAuth: true,
                body: { employee_id: topUpWallet.employee_id, amount: parseFloat(topUpAmount), payment_mode: topUpMode, remarks: topUpRemarks },
            });
            if (res.success) {
                showNotification("Wallet topped up successfully", "success");
                setShowTopUp(false);
                setTopUpWallet(null);
                setTopUpAmount(""); setTopUpRemarks(""); setTopUpMode("Cash");
                fetchWallets();
            }
        } catch (e: any) {
            showNotification(e?.message || "Top-up failed", "error");
        } finally {
            setTopUpLoading(false);
        }
    };

    // ── Toggle lock ───────────────────────────────────────────────────────────
    const toggleLock = async (w: EmployeeWallet) => {
        try {
            const res = await apiClient<any>(`/reimbursements/wallets/${w.employee_id}/lock`, {
                method: "POST", withAuth: true, body: { is_locked: w.is_locked ? 0 : 1 },
            });
            if (res.success) { showNotification(`Wallet ${w.is_locked ? "unlocked" : "locked"}`, "success"); fetchWallets(); }
        } catch (e: any) { showNotification(e?.message || "Failed", "error"); }
    };

    // ── Open ledger ───────────────────────────────────────────────────────────
    const openLedger = async (w: EmployeeWallet, pageNum = 1) => {
        setLedgerWallet(w); setShowLedger(true); setLedgerLoading(true);
        setLedgerPage(pageNum);
        try {
            const res = await apiClient<any>(`/reimbursements/wallets/${w.employee_id}/transactions?page=${pageNum}&limit=${ledgerLimit}`, { method: "GET", withAuth: true });
            if (res.success) {
                setTransactions(res.data || []);
                setLedgerTotal(res.total || 0);
            }
        } catch { } finally { setLedgerLoading(false); }
    };

    const handleLedgerPageChange = (newPage: number) => {
        if (ledgerWallet) {
            openLedger(ledgerWallet, newPage);
        }
    };

    const formatCurrency = (n: number, currency = "INR") =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

    // ── Access Denied check ──────────────────────────────────────────────────
    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                <ShieldOff className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
                <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
                <p className="text-gray-500 max-w-md mt-2 text-sm">
                    You do not have the required permissions to view and manage Employee Wallets. Please contact your organization administrator.
                </p>
            </div>
        );
    }

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (walletsLoading && wallets.length === 0 && noWalletLoading) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Employee Wallets</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Manage individual employee petty cash wallets</p>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-gray-100 rounded-xl p-4 animate-pulse">
                            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                            <div className="h-6 bg-gray-200 rounded w-1/3" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-8 bg-gray-100 rounded mb-4" />
                    {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded mb-2" />)}
                </div>
            </div>
        );
    }

    if (showLedger && ledgerWallet) {
        return (
            <div className="space-y-4">
                {/* ── Ledger Header ────────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => { setShowLedger(false); setTransactions([]); }}
                            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Wallet Ledger</h1>
                            <p className="text-sm text-gray-600 mt-0.5">
                                Transaction history for <span className="font-semibold text-gray-900">{ledgerWallet.first_name} {ledgerWallet.last_name}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── Ledger Entries ───────────────────────────────────────────── */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-gray-400">Transactions</span>
                        <div className="text-xs text-gray-500">
                            Current Balance: <span className="font-bold text-gray-900">{formatCurrency(Number(ledgerWallet.current_balance || 0), ledgerWallet.currency)}</span>
                        </div>
                    </div>

                    <div className="flex-1">
                        {ledgerLoading ? (
                            <div className="py-24 text-center text-gray-400">
                                <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-500 mb-2" />
                                Loading transactions...
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="py-24 text-center text-gray-400 text-sm">No transactions recorded yet.</div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(tx => (
                                    <div key={tx.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50/50 hover:bg-gray-50 border border-gray-100 rounded-xl transition-all gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2.5 rounded-lg mt-0.5 ${tx.type === "Credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                                                {tx.type === "Credit" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-gray-800 text-sm">{tx.reference_type}</span>
                                                    {tx.reference_type === "TopUp" && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            tx.status === "Pending" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                                            tx.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                            "bg-red-50 text-red-700 border border-red-200"
                                                        }`}>
                                                            {tx.status === "Pending" ? "Pending Acknowledgment" : tx.status === "Approved" ? "Acknowledged" : "Rejected"}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">{tx.remarks || "No remarks"}</div>
                                                {tx.rejection_reason && (
                                                    <div className="text-xs text-red-600 font-medium bg-red-50 border border-red-100 rounded px-2.5 py-1 mt-1.5 self-start">
                                                        <span className="font-semibold">Rejection Reason:</span> {tx.rejection_reason}
                                                    </div>
                                                )}
                                                <div className="text-[10px] text-gray-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                                     <span>Added: {new Date(tx.created_at).toLocaleString()} by {tx.added_by_first_name ? `${tx.added_by_first_name} ${tx.added_by_last_name || ""}${tx.added_by_department_name ? ` (${tx.added_by_department_name})` : ""}` : (tx.added_by_name || "HR Admin")}</span>
                                                    {tx.acknowledged_at && (
                                                        <span>Actioned: {new Date(tx.acknowledged_at).toLocaleString()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex md:flex-col justify-between items-center md:items-end">
                                            <div className={`font-bold text-sm ${tx.type === "Credit" ? "text-emerald-600" : "text-red-600"}`}>
                                                {tx.type === "Credit" ? "+" : "–"}{ledgerWallet.currency} {Number(tx.amount || 0).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">Bal: {ledgerWallet.currency} {Number(tx.balance_after || 0).toFixed(2)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {ledgerTotal > ledgerLimit && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                                Showing {(ledgerPage - 1) * ledgerLimit + 1}–{Math.min(ledgerPage * ledgerLimit, ledgerTotal)} of {ledgerTotal}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleLedgerPageChange(ledgerPage - 1)}
                                    disabled={ledgerPage === 1}
                                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleLedgerPageChange(ledgerPage + 1)}
                                    disabled={ledgerPage * ledgerLimit >= ledgerTotal}
                                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="p-6 text-center">
                <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
                <p className="text-gray-500 mt-2">You do not have permission to view employee wallets.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Employee Wallets</h1>
                        <p className="text-sm text-gray-600 mt-0.5">Manage individual employee petty cash wallets</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setFiltersOpen(v => !v)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            Filters
                            {filtersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={refreshAll} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            <RefreshCw className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                </div>

                {filtersOpen && (
                    <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search wallets..."
                                value={walletsSearch}
                                onChange={e => { setWalletsSearch(e.target.value); setWalletsPage(1); }}
                                className="pl-9 pr-3 py-2 w-full border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <select
                            value={walletsDept}
                            onChange={e => { setWalletsDept(e.target.value); setWalletsPage(1); }}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button onClick={refreshAll} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Refresh Data</button>
                    </div>
                )}
            </div>

            {/* ── Stats Cards ───────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider">Total Wallets</p>
                            <p className="text-2xl font-bold text-violet-900 mt-1">{cntWallets}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Wallet className="w-5 h-5 text-violet-600" /></div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Total Balance</p>
                            <p className="text-xl font-bold text-green-900 mt-1">₹{cntBalance.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm"><DollarSign className="w-5 h-5 text-green-600" /></div>
                    </div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Locked</p>
                            <p className="text-2xl font-bold text-red-900 mt-1">{cntLocked}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Lock className="w-5 h-5 text-red-600" /></div>
                    </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">No Wallet</p>
                            <p className="text-2xl font-bold text-amber-900 mt-1">{cntNoWallet}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm"><Users className="w-5 h-5 text-amber-600" /></div>
                    </div>
                </div>
            </div>

            {/* ── Employees Without Wallets ─────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">Employees Without Wallets</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{noWalletTotal} employee{noWalletTotal !== 1 ? "s" : ""} don't have wallets yet</p>
                    </div>
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={noWalletSearch}
                            onChange={e => { setNoWalletSearch(e.target.value); setNoWalletPage(1); }}
                            className="pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {noWalletLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}
                    </div>
                ) : (
                    <>
                        {noWalletEmps.length === 0 ? (
                            <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-900">No employees found without wallets</p>
                                <p className="text-xs text-gray-500 mt-1">All matching active employees have had wallets provisioned.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {noWalletEmps.map(emp => (
                                    <div key={emp.employee_id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                                                    <div className="text-xs text-gray-500">{emp.department_name || "No dept"}</div>
                                                    <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 self-start">
                                                        <AlertCircle className="w-2.5 h-2.5" />
                                                        Cannot submit claims
                                                    </div>
                                                </div>
                                            </div>
                                            {canCreate && (
                                                <button
                                                    onClick={() => { setCreateEmp(emp); setShowCreate(true); setCreateError(null); }}
                                                    className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1 font-medium"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination for no-wallet */}
                        {noWalletTotal > noWalletLimit && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <span className="text-xs text-gray-500">
                                    Showing {(noWalletPage - 1) * noWalletLimit + 1}–{Math.min(noWalletPage * noWalletLimit, noWalletTotal)} of {noWalletTotal}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setNoWalletPage(p => Math.max(1, p - 1))}
                                        disabled={noWalletPage === 1}
                                        className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setNoWalletPage(p => (p * noWalletLimit < noWalletTotal ? p + 1 : p))}
                                        disabled={noWalletPage * noWalletLimit >= noWalletTotal}
                                        className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Wallets Table ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Active Employee Wallets</h3>
                    <span className="text-xs text-gray-400">{walletsTotal} total</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {walletsLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400">
                                        <Loader2 className="w-7 h-7 animate-spin mx-auto text-blue-500 mb-2" />
                                        <div className="text-sm">Loading wallets...</div>
                                    </td>
                                </tr>
                            ) : wallets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-medium text-gray-500">No wallets found</p>
                                        <p className="text-xs text-gray-400 mt-1">Create wallets for employees from the section above</p>
                                    </td>
                                </tr>
                            ) : (
                                wallets.map(w => (
                                    <tr key={w.employee_id} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {w.first_name[0]}{w.last_name[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{w.first_name} {w.last_name}</div>
                                                    <div className="text-xs text-gray-400">ID: {w.employee_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{w.department_name || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-semibold text-gray-900">
                                                {formatCurrency(Number(w.current_balance || 0), w.currency)}
                                            </div>
                                            {Number(w.current_balance) < Number(w.min_balance) && (
                                                <div className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                                                    <AlertCircle className="w-3 h-3" /> Below minimum
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${w.is_locked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                                                {w.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                {w.is_locked ? "Locked" : "Active"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {canTopUp && (
                                                    <button
                                                        onClick={() => { setTopUpWallet(w); setShowTopUp(true); }}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> Top Up
                                                    </button>
                                                )}
                                                {canLock && (
                                                    <button
                                                        onClick={() => toggleLock(w)}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${w.is_locked ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"}`}
                                                    >
                                                        {w.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                                        {w.is_locked ? "Unlock" : "Lock"}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openLedger(w)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> Ledger
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Wallets pagination */}
                {walletsTotal > walletsLimit && (
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                            Showing {(walletsPage - 1) * walletsLimit + 1}–{Math.min(walletsPage * walletsLimit, walletsTotal)} of {walletsTotal} wallets
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => setWalletsPage(p => Math.max(1, p - 1))} disabled={walletsPage === 1}
                                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={() => setWalletsPage(p => (p * walletsLimit < walletsTotal ? p + 1 : p))} disabled={walletsPage * walletsLimit >= walletsTotal}
                                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create Wallet Modal ───────────────────────────────────────── */}
            {showCreate && createEmp && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Create Employee Wallet</h3>
                                <p className="text-sm text-gray-500 mt-0.5">For {createEmp.first_name} {createEmp.last_name}</p>
                            </div>
                            <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {createError && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {createError}
                                </div>
                            )}

                            {/* Employee info card */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {createEmp.first_name[0]}{createEmp.last_name[0]}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">{createEmp.first_name} {createEmp.last_name}</div>
                                    <div className="text-xs text-gray-500">{createEmp.department_name || "No Department"} • ID: {createEmp.employee_id}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial Balance <span className="text-gray-400">(Optional)</span></label>
                                    <div className="relative">
                                        <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="number" min="0" step="0.01" placeholder="0.00"
                                            value={createBalance}
                                            onChange={e => setCreateBalance(e.target.value)}
                                            className="pl-9 pr-3 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                                    <select value={createCurrency} onChange={e => setCreateCurrency(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm">
                                        <option value="INR">Indian Rupee (₹)</option>
                                        <option value="USD">US Dollar ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-700">
                                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                Each employee can have only one wallet. You can top up the balance at any time after creation.
                            </div>
                        </div>

                        <div className="flex gap-3 px-6 pb-6">
                            <button onClick={() => setShowCreate(false)}
                                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleCreate} disabled={createLoading}
                                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {createLoading ? "Creating..." : "Create Wallet"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Top-Up Modal ──────────────────────────────────────────────── */}
            {showTopUp && topUpWallet && (
                <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200 shadow-xl flex flex-col gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Top Up Wallet</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Provision pending top-up funds for {topUpWallet.first_name} {topUpWallet.last_name}</p>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-700 bg-gray-50 px-3 py-2.5 rounded border border-gray-200 font-medium">
                            <span className="text-gray-500">Current Balance</span>
                            <span className="font-bold text-gray-900">{formatCurrency(Number(topUpWallet.current_balance || 0), topUpWallet.currency)}</span>
                        </div>

                        <form onSubmit={handleTopUp} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Amount</label>
                                <input 
                                    type="number" 
                                    required 
                                    placeholder="0.00" 
                                    min="1" 
                                    step="0.01"
                                    value={topUpAmount} 
                                    onChange={e => setTopUpAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-sm font-semibold text-gray-950" 
                                />
                                <div className="grid grid-cols-4 gap-1.5 mt-2">
                                    {[500, 1000, 2000, 5000].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setTopUpAmount(amt.toString())}
                                            className="py-1 text-[11px] font-bold border border-gray-200 rounded hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                                        >
                                            + {amt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
                                <select 
                                    value={topUpMode} 
                                    onChange={e => setTopUpMode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-sm text-gray-950 bg-white"
                                >
                                    <option>Cash</option>
                                    <option value="Bank">Bank Transfer</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Remarks</label>
                                <textarea 
                                    placeholder="Add reason/remarks..." 
                                    value={topUpRemarks} 
                                    onChange={e => setTopUpRemarks(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-600 focus:border-blue-600 text-xs h-16 resize-none text-gray-950" 
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button 
                                    type="button" 
                                    onClick={() => { setShowTopUp(false); setTopUpWallet(null); }}
                                    className="flex-1 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 border border-gray-300 rounded transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={topUpLoading}
                                    className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center gap-1.5 shadow"
                                >
                                    {topUpLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    Top Up
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

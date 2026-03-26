"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    Landmark, CheckCircle2, Clock, Download, X, Search,
    ChevronDown, Banknote, CreditCard, RefreshCw
} from "lucide-react";

interface ReimbursementAccount {
    id: number;
    employee_name: string;
    emp_code?: string;
    department_name?: string;
    reason: string;
    category: string;
    amount: number;
    attachment_url?: string;
    reviewed_by?: string;
    reviewed_at?: string;
    review_notes?: string;
    payment_status?: "Pending" | "Disbursed";
    disbursed_by?: string;
    disbursed_at?: string;
    payment_ref?: string;
    cheque_number?: string;
    transaction_number?: string;
    created_at: string;
}

export default function ReimbursementAccounts() {
    const [items, setItems] = useState<ReimbursementAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentFilter, setPaymentFilter] = useState<"All" | "Pending" | "Disbursed">("All");
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // Disburse modal
    const [disburseModal, setDisburseModal] = useState<ReimbursementAccount | null>(null);
    const [paymentRef, setPaymentRef] = useState("");
    const [chequeNo, setChequeNo] = useState("");
    const [transactionNo, setTransactionNo] = useState("");
    const [disburseLoading, setDisburseLoading] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {};
            if (paymentFilter !== "All") params.payment_status = paymentFilter;
            if (fromDate) params.from_date = fromDate;
            if (toDate) params.to_date = toDate;
            const res = await apiClient.get("/reimbursements/accounts", params, { withAuth: true });
            if (res.success) setItems(res.data || []);
        } catch (e: any) {
            setError(e.message || "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [paymentFilter, fromDate, toDate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const filtered = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(i =>
            i.employee_name?.toLowerCase().includes(q) ||
            i.reason?.toLowerCase().includes(q) ||
            i.emp_code?.toLowerCase().includes(q) ||
            i.payment_ref?.toLowerCase().includes(q)
        );
    }, [items, search]);

    const pendingCount = filtered.filter(i => !i.payment_status || i.payment_status === "Pending").length;
    const disbursedTotal = filtered
        .filter(i => i.payment_status === "Disbursed")
        .reduce((s, i) => s + parseFloat(String(i.amount || 0)), 0);
    const totalAmount = filtered.reduce((s, i) => s + parseFloat(String(i.amount || 0)), 0);

    const handleDisburse = async () => {
        if (!disburseModal) return;
        setDisburseLoading(disburseModal.id);
        try {
            await apiClient.put(`/reimbursements/${disburseModal.id}/disburse`, {
                payment_ref: paymentRef,
                cheque_number: chequeNo,
                transaction_number: transactionNo
            }, { withAuth: true });
            setDisburseModal(null);
            setPaymentRef("");
            setChequeNo("");
            setTransactionNo("");
            fetchData();
        } catch (e: any) {
            alert(e.message || "Failed to mark as disbursed");
        } finally {
            setDisburseLoading(null);
        }
    };

    const fmt = (n: number) => `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
    const fmtDate = (s?: string) => s ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    const paymentBadge = (item: ReimbursementAccount) => {
        const isDisbursed = item.payment_status === "Disbursed";
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isDisbursed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                {isDisbursed ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                {isDisbursed ? "Disbursed" : "Pending Payment"}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center">
                            <Landmark size={16} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-[15px] font-black text-gray-900">Accounts — Reimbursements</h1>
                            <p className="text-[11px] text-gray-400">Approved reimbursements pending payment · Mark disbursed after bank transfer</p>
                        </div>
                    </div>
                    <button onClick={fetchData} className="flex items-center gap-2 text-[11px] font-bold text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                        <RefreshCw size={13} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Total Approved", value: filtered.length.toString(), icon: <Banknote size={16} className="text-black" />, sub: "to process" },
                        { label: "Pending Payment", value: pendingCount.toString(), icon: <Clock size={16} className="text-amber-500" />, sub: "awaiting disbursement" },
                        { label: "Disbursed", value: fmt(disbursedTotal), icon: <CheckCircle2 size={16} className="text-emerald-500" />, sub: `of ${fmt(totalAmount)} total` },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-2">
                                {s.icon}
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                            </div>
                            <p className="text-[22px] font-black text-gray-900">{s.value}</p>
                            <p className="text-[11px] text-gray-400">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
                        <Search size={13} className="text-gray-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, reason, ref…" className="bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none flex-1" />
                    </div>
                    {/* Payment status tabs */}
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {(["All", "Pending", "Disbursed"] as const).map(s => (
                            <button key={s} onClick={() => setPaymentFilter(s)}
                                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${paymentFilter === s ? "bg-black text-white shadow" : "text-gray-500 hover:text-gray-800"}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-700 px-3 py-2 outline-none" />
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-700 px-3 py-2 outline-none" />
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <p className="text-[13px] text-red-500 font-semibold">{error}</p>
                            <button onClick={fetchData} className="text-[11px] underline text-gray-400">Retry</button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <Landmark size={36} className="text-gray-200" />
                            <p className="text-[14px] font-bold text-gray-400">No approved reimbursements</p>
                            <p className="text-[12px] text-gray-300">Items appear here after HR approves them</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        {["#", "Employee", "Category", "Reason", "Amount", "Approved By", "Approved On", "Payment Ref", "Status", "Action"].map(h => (
                                            <th key={h} className="text-left text-[10px] font-black uppercase tracking-widest text-gray-400 px-4 py-3">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item, idx) => {
                                        const isDisbursed = item.payment_status === "Disbursed";
                                        return (
                                            <tr key={item.id} className={`border-b border-gray-50 transition-colors ${isDisbursed ? "bg-emerald-50/20" : "hover:bg-gray-50/60"}`}>
                                                <td className="px-4 py-3 text-gray-400 font-mono">{item.id}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-gray-900">{item.employee_name || "—"}</div>
                                                    <div className="text-[10px] text-gray-400">{item.emp_code || ""}{item.department_name ? ` · ${item.department_name}` : ""}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">{item.category}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={item.reason}>{item.reason}</td>
                                                <td className="px-4 py-3 font-black text-gray-900">{fmt(item.amount)}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.reviewed_by || "—"}</td>
                                                <td className="px-4 py-3 text-gray-400">{fmtDate(item.reviewed_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {item.payment_ref && <span className="font-mono text-[10px] bg-gray-100 px-2 py-0.5 rounded w-fit">Ref: {item.payment_ref}</span>}
                                                        {item.cheque_number && <span className="font-mono text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded w-fit">Chq: {item.cheque_number}</span>}
                                                        {item.transaction_number && <span className="font-mono text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded w-fit">Txn: {item.transaction_number}</span>}
                                                        {!item.payment_ref && !item.cheque_number && !item.transaction_number && <span className="text-gray-300">—</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">{paymentBadge(item)}</td>
                                                <td className="px-4 py-3">
                                                    {!isDisbursed ? (
                                                        <button
                                                            onClick={() => { setDisburseModal(item); setPaymentRef(""); }}
                                                            disabled={disburseLoading === item.id}
                                                            className="flex items-center gap-1.5 bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                                                        >
                                                            <CreditCard size={11} />
                                                            Mark Disbursed
                                                        </button>
                                                    ) : (
                                                        <div className="text-[10px] text-gray-400">
                                                            <div>{item.disbursed_by}</div>
                                                            <div>{fmtDate(item.disbursed_at)}</div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Disburse Confirmation Modal */}
            {disburseModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                                    <CreditCard size={14} className="text-emerald-600" />
                                </div>
                                <h2 className="text-[14px] font-black text-gray-900">Mark as Disbursed</h2>
                            </div>
                            <button onClick={() => setDisburseModal(null)}><X size={16} className="text-gray-400" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            {/* Summary */}
                            <div className="bg-gray-50 rounded-xl p-3 space-y-2 text-[12px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Employee</span>
                                    <span className="font-bold text-gray-900">{disburseModal.employee_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Category</span>
                                    <span className="text-gray-700">{disburseModal.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Amount</span>
                                    <span className="font-black text-gray-900">{fmt(disburseModal.amount)}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cheque No.</label>
                                    <input
                                        value={chequeNo}
                                        onChange={e => setChequeNo(e.target.value)}
                                        placeholder="Optional"
                                        className="mt-1 w-full border border-gray-200 rounded-xl text-[12px] px-3 py-2 text-gray-700 placeholder-gray-400 outline-none focus:border-black"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Transaction No.</label>
                                    <input
                                        value={transactionNo}
                                        onChange={e => setTransactionNo(e.target.value)}
                                        placeholder="Optional"
                                        className="mt-1 w-full border border-gray-200 rounded-xl text-[12px] px-3 py-2 text-gray-700 placeholder-gray-400 outline-none focus:border-black"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payment Reference (Internal)</label>
                                <input
                                    value={paymentRef}
                                    onChange={e => setPaymentRef(e.target.value)}
                                    placeholder="UTR / Internal Ref"
                                    className="mt-1 w-full border border-gray-200 rounded-xl text-[12px] px-3 py-2 text-gray-700 placeholder-gray-400 outline-none focus:border-black"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 p-5 pt-0">
                            <button onClick={() => setDisburseModal(null)} className="flex-1 border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl hover:bg-gray-50">Cancel</button>
                            <button
                                onClick={handleDisburse}
                                disabled={!!disburseLoading}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors disabled:opacity-50"
                            >
                                {disburseLoading ? "…" : "Confirm Disbursed"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

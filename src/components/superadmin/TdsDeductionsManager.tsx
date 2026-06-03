"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import {
    Plus,
    Search,
    Filter,
    Pencil,
    Trash2,
    X,
    FileText,
    Coins,
    DollarSign,
    Calendar,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Info,
    Link2
} from "lucide-react";

type CustomInvoice = {
    id: number;
    invoice_number: string;
    client_name: string;
    total_amount: number;
    status: string;
};

type TdsDeduction = {
    id: number;
    invoice_id: number | null;
    invoice_number: string | null;
    client_name: string;
    amount: number;
    deduction_date: string;
    status: "Claimed" | "Not Claimed";
    remarks: string | null;
};

type TdsStats = {
    totalCount: number;
    totalAmount: number;
    claimedAmount: number;
    unclaimedAmount: number;
};

export default function TdsDeductionsManager() {
    // List & pagination state
    const [deductions, setDeductions] = useState<TdsDeduction[]>([]);
    const [stats, setStats] = useState<TdsStats>({
        totalCount: 0,
        totalAmount: 0,
        claimedAmount: 0,
        unclaimedAmount: 0
    });
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;

    // Filters state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [invoiceFilter, setInvoiceFilter] = useState("");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingDeduction, setEditingDeduction] = useState<TdsDeduction | null>(null);

    // Form inputs state
    const [formData, setFormData] = useState({
        invoice_id: "" as string | number,
        client_name: "",
        amount: "" as string | number,
        deduction_date: new Date().toISOString().split("T")[0],
        status: "Not Claimed" as "Claimed" | "Not Claimed",
        remarks: ""
    });
    const [saving, setSaving] = useState(false);

    // Custom Invoices list for autocomplete dropdown
    const [invoices, setInvoices] = useState<CustomInvoice[]>([]);
    const [invoiceSearch, setInvoiceSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState("");

    // Fetch TDS Deductions
    const fetchDeductions = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append("page", String(page));
            params.append("limit", String(pageSize));
            if (searchQuery) params.append("search", searchQuery);
            if (statusFilter) params.append("status", statusFilter);
            if (invoiceFilter) params.append("invoice_id", invoiceFilter);

            const res = await apiClient.get(`/superadmin/tds-deductions?${params.toString()}`);

            if (res.success) {
                setDeductions(res.deductions || []);
                setStats(res.stats || { totalCount: 0, totalAmount: 0, claimedAmount: 0, unclaimedAmount: 0 });
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalItems(res.pagination?.total || 0);
            }
        } catch (error: any) {
            console.error("Error fetching TDS deductions:", error);
            toast.error(error.message || "Failed to fetch TDS deductions");
        } finally {
            setLoading(false);
        }
    }, [page, searchQuery, statusFilter, invoiceFilter]);

    // Fetch Custom Invoices for dropdown
    const fetchInvoices = async () => {
        try {
            const res = await apiClient.get("/superadmin/custom-invoices", { limit: 1000 });
            if (res.success) {
                setInvoices(res.invoices || []);
            }
        } catch (error) {
            console.error("Error fetching custom invoices:", error);
        }
    };

    useEffect(() => {
        fetchDeductions();
    }, [fetchDeductions]);

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Handle Delete
    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this TDS deduction log?")) return;

        try {
            await apiClient.delete(`/superadmin/tds-deductions/${id}`);
            toast.success("TDS deduction log entry deleted successfully");
            fetchDeductions();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete TDS deduction log");
        }
    };

    // Toggle Claim Status Inline
    const handleToggleStatus = async (deduction: TdsDeduction) => {
        const newStatus = deduction.status === "Claimed" ? "Not Claimed" : "Claimed";
        try {
            await apiClient.patch(`/superadmin/tds-deductions/${deduction.id}/status`, {
                status: newStatus
            });
            toast.success(`Status updated to ${newStatus}`);
            fetchDeductions();
        } catch (error: any) {
            toast.error(error.message || "Failed to toggle status");
        }
    };

    // Open Modal for Create or Edit
    const handleOpenModal = (deduction: TdsDeduction | null = null) => {
        if (deduction) {
            setEditingDeduction(deduction);
            setFormData({
                invoice_id: deduction.invoice_id || "",
                client_name: deduction.client_name,
                amount: deduction.amount,
                deduction_date: deduction.deduction_date,
                status: deduction.status,
                remarks: deduction.remarks || ""
            });
            if (deduction.invoice_id && deduction.invoice_number) {
                setSelectedInvoiceNumber(deduction.invoice_number);
                setInvoiceSearch(deduction.invoice_number);
            } else {
                setSelectedInvoiceNumber("");
                setInvoiceSearch("");
            }
        } else {
            setEditingDeduction(null);
            setFormData({
                invoice_id: "",
                client_name: "",
                amount: "",
                deduction_date: new Date().toISOString().split("T")[0],
                status: "Not Claimed",
                remarks: ""
            });
            setSelectedInvoiceNumber("");
            setInvoiceSearch("");
        }
        setShowModal(true);
    };

    // Submit Log Form
    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();

        const amountVal = Number(formData.amount);
        if (!amountVal || amountVal <= 0) {
            toast.error("Amount must be a positive number");
            return;
        }

        if (!formData.client_name) {
            toast.error("Client name is required");
            return;
        }

        if (!formData.deduction_date) {
            toast.error("Deduction date is required");
            return;
        }

        const payload = {
            invoice_id: formData.invoice_id || null,
            client_name: formData.client_name.trim(),
            amount: amountVal,
            deduction_date: formData.deduction_date,
            status: formData.status,
            remarks: formData.remarks || null
        };

        try {
            setSaving(true);
            const method = editingDeduction ? apiClient.put : apiClient.post;
            const url = editingDeduction ? `/superadmin/tds-deductions/${editingDeduction.id}` : "/superadmin/tds-deductions";
            
            const res = await method(url, payload);
            if (res.success) {
                toast.success(editingDeduction ? "TDS deduction updated successfully" : "TDS deduction logged successfully");
                setShowModal(false);
                fetchDeductions();
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to save TDS entry");
        } finally {
            setSaving(false);
        }
    };

    // Filter invoices on search query
    const filteredInvoices = invoices.filter((inv) => {
        const matchesRef = (inv.invoice_number || "").toLowerCase().includes(invoiceSearch.toLowerCase());
        const matchesClient = (inv.client_name || "").toLowerCase().includes(invoiceSearch.toLowerCase());
        return matchesRef || matchesClient;
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatDateStr = (dateStr: string) => {
        if (!dateStr) return "-";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-black tracking-tighter flex items-center gap-3">
                            <Coins size={32} className="text-black" /> TDS Deductions Ledger
                        </h1>
                        <p className="text-black/60 font-medium mt-2">
                            Log and audit Tax Deductions at Source (TDS) claimed on manual client invoices.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="self-start md:self-auto flex items-center gap-3 bg-black hover:bg-zinc-800 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-gray-200 transition-all uppercase text-[10px] tracking-widest cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Log TDS Deduction
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Logs</p>
                        <p className="text-3xl font-black text-black mt-2">{stats.totalCount}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 text-black rounded-2xl shrink-0">
                        <FileText className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Deducted</p>
                        <p className="text-3xl font-black text-black mt-2">{formatCurrency(stats.totalAmount)}</p>
                    </div>
                    <div className="p-4 bg-zinc-50 text-black rounded-2xl shrink-0">
                        <Coins className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Claimed</p>
                        <p className="text-3xl font-black text-green-600 mt-2">{formatCurrency(stats.claimedAmount)}</p>
                    </div>
                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unclaimed</p>
                        <p className="text-3xl font-black text-red-600 mt-2">{formatCurrency(stats.unclaimedAmount)}</p>
                    </div>
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl shrink-0">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-xs">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by client name, invoice number, or remarks..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm placeholder-gray-400 transition-all font-bold text-black"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-3 shrink-0">
                        {/* Status Filter */}
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[160px]">
                            <Filter className="w-4 h-4 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full text-xs font-black uppercase tracking-wider text-gray-700 focus:outline-hidden cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                <option value="Claimed">Claimed</option>
                                <option value="Not Claimed">Not Claimed</option>
                            </select>
                        </div>

                        {/* Invoice selector filter */}
                        <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white min-w-[180px]">
                            <Link2 className="w-4 h-4 text-gray-400" />
                            <select
                                value={invoiceFilter}
                                onChange={(e) => {
                                    setInvoiceFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full text-xs font-black uppercase tracking-wider text-gray-700 focus:outline-hidden cursor-pointer"
                            >
                                <option value="">All Invoices</option>
                                {invoices.map((inv) => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.invoice_number} ({inv.client_name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Reset filters */}
                        {(searchQuery || statusFilter || invoiceFilter) && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("");
                                    setInvoiceFilter("");
                                    setPage(1);
                                }}
                                className="px-4 py-2.5 text-xs font-black text-black/60 hover:text-black hover:bg-gray-50 rounded-xl transition-all uppercase tracking-wider cursor-pointer"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Ledger Ledger Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-3">
                        <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading ledger data...</p>
                    </div>
                ) : deductions.length === 0 ? (
                    <div className="p-16 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4 opacity-30" />
                        <h3 className="text-lg font-black text-black">No TDS logs found</h3>
                        <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
                            No Tax Deductions found for the active search scope. Add an entry to get started.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-5">Client / Reference</th>
                                    <th className="px-6 py-5">Deduction Date</th>
                                    <th className="px-6 py-5 text-right">Amount</th>
                                    <th className="px-6 py-5">Remarks</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {deductions.map((deduction) => (
                                    <tr key={deduction.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900">{deduction.client_name}</div>
                                            {deduction.invoice_id ? (
                                                <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-blue-600 uppercase tracking-wider">
                                                    <Link2 className="w-3 h-3" />
                                                    Linked: {deduction.invoice_number}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-1">
                                                    Direct Ledger Book
                                                </div>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-gray-600 text-xs font-bold">
                                                <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                                                <span>{formatDateStr(deduction.deduction_date)}</span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 text-right font-black text-gray-900 whitespace-nowrap">
                                            {formatCurrency(deduction.amount)}
                                        </td>

                                        <td className="px-6 py-4 max-w-xs">
                                            <p className="truncate text-xs font-medium text-gray-600" title={deduction.remarks || ""}>
                                                {deduction.remarks || (
                                                    <span className="text-xs text-gray-300 italic">No notes</span>
                                                )}
                                            </p>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider ${
                                                        deduction.status === "Claimed"
                                                            ? "bg-green-50 border-green-200 text-green-700"
                                                            : "bg-amber-50 border-amber-200 text-amber-700"
                                                    }`}
                                                >
                                                    {deduction.status}
                                                </span>
                                                <button
                                                    onClick={() => handleToggleStatus(deduction)}
                                                    className="text-xs font-black text-blue-600 hover:text-blue-700 hover:underline cursor-pointer uppercase tracking-wider"
                                                >
                                                    Mark {deduction.status === "Claimed" ? "Unclaimed" : "Claimed"}
                                                </button>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(deduction)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100 transition-all cursor-pointer"
                                                    title="Edit deduction"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(deduction.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100 transition-all cursor-pointer"
                                                    title="Delete log"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && deductions.length > 0 && totalPages > 1 && (
                    <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-500 uppercase">
                            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalItems)} of {totalItems} logs
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 hover:bg-gray-150 disabled:opacity-30 transition-all cursor-pointer"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 hover:bg-gray-150 disabled:opacity-30 transition-all cursor-pointer"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Dialog */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-xs animate-fade-in" onClick={() => !saving && setShowModal(false)} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/30 shrink-0">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                                {editingDeduction ? "Edit TDS Log Entry" : "Log TDS Deduction"}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white rounded-full transition-all shadow-sm cursor-pointer"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmitForm} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Link Custom Invoice */}
                            <div className="relative">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Link Existing Invoice (Optional)
                                </label>
                                {selectedInvoiceNumber ? (
                                    <div className="flex items-center justify-between px-4 py-3 border border-blue-200 bg-blue-50/30 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Link2 className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-bold text-blue-900">
                                                Invoice: {selectedInvoiceNumber}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedInvoiceNumber("");
                                                setFormData({ ...formData, invoice_id: "", client_name: "" });
                                            }}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search invoices by INV Ref or client name..."
                                                value={invoiceSearch}
                                                onChange={(e) => {
                                                    setInvoiceSearch(e.target.value);
                                                    setShowDropdown(true);
                                                }}
                                                onFocus={() => setShowDropdown(true)}
                                                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                            />
                                        </div>

                                        {showDropdown && (
                                            <div className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg divide-y divide-gray-50">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedInvoiceNumber("Direct / Unlinked");
                                                        setFormData({ ...formData, invoice_id: "" });
                                                        setInvoiceSearch("");
                                                        setShowDropdown(false);
                                                    }}
                                                    className="w-full px-4 py-3 text-left text-xs hover:bg-gray-50 text-gray-500 italic font-black uppercase cursor-pointer"
                                                >
                                                    Do Not Link (Direct Deduction Entry)
                                                </button>

                                                {filteredInvoices.length === 0 ? (
                                                    <div className="px-4 py-3 text-xs text-gray-400 italic text-center font-bold">
                                                        No custom invoices found
                                                    </div>
                                                ) : (
                                                    filteredInvoices.map((inv) => (
                                                        <button
                                                            key={inv.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedInvoiceNumber(inv.invoice_number);
                                                                setFormData({ 
                                                                    ...formData, 
                                                                    invoice_id: inv.id,
                                                                    client_name: inv.client_name 
                                                                });
                                                                setInvoiceSearch("");
                                                                setShowDropdown(false);
                                                            }}
                                                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 text-sm flex flex-col cursor-pointer"
                                                        >
                                                            <span className="font-bold text-gray-800">
                                                                {inv.invoice_number}
                                                            </span>
                                                            <span className="text-xs text-gray-400 font-bold uppercase mt-0.5">
                                                                Client: {inv.client_name} • Total: {formatCurrency(inv.total_amount)}
                                                            </span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Client Name */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Client / Organization Name *
                                </label>
                                <input
                                    type="text"
                                    disabled={!!formData.invoice_id}
                                    required
                                    value={formData.client_name}
                                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                                    placeholder="Enter client name..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black disabled:opacity-60 disabled:bg-gray-50"
                                />
                                {formData.invoice_id && (
                                    <p className="text-[10px] text-gray-400 font-semibold mt-1">
                                        Client name automatically populated from invoice details.
                                    </p>
                                )}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Deducted Amount (INR ₹) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    required
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Deduction Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.deduction_date}
                                    onChange={(e) => setFormData({ ...formData, deduction_date: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Claim Status
                                </label>
                                <select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as "Claimed" | "Not Claimed"
                                        })
                                    }
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold text-black cursor-pointer"
                                >
                                    <option value="Not Claimed">Not Claimed</option>
                                    <option value="Claimed">Claimed</option>
                                </select>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Remarks / Notes
                                </label>
                                <textarea
                                    value={formData.remarks}
                                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                    rows={3}
                                    placeholder="Enter reference receipt numbers, challan details, or quarterly filing logs..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium text-black"
                                />
                            </div>

                            {/* Actions Footer inside modal */}
                            <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-xs uppercase tracking-wider cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-3 bg-black hover:bg-zinc-800 disabled:opacity-50 text-white font-black rounded-xl transition-all text-xs uppercase tracking-widest cursor-pointer"
                                >
                                    {saving ? "Saving..." : editingDeduction ? "Update Log" : "Log Deduction"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

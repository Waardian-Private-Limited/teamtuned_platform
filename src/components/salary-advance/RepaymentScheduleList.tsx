"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { ChevronDown, ChevronRight, Search, Filter, RefreshCw, DollarSign, Calendar, CheckCircle, AlertCircle, Clock, Shield } from "lucide-react";
import Pagination from "./Pagination";
import TableSkeleton from "./TableSkeleton";

import { useAuth } from "@/context/AuthContext";
type RepaymentSchedule = {
    request_id: number;
    approved_amount: number;
    total_amount_with_interest: number;
    interest_amount: number;
    monthly_emi_amount: number;
    repayment_months: number;
    repayment_status: string;
    total_paid: number;
    request_date: string;
    employee_id: number;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string | number;
    department_name: string;
    total_emis: number;
    paid_emis: number;
    overdue_emis: number;
    total_paid_amount: number;
    pending_amount: number;
    disbursed_at?: string | null;
    disbursement_mode?: string | null;
    disbursement_reference?: string | null;
    disbursed_by_name?: string | null;
};

type EMI = {
    id: number;
    emi_number: number;
    emi_amount: number;
    due_date: string;
    status: string;
    paid_date: string | null;
    paid_amount: number | null;
    payment_mode: string | null;
    paused_by_name?: string | null;
    paused_at?: string | null;
    skipped_by_name?: string | null;
    skipped_at?: string | null;
    updated_status_by_name?: string | null;
    updated_status_at?: string | null;
    merged_from_emi_id?: number | null;
    merged_amount_added?: number | null;
};

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

export default function RepaymentScheduleList() {
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [emis, setEmis] = useState<Record<number, EMI[]>>({});
    const [loadingEmis, setLoadingEmis] = useState<Record<number, boolean>>({});
    const [stats, setStats] = useState<{
        total_outstanding: number;
        total_collected: number;
        overdue_emis: number;
        active_schedules: number;
    } | null>(null);

    const [selectedEmi, setSelectedEmi] = useState<any>(null);
    const [showPauseModal, setShowPauseModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false);
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [skipReason, setSkipReason] = useState("");
    const [rescheduleMonth, setRescheduleMonth] = useState("");
    const [skipConflict, setSkipConflict] = useState<{
        conflict: boolean;
        existing_emi?: { id: number; emi_number: number; emi_amount: number; due_date: string; status: string };
        skipped_emi_remaining?: number;
        merged_total?: number;
    } | null>(null);
    const [skipMergeChoice, setSkipMergeChoice] = useState<'merge' | 'separate' | null>(null);
    const [checkingConflict, setCheckingConflict] = useState(false);

    // Form inputs
    const [editAmount, setEditAmount] = useState("");
    // Which payroll run collects this instalment. Separate from the amount so a
    // plan can be moved without being re-split.
    const [editDueDate, setEditDueDate] = useState("");
    const [adjustType, setAdjustType] = useState("distribute"); // 'distribute', 'next_emi', 'last_emi', 'none'
    const [payAmount, setPayAmount] = useState("");
    const [paymentMode, setPaymentMode] = useState("cash");
    const [paymentNotes, setPaymentNotes] = useState("");
    const [paymentRef, setPaymentRef] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 15;

    // Derive auth directly from useAuth — no stale local copy
    const { role, permissions } = useAuth();
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const canView = isOrgAdmin || permissions.some(p => ["SALADV_VIEW", "SALADV_PAY"].includes(p));

    const outstandingCount = useCountUp(stats?.total_outstanding || 0);
    const collectedCount = useCountUp(stats?.total_collected || 0);
    const overdueCount = useCountUp(stats?.overdue_emis || 0);
    const activeCount = useCountUp(stats?.active_schedules || 0);

    useEffect(() => {
        // role starts null while useAuth loads; wait until it resolves
        if (role === null) return;
        if (canView) {
            fetchSchedules();
        }
    }, [currentPage, role, canView]);

    const fetchSchedules = async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const data = await apiClient<{
                schedules: any[];
                total: number;
                page: number;
                totalPages: number;
                stats?: {
                    total_outstanding: number;
                    total_collected: number;
                    overdue_emis: number;
                    active_schedules: number;
                };
            }>(
                "/salary-advance/repayments/schedule-list",
                {
                    withAuth: true,
                    params: { page: currentPage.toString(), limit: itemsPerPage.toString() }
                }
            );

            // Parse string numbers to actual numbers
            const parsedSchedules = (data.schedules || []).map(s => ({
                ...s,
                approved_amount: Number(s.approved_amount || 0),
                total_amount_with_interest: Number(s.total_amount_with_interest || 0),
                interest_amount: Number(s.interest_amount || 0),
                monthly_emi_amount: Number(s.monthly_emi_amount || 0),
                total_paid: Number(s.total_paid || 0),
                total_paid_amount: Number(s.total_paid_amount || 0),
                pending_amount: Number(s.pending_amount || 0),
                total_emis: Number(s.total_emis || 0),
                paid_emis: Number(s.paid_emis || 0),
                overdue_emis: Number(s.overdue_emis || 0),
            }));

            setSchedules(parsedSchedules);
            setTotalItems(data.total || 0);
            setTotalPages(data.totalPages || 1);
            if (data.stats) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error("Failed to fetch schedules:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePauseEmi = async () => {
        if (!selectedEmi) return;
        setLoading(true);
        try {
            await apiClient(`/salary-advance/repayments/${selectedEmi.id}/pause`, {
                method: "POST",
                withAuth: true
            });
            setShowPauseModal(false);
            fetchSchedules();
            // Reload EMIs for the request
            const data = await apiClient<{ repayments: EMI[] }>(
                `/salary-advance/requests/${selectedEmi.request_id}/repayments`,
                { withAuth: true }
            );
            setEmis(prev => ({ ...prev, [selectedEmi.request_id]: data.repayments || [] }));
        } catch (error) {
            console.error("Failed to pause EMI:", error);
            alert("Failed to pause EMI. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    const handleSkipEmi = async () => {
        if (!selectedEmi || !rescheduleMonth) return;
        // If conflict detected, require a choice
        if (skipConflict?.conflict && skipMergeChoice === null) return;
        setLoading(true);
        try {
            const shouldMerge = skipConflict?.conflict && skipMergeChoice === 'merge';
            await apiClient(`/salary-advance/repayments/${selectedEmi.id}/skip`, {
                method: "POST",
                withAuth: true,
                body: {
                    reschedule_month: rescheduleMonth,
                    reason: skipReason,
                    merge: shouldMerge,
                }
            });
            setShowSkipModal(false);
            setSkipConflict(null);
            setSkipMergeChoice(null);
            fetchSchedules();
            const data = await apiClient<{ repayments: EMI[] }>(
                `/salary-advance/requests/${selectedEmi.request_id}/repayments`,
                { withAuth: true }
            );
            setEmis(prev => ({ ...prev, [selectedEmi.request_id]: data.repayments || [] }));
        } catch (error) {
            console.error("Failed to skip EMI:", error);
            alert("Failed to skip EMI. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const checkMonthConflict = async (month: string) => {
        if (!selectedEmi || !month) { setSkipConflict(null); setSkipMergeChoice(null); return; }
        setCheckingConflict(true);
        setSkipMergeChoice(null);
        try {
            const result = await apiClient<any>(
                `/salary-advance/repayments/${selectedEmi.id}/check-month-conflict`,
                { withAuth: true, params: { reschedule_month: month } }
            );
            setSkipConflict(result);
        } catch {
            setSkipConflict(null);
        } finally {
            setCheckingConflict(false);
        }
    };

    const handleStatusUpdate = async (emiId: number, newStatus: string, requestId: number) => {
        setLoading(true);
        try {
            await apiClient(`/salary-advance/repayments/${emiId}/status`, {
                method: "PUT",
                withAuth: true,
                body: { status: newStatus }
            });
            fetchSchedules();
            const data = await apiClient<{ repayments: EMI[] }>(
                `/salary-advance/requests/${requestId}/repayments`,
                { withAuth: true }
            );
            setEmis(prev => ({ ...prev, [requestId]: data.repayments || [] }));
        } catch (error) {
            console.error("Failed to update EMI status:", error);
            alert("Failed to update EMI status. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    const handleEditEmi = async () => {
        if (!selectedEmi || !editAmount || Number(editAmount) < 0) return;
        setLoading(true);
        try {
            await apiClient(`/salary-advance/repayments/${selectedEmi.id}`, {
                method: "PUT",
                withAuth: true,
                body: {
                    emi_amount: Number(editAmount),
                    // Only sent when actually moved. Passing the unchanged date
                    // back would be harmless but makes the intent muddier in
                    // the logs when something later needs explaining.
                    ...(editDueDate && editDueDate !== selectedEmi.due_date?.slice(0, 10)
                        ? { due_date: editDueDate }
                        : {}),
                    adjust_type: adjustType
                }
            });
            setShowEditModal(false);
            fetchSchedules();
            // Reload EMIs
            const data = await apiClient<{ repayments: EMI[] }>(
                `/salary-advance/requests/${selectedEmi.request_id}/repayments`,
                { withAuth: true }
            );
            setEmis(prev => ({ ...prev, [selectedEmi.request_id]: data.repayments || [] }));
        } catch (error) {
            console.error("Failed to edit EMI amount:", error);
            alert("Failed to edit EMI amount. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handlePayEmi = async () => {
        if (!selectedEmi || !payAmount || Number(payAmount) <= 0) return;
        setLoading(true);
        try {
            await apiClient(`/salary-advance/repayments/${selectedEmi.id}/pay`, {
                method: "POST",
                withAuth: true,
                body: {
                    amount: Number(payAmount),
                    payment_mode: paymentMode,
                    transaction_ref: paymentRef,
                    notes: paymentNotes
                }
            });
            setShowPayModal(false);
            fetchSchedules();
            // Reload EMIs
            const data = await apiClient<{ repayments: EMI[] }>(
                `/salary-advance/requests/${selectedEmi.request_id}/repayments`,
                { withAuth: true }
            );
            setEmis(prev => ({ ...prev, [selectedEmi.request_id]: data.repayments || [] }));
        } catch (error) {
            console.error("Failed to record repayment:", error);
            alert("Failed to record repayment. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = async (requestId: number) => {
        if (expandedRows.includes(requestId)) {
            setExpandedRows(expandedRows.filter(id => id !== requestId));
            return;
        }

        setExpandedRows([...expandedRows, requestId]);

        if (!emis[requestId]) {
            setLoadingEmis(prev => ({ ...prev, [requestId]: true }));
            try {
                const data = await apiClient<{ repayments: EMI[] }>(
                    `/salary-advance/requests/${requestId}/repayments`,
                    { withAuth: true }
                );
                setEmis(prev => ({ ...prev, [requestId]: data.repayments || [] }));
            } catch (error) {
                console.error("Failed to fetch EMIs:", error);
            } finally {
                setLoadingEmis(prev => ({ ...prev, [requestId]: false }));
            }
        }
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'text-green-600 bg-green-50 border-green-200';
            case 'overdue': return 'text-red-600 bg-red-50 border-red-200';
            case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'skipped': return 'text-purple-600 bg-purple-50 border-purple-200';
            case 'partial': return 'text-orange-600 bg-orange-50 border-orange-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return 'bg-green-500';
        if (percent >= 50) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

    if (role === null) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
                <Shield size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                <p className="mt-2">You do not have permission to view repayment schedules.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Repayment Schedules</h1>
                    <p className="text-sm text-gray-500 mt-1">Track repayment progress and EMI details</p>
                </div>
                <button
                    onClick={fetchSchedules}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Total Outstanding</p>
                            <p className="text-2xl font-bold text-orange-900 mt-1">₹{outstandingCount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <DollarSign className="w-5 h-5 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Total Collected</p>
                            <p className="text-2xl font-bold text-green-900 mt-1">₹{collectedCount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Overdue EMIs</p>
                            <p className="text-2xl font-bold text-red-900 mt-1">{overdueCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Active Schedules</p>
                            <p className="text-2xl font-bold text-blue-900 mt-1">{activeCount}</p>
                        </div>
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                            <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={10} columns={5} />
                ) : schedules.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No active repayments</h3>
                        <p className="text-gray-500 mt-1">There are no approved salary advances with repayment schedules</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="w-10 px-4 py-3"></th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Loan Breakdown</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Repayment</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {schedules.map((schedule) => {
                                        const progress = schedule.total_amount_with_interest > 0
                                            ? (schedule.total_paid_amount / schedule.total_amount_with_interest) * 100
                                            : 0;
                                        const isExpanded = expandedRows.includes(schedule.request_id);

                                        return (
                                            <React.Fragment key={schedule.request_id}>
                                                <tr className={`hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}`}>
                                                    <td className="px-4 py-4">
                                                        <button
                                                            onClick={() => toggleRow(schedule.request_id)}
                                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown size={16} className="text-gray-500" />
                                                            ) : (
                                                                <ChevronRight size={16} className="text-gray-500" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                                                                {schedule.first_name[0]}{schedule.last_name[0]}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">
                                                                    {schedule.first_name} {schedule.last_name}
                                                                </div>
                                                                <div className="text-xs text-gray-500">{schedule.department_name}</div>
                                                                <div className="text-xs text-gray-400">{schedule.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {formatCurrency(schedule.approved_amount)} <span className="text-gray-400 font-normal text-xs">(Principal)</span>
                                                        </div>
                                                        <div className="text-xs text-red-500">
                                                            + {formatCurrency(schedule.interest_amount)} Interest
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            Total: {formatCurrency(schedule.total_amount_with_interest)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-full max-w-[140px]">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-gray-600">{Math.round(progress)}%</span>
                                                                <span className="text-gray-500">{schedule.paid_emis}/{schedule.total_emis} EMIs</span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${getProgressColor(progress)}`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                EMI: {formatCurrency(schedule.monthly_emi_amount)}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${schedule.repayment_status === 'completed'
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                            {schedule.repayment_status === 'completed' ? 'Completed' : 'Active'}
                                                        </span>
                                                        <div className="text-xs text-gray-400 mt-1">
                                                            {formatDate(schedule.request_date)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-medium text-gray-900">
                                                            {formatCurrency(schedule.pending_amount)}
                                                        </div>
                                                        {schedule.overdue_emis > 0 && (
                                                            <div className="text-xs text-red-600 font-medium mt-1">
                                                                {schedule.overdue_emis} Overdue
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded EMI Details */}
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={6} className="px-0 py-0 border-b border-gray-200 bg-gray-50/50">
                                                            <div className="p-4 pl-14">
                                                                {loadingEmis[schedule.request_id] ? (
                                                                    <div className="flex justify-center py-4">
                                                                        <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-4">
                                                                        {/* Disbursement Details */}
                                                                        {schedule.disbursed_at && (
                                                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                                                                <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                                                                                    <CheckCircle size={14} className="text-green-600" />
                                                                                    Disbursement Information
                                                                                </h4>
                                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                                                    <div>
                                                                                        <div className="text-green-700 font-medium mb-1">Disbursed On</div>
                                                                                        <div className="text-green-900 font-semibold">{formatDate(schedule.disbursed_at)}</div>
                                                                                    </div>
                                                                                    {schedule.disbursement_mode && (
                                                                                        <div>
                                                                                            <div className="text-green-700 font-medium mb-1">Payment Mode</div>
                                                                                            <div className="text-green-900 capitalize">{schedule.disbursement_mode.replace('_', ' ')}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {schedule.disbursement_reference && (
                                                                                        <div>
                                                                                            <div className="text-green-700 font-medium mb-1">Reference</div>
                                                                                            <div className="text-green-900">{schedule.disbursement_reference}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {schedule.disbursed_by_name && (
                                                                                        <div>
                                                                                            <div className="text-green-700 font-medium mb-1">Disbursed By</div>
                                                                                            <div className="text-green-900">{schedule.disbursed_by_name}</div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {/* EMI Schedule Table */}
                                                                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                                            <table className="w-full text-sm">
                                                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                                                    <tr>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">EMI #</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Due Date</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Amount</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Status</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Paid Date</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Mode</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Ref</th>
                                                                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Notes</th>
                                                                                        <th className="px-4 py-2 text-right font-medium text-gray-500">Actions</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-100">
                                                                                    {emis[schedule.request_id]?.map((emi: any) => (
                                                                                        <tr key={emi.id} className="hover:bg-gray-50">
                                                                                            <td className="px-4 py-2 text-gray-900">{emi.emi_number}</td>
                                                                                            <td className="px-4 py-2 text-gray-600">
                                                                                                <div>{formatDate(emi.due_date)}</div>
                                                                                                {emi.paused_by_name && (
                                                                                                    <div className="text-[10px] text-amber-600 font-medium mt-0.5" title={emi.paused_at ? `Paused on ${new Date(emi.paused_at).toLocaleString()}` : ""}>
                                                                                                        Paused by {emi.paused_by_name}
                                                                                                    </div>
                                                                                                )}
                                                                                                {emi.skipped_by_name && (
                                                                                                    <div className="text-[10px] text-indigo-600 font-medium mt-0.5" title={emi.skipped_at ? `Skipped on ${new Date(emi.skipped_at).toLocaleString()}` : ""}>
                                                                                                        Skipped by {emi.skipped_by_name}
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-4 py-2 font-medium text-gray-900">{formatCurrency(emi.emi_amount)}</td>
                                                                                            <td className="px-4 py-2">
                                                                                                <div>
                                                                                                    {canView ? (
                                                                                                        <select
                                                                                                            value={emi.status}
                                                                                                            onChange={async (e) => {
                                                                                                                const newStatus = e.target.value;
                                                                                                                if (newStatus === 'skipped') {
                                                                                                                    setSelectedEmi(emi);
                                                                                                                    setSkipReason("");
                                                                                                                    const scheduleEmis = emis[schedule.request_id] || [];
                                                                                                                    const lastDateStr = scheduleEmis.reduce((last, curr) => curr.due_date > last ? curr.due_date : last, emi.due_date);
                                                                                                                    const lastDate = new Date(lastDateStr);
                                                                                                                    lastDate.setMonth(lastDate.getMonth() + 1);
                                                                                                                    const defMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;
                                                                                                                    setRescheduleMonth(defMonth);
                                                                                                                    setShowSkipModal(true);
                                                                                                                } else {
                                                                                                                    await handleStatusUpdate(emi.id, newStatus, schedule.request_id);
                                                                                                                }
                                                                                                            }}
                                                                                                            className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${getStatusColor(emi.status)}`}
                                                                                                        >
                                                                                                            <option value="pending">Pending</option>
                                                                                                            <option value="paid">Paid</option>
                                                                                                            <option value="overdue">Overdue</option>
                                                                                                            <option value="partial">Partial</option>
                                                                                                            <option value="skipped">Skipped</option>
                                                                                                        </select>
                                                                                                    ) : (
                                                                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(emi.status)}`}>
                                                                                                            {emi.status}
                                                                                                        </span>
                                                                                                    )}
                                                                                                    {emi.updated_status_by_name && (
                                                                                                        <div className="text-[10px] text-gray-400 mt-1" title={emi.updated_status_at ? `Updated on ${new Date(emi.updated_status_at).toLocaleString()}` : ""}>
                                                                                                            by {emi.updated_status_by_name}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-4 py-2 text-gray-600">{formatDate(emi.paid_date || '')}</td>
                                                                                            <td className="px-4 py-2 text-gray-600">{emi.payment_mode || '-'}</td>
                                                                                            <td className="px-4 py-2 text-gray-600 text-xs">{emi.transaction_ref || '-'}</td>
                                                                                            <td className="px-4 py-2 text-gray-600 text-xs max-w-[150px] truncate" title={emi.notes}>{emi.notes || '-'}</td>
                                                                                            <td className="px-4 py-2 text-right">
                                                                                                {(emi.status === 'pending' || emi.status === 'partial') && canView && (
                                                                                                    <div className="flex justify-end gap-1.5">
                                                                                                        {emi.status === 'pending' && (
                                                                                                            <>
                                                                                                                <button
                                                                                                                    onClick={() => {
                                                                                                                        setSelectedEmi(emi);
                                                                                                                        setShowPauseModal(true);
                                                                                                                    }}
                                                                                                                    className="px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 transition-colors"
                                                                                                                >
                                                                                                                    Pause
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    onClick={() => {
                                                                                                                        setSelectedEmi(emi);
                                                                                                                        setSkipReason("");
                                                                                                                        const scheduleEmis = emis[schedule.request_id] || [];
                                                                                                                        const lastDateStr = scheduleEmis.reduce((last, curr) => curr.due_date > last ? curr.due_date : last, emi.due_date);
                                                                                                                        const lastDate = new Date(lastDateStr);
                                                                                                                        lastDate.setMonth(lastDate.getMonth() + 1);
                                                                                                                        const defMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;
                                                                                                                        setRescheduleMonth(defMonth);
                                                                                                                        setShowSkipModal(true);
                                                                                                                    }}
                                                                                                                    className="px-2 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                                                                                                >
                                                                                                                    Skip Month
                                                                                                                </button>
                                                                                                            </>
                                                                                                        )}
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                setSelectedEmi(emi);
                                                                                                                setEditAmount(String(emi.emi_amount));
                                                                                                                setEditDueDate(String(emi.due_date || "").slice(0, 10));
                                                                                                                setAdjustType("distribute");
                                                                                                                setShowEditModal(true);
                                                                                                            }}
                                                                                                            className="px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                                                                                                        >
                                                                                                            Edit
                                                                                                        </button>
                                                                                                        <button
                                                                                                            onClick={() => {
                                                                                                                setSelectedEmi(emi);
                                                                                                                setPayAmount(String(Number(emi.emi_amount) - Number(emi.paid_amount || 0)));
                                                                                                                setPaymentMode("cash");
                                                                                                                setPaymentNotes("");
                                                                                                                setPaymentRef("");
                                                                                                                setShowPayModal(true);
                                                                                                            }}
                                                                                                            className="px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                                                                                                        >
                                                                                                            Pay
                                                                                                        </button>
                                                                                                    </div>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                        />
                    </>
                )}
                    {/* Pause EMI Modal */}
                    {showPauseModal && selectedEmi && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all">
                                <div className="p-6">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                                        Pause & Defer EMI?
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-3">
                                        This will defer EMI #{selectedEmi.emi_number} (due on {formatDate(selectedEmi.due_date)}) by 1 month. 
                                        <strong className="block mt-2 text-amber-800">All subsequent pending EMIs in this schedule will also be shifted forward by 1 month.</strong>
                                    </p>
                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowPauseModal(false)}
                                            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handlePauseEmi}
                                            className="px-4 py-2 bg-amber-500 text-white font-medium text-sm rounded-xl hover:bg-amber-600 transition-colors shadow-sm shadow-amber-500/10"
                                        >
                                            Confirm & Shift
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit EMI Amount Modal */}
                    {showEditModal && selectedEmi && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all">
                                <div className="p-6 space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <DollarSign className="w-5 h-5 text-blue-500 animate-bounce" />
                                        Customize EMI
                                    </h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">EMI #{selectedEmi.emi_number} Amount</label>
                                        <input
                                            type="number"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            placeholder="e.g. 5000"
                                        />
                                    </div>
                                    {/* Moving the date decides which payroll run picks the
                                        instalment up — the amount is untouched by it. */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Due Date</label>
                                        <input
                                            type="date"
                                            value={editDueDate}
                                            onChange={(e) => setEditDueDate(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                        />
                                        <p className="text-[11px] text-slate-500">
                                            Sets which payroll month deducts this installment. A past date means the next run collects it.
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reallocate Difference</label>
                                        <select
                                            value={adjustType}
                                            onChange={(e) => setAdjustType(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors cursor-pointer"
                                        >
                                            <option value="distribute">Distribute evenly among remaining EMIs</option>
                                            <option value="next_emi">Add/Subtract difference to immediate next EMI</option>
                                            <option value="last_emi">Add/Subtract difference to final EMI</option>
                                            <option value="add_new_emi">Create a new EMI at the end for the difference</option>
                                            <option value="none">Update this EMI only (extends tenure if reduced)</option>
                                        </select>
                                    </div>
                                    <div className="pt-2 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowEditModal(false)}
                                            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEditEmi}
                                            className="px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/10"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Skip EMI Modal */}
                    {showSkipModal && selectedEmi && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden">
                                <div className="p-6 space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-indigo-600" />
                                        Skip &amp; Reschedule EMI
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Skipping EMI #{selectedEmi.emi_number} ({formatCurrency(selectedEmi.emi_amount)}).
                                        The unpaid balance will be rescheduled to the selected month.
                                    </p>

                                    {/* Month Picker */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                            Reschedule Month
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="month"
                                                value={rescheduleMonth}
                                                onChange={(e) => {
                                                    setRescheduleMonth(e.target.value);
                                                    checkMonthConflict(e.target.value);
                                                }}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                            />
                                            {checkingConflict && (
                                                <span className="absolute right-3 top-2.5 text-xs text-slate-400 animate-pulse">Checking…</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Conflict Warning + Choice */}
                                    {skipConflict?.conflict && (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold text-amber-800">EMI conflict detected</p>
                                                    <p className="text-xs text-amber-700 mt-0.5">
                                                        EMI #{skipConflict.existing_emi?.emi_number} already exists for this month
                                                        ({formatCurrency(skipConflict.existing_emi?.emi_amount || 0)}).
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Amounts summary */}
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-white rounded-lg p-2 border border-amber-100">
                                                    <p className="text-[10px] text-amber-600 font-medium uppercase">Existing EMI</p>
                                                    <p className="text-sm font-bold text-slate-800">{formatCurrency(skipConflict.existing_emi?.emi_amount || 0)}</p>
                                                </div>
                                                <div className="bg-white rounded-lg p-2 border border-amber-100 flex items-center justify-center">
                                                    <span className="text-amber-500 font-bold">+</span>
                                                </div>
                                                <div className="bg-white rounded-lg p-2 border border-amber-100">
                                                    <p className="text-[10px] text-amber-600 font-medium uppercase">This Skip</p>
                                                    <p className="text-sm font-bold text-slate-800">{formatCurrency(skipConflict.skipped_emi_remaining || 0)}</p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-amber-700 text-center font-medium">
                                                Merged total: <span className="font-bold">{formatCurrency(skipConflict.merged_total || 0)}</span>
                                            </p>

                                            {/* Choice buttons */}
                                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">What would you like to do?</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => setSkipMergeChoice('merge')}
                                                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                                                        skipMergeChoice === 'merge'
                                                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                                            : 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50'
                                                    }`}
                                                >
                                                    Merge into existing
                                                    <span className="block text-[10px] font-normal opacity-80">Combine both amounts</span>
                                                </button>
                                                <button
                                                    onClick={() => setSkipMergeChoice('separate')}
                                                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                                                        skipMergeChoice === 'separate'
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                            : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                                                    }`}
                                                >
                                                    Create separate
                                                    <span className="block text-[10px] font-normal opacity-80">Keep them distinct</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* No conflict — show green tick */}
                                    {skipConflict && !skipConflict.conflict && rescheduleMonth && (
                                        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                            No EMI exists for this month — a new EMI of {formatCurrency(skipConflict.skipped_emi_remaining || 0)} will be created.
                                        </div>
                                    )}

                                    {/* Reason */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reason for Skipping</label>
                                        <textarea
                                            value={skipReason}
                                            onChange={(e) => setSkipReason(e.target.value)}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                            placeholder="e.g. Employee requested due to high expenses this month"
                                            rows={2}
                                        />
                                    </div>

                                    <div className="pt-1 flex justify-end gap-3">
                                        <button
                                            onClick={() => { setShowSkipModal(false); setSkipConflict(null); setSkipMergeChoice(null); }}
                                            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSkipEmi}
                                            disabled={loading || !rescheduleMonth || (skipConflict?.conflict === true && skipMergeChoice === null)}
                                            className="px-4 py-2 bg-indigo-600 text-white font-medium text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-500/10"
                                        >
                                            {loading ? 'Processing…' : skipConflict?.conflict && skipMergeChoice === 'merge' ? 'Merge & Skip' : 'Confirm Skip'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pay EMI Modal */}
                    {showPayModal && selectedEmi && (
                        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all">
                                <div className="p-6 space-y-4">
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-emerald-500 animate-spin-slow" />
                                        Record Manual Repayment
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount Paid</label>
                                            <input
                                                type="number"
                                                value={payAmount}
                                                onChange={(e) => setPayAmount(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                                                placeholder="Amount"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Payment Mode</label>
                                            <select
                                                value={paymentMode}
                                                onChange={(e) => setPaymentMode(e.target.value)}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors cursor-pointer"
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="upi">UPI</option>
                                                <option value="transfer">Bank Transfer</option>
                                                <option value="cheque">Cheque</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Reference ID / Cheque #</label>
                                        <input
                                            type="text"
                                            value={paymentRef}
                                            onChange={(e) => setPaymentRef(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                                            placeholder="Transaction ID / Reference Number"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</label>
                                        <textarea
                                            value={paymentNotes}
                                            onChange={(e) => setPaymentNotes(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                                            placeholder="Offline payment remarks..."
                                        />
                                    </div>
                                    <div className="pt-2 flex justify-end gap-3">
                                        <button
                                            onClick={() => setShowPayModal(false)}
                                            className="px-4 py-2 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handlePayEmi}
                                            className="px-4 py-2 bg-emerald-600 text-white font-medium text-sm rounded-xl hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-500/10"
                                        >
                                            Record Payment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
}

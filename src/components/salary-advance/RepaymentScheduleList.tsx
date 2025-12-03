"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { ChevronDown, ChevronRight, Search, Filter, RefreshCw, DollarSign, Calendar, CheckCircle, AlertCircle, Clock } from "lucide-react";
import Pagination from "./Pagination";
import TableSkeleton from "./TableSkeleton";

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
};

export default function RepaymentScheduleList() {
    const [loading, setLoading] = useState(false);
    const [schedules, setSchedules] = useState<RepaymentSchedule[]>([]);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [emis, setEmis] = useState<Record<number, EMI[]>>({});
    const [loadingEmis, setLoadingEmis] = useState<Record<number, boolean>>({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 15;

    useEffect(() => {
        fetchSchedules();
    }, [currentPage]);

    const fetchSchedules = async () => {
        setLoading(true);
        try {
            const data = await apiClient<{
                schedules: any[];
                total: number;
                page: number;
                totalPages: number
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
        } catch (error) {
            console.error("Failed to fetch schedules:", error);
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
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return 'bg-green-500';
        if (percent >= 50) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <DollarSign size={20} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Total Outstanding</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(schedules.reduce((acc, curr) => acc + curr.pending_amount, 0))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <CheckCircle size={20} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Total Collected</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(schedules.reduce((acc, curr) => acc + curr.total_paid_amount, 0))}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <AlertCircle size={20} />
                        </div>
                        <span className="text-sm font-medium text-gray-600">Overdue EMIs</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {schedules.reduce((acc, curr) => acc + curr.overdue_emis, 0)}
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
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100">
                                                                                {emis[schedule.request_id]?.map((emi: any) => (
                                                                                    <tr key={emi.id} className="hover:bg-gray-50">
                                                                                        <td className="px-4 py-2 text-gray-900">{emi.emi_number}</td>
                                                                                        <td className="px-4 py-2 text-gray-600">{formatDate(emi.due_date)}</td>
                                                                                        <td className="px-4 py-2 font-medium text-gray-900">{formatCurrency(emi.emi_amount)}</td>
                                                                                        <td className="px-4 py-2">
                                                                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(emi.status)}`}>
                                                                                                {emi.status}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-gray-600">{formatDate(emi.paid_date || '')}</td>
                                                                                        <td className="px-4 py-2 text-gray-600">{emi.payment_mode || '-'}</td>
                                                                                        <td className="px-4 py-2 text-gray-600 text-xs">{emi.transaction_ref || '-'}</td>
                                                                                        <td className="px-4 py-2 text-gray-600 text-xs max-w-[150px] truncate" title={emi.notes}>{emi.notes || '-'}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
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
            </div>
        </div>
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    X,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Filter,
    Download,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";

type LeaveBalance = {
    leave_type: string;
    total_allocated: number;
    used: number;
    carry_forward: number;
    period_month?: number;
    period_year?: number;
};

type LeaveApplication = {
    id: number;
    leave_type: string;
    start_date: string;
    end_date: string;
    duration_days: number;
    status: string;
    reason: string;
    approver_name?: string;
    added_by_name?: string;
    created_at: string;
};

type PeriodHistory = {
    period: string;
    period_month: number;
    period_year: number;
    balances: LeaveBalance[];
};

interface EmployeeLeaveHistoryProps {
    employeeId: number;
    employeeName: string;
    onClose: () => void;
}

export default function EmployeeLeaveHistory({ employeeId, employeeName, onClose }: EmployeeLeaveHistoryProps) {
    const [activeTab, setActiveTab] = useState<"current" | "history" | "applications">("current");
    const [loading, setLoading] = useState(false);

    // Current Balances State
    const [currentBalances, setCurrentBalances] = useState<LeaveBalance[]>([]);
    const [policy, setPolicy] = useState<any>(null);

    // History State
    const [history, setHistory] = useState<PeriodHistory[]>([]);

    // Applications State
    const [applications, setApplications] = useState<LeaveApplication[]>([]);
    const [appPage, setAppPage] = useState(1);
    const [appTotal, setAppTotal] = useState(0);
    const [appLimit] = useState(10);
    const [periodFilter, setPeriodFilter] = useState<{ month?: number, year?: number }>({});

    useEffect(() => {
        fetchCurrentBalances();
        fetchHistory();
        fetchApplications();
    }, [employeeId]);

    useEffect(() => {
        fetchApplications();
    }, [appPage, periodFilter]);

    const fetchCurrentBalances = async () => {
        try {
            const res = await apiClient<any>(`/leaves/summary`, {
                params: { employee_id: String(employeeId) }
            });

            const balances = res.leave_balances || [];

            // Process Comp-offs
            const compoffs = res.compoff || [];
            // In backend getSummary, expired 'Approved' are filtered out.
            // Remaining = Approved (valid)
            // Used = Used
            const compoffApproved = compoffs.filter((c: any) => (c.effective_status || c.status) === 'Approved').length;
            const compoffUsed = compoffs.filter((c: any) => c.status === 'Used').length;
            const compoffAllocated = compoffApproved + compoffUsed;

            if (compoffAllocated > 0 || compoffApproved > 0) {
                balances.push({
                    leave_type: 'Comp-off',
                    total_allocated: compoffAllocated,
                    used: compoffUsed,
                    carry_forward: 0,
                    period_month: undefined,
                    period_year: undefined
                });
            }

            setCurrentBalances(balances);
            setPolicy(res.policy);
        } catch (error) {
            console.error("Failed to fetch balances:", error);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await apiClient<any>(`/leaves/balance-history`, {
                params: { employee_id: String(employeeId), limit: "12" }
            });
            setHistory(res.history || []);
        } catch (error) {
            console.error("Failed to fetch history:", error);
        }
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const params: any = {
                employee_id: String(employeeId),
                page: String(appPage),
                limit: String(appLimit)
            };

            if (periodFilter.year) {
                params.period_year = String(periodFilter.year);
                if (periodFilter.month) params.period_month = String(periodFilter.month);
            }

            const res = await apiClient<any>(`/leaves/applications`, { params });
            setApplications(res.applications || []);
            setAppTotal(res.pagination?.total || 0);
        } catch (error) {
            console.error("Failed to fetch applications:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Leave History</h2>
                        <p className="text-sm text-gray-500 mt-1">Employee: {employeeName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6">
                    <button
                        onClick={() => setActiveTab("current")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "current"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Current Balances
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "history"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Balance History
                    </button>
                    <button
                        onClick={() => setActiveTab("applications")}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "applications"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                    >
                        Applications
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                    {/* Current Balances Tab */}
                    {activeTab === "current" && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {currentBalances.map((balance, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-semibold text-gray-900">{balance.leave_type}</h3>
                                            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                                                {policy?.leave_cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Allocated</span>
                                                <span className="font-medium">{balance.total_allocated}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Used</span>
                                                <span className="font-medium text-red-600">-{balance.used}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Carried Forward</span>
                                                <span className="font-medium text-green-600">+{balance.carry_forward}</span>
                                            </div>
                                            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-900">Remaining</span>
                                                <span className="text-xl font-bold text-blue-600">
                                                    {Number(balance.total_allocated) - Number(balance.used)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {currentBalances.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                                    <p className="text-gray-500">No leave balances found for the current period.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === "history" && (
                        <div className="space-y-6">
                            {history.map((period, idx) => (
                                <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-900">{period.period}</h3>
                                        <span className="text-xs text-gray-500">
                                            {period.period_month ? `Month: ${period.period_month}` : ''} {period.period_year}
                                        </span>
                                    </div>
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {period.balances.map((balance, bIdx) => (
                                                <div key={bIdx} className="bg-gray-50 rounded-lg p-3 text-sm">
                                                    <div className="font-medium text-gray-900 mb-2">{balance.leave_type}</div>
                                                    <div className="flex justify-between text-gray-500">
                                                        <span>Allocated:</span>
                                                        <span>{balance.total_allocated}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-500">
                                                        <span>Used:</span>
                                                        <span>{balance.used}</span>
                                                    </div>
                                                    <div className="flex justify-between font-medium text-blue-600 mt-1 pt-1 border-t border-gray-200">
                                                        <span>Remaining:</span>
                                                        <span>{Number(balance.total_allocated) - Number(balance.used)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && (
                                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No historical leave data available.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Applications Tab */}
                    {activeTab === "applications" && (
                        <div className="space-y-4">
                            {/* Filters */}
                            <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4 items-center">
                                <Filter className="w-4 h-4 text-gray-400" />
                                <select
                                    className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    onChange={(e) => {
                                        const year = e.target.value ? parseInt(e.target.value) : undefined;
                                        setPeriodFilter(prev => ({ ...prev, year }));
                                        setAppPage(1);
                                    }}
                                >
                                    <option value="">All Years</option>
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                                {policy?.leave_cycle === 'monthly' && (
                                    <select
                                        className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        onChange={(e) => {
                                            const month = e.target.value ? parseInt(e.target.value) : undefined;
                                            setPeriodFilter(prev => ({ ...prev, month }));
                                            setAppPage(1);
                                        }}
                                    >
                                        <option value="">All Months</option>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <option key={m} value={m}>{format(new Date(2024, m - 1, 1), 'MMMM')}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approver</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {applications.map((app) => (
                                            <tr key={app.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {format(new Date(app.start_date), 'MMM d, yyyy')}
                                                    {app.start_date !== app.end_date && ` - ${format(new Date(app.end_date), 'MMM d, yyyy')}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.leave_type}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{app.duration_days} days</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                                        {app.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {app.approver_name || '-'}
                                                    {app.added_by_name && <div className="text-xs text-gray-400">Added by: {app.added_by_name}</div>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {applications.length === 0 && !loading && (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No leave applications found.</p>
                                    </div>
                                )}
                            </div>

                            {/* Pagination */}
                            {appTotal > appLimit && (
                                <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-xl">
                                    <div className="flex justify-between w-full">
                                        <button
                                            onClick={() => setAppPage(p => Math.max(1, p - 1))}
                                            disabled={appPage === 1}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-sm text-gray-700 self-center">
                                            Page {appPage} of {Math.ceil(appTotal / appLimit)}
                                        </span>
                                        <button
                                            onClick={() => setAppPage(p => Math.min(Math.ceil(appTotal / appLimit), p + 1))}
                                            disabled={appPage >= Math.ceil(appTotal / appLimit)}
                                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

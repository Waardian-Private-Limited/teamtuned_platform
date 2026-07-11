"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { X, DollarSign, Calendar, User, FileText, CheckCircle, XCircle, Clock, Building, Landmark, Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { useAuth } from "@/context/AuthContext";

type ApprovalLog = {
    id: number;
    level_index: number;
    action: string;
    comments: string | null;
    acted_at: string | null;
    approver_first_name: string;
    approver_last_name: string;
    approver_email: string;
};

type RequestDetail = {
    id: number;
    requested_amount: number;
    eligible_amount_at_request: number;
    approved_amount: number | null;
    status: string;
    reason: string | null;
    created_at: string;
    updated_at: string;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    department_name?: string;
    monthly_salary: number;
    disbursed_at?: string | null;
    disbursed_by?: number | null;
    disbursement_mode?: string | null;
    disbursement_reference?: string | null;
    disbursed_by_name?: string | null;
    total_paid: number;
};

type RepaymentScheduleItem = {
    id: number;
    emi_number: number;
    emi_amount: number;
    paid_amount: number;
    status: string;
    due_date: string;
    paid_date: string | null;
    notes?: string | null;
};

type Props = {
    requestId: number;
    onClose: () => void;
    onSuccess?: () => void;
};

export default function RequestDetails({ requestId, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [approvalLogs, setApprovalLogs] = useState<ApprovalLog[]>([]);
    const [schedule, setSchedule] = useState<RepaymentScheduleItem[]>([]);
    const [scheduleSummary, setScheduleSummary] = useState<{ totalPaid: number; totalPending: number } | null>(null);
    const [wallet, setWallet] = useState<{ total_advanced: number; total_repaid: number; outstanding_balance: number } | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { role, permissions } = useAuth();
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const canDelete = isOrgAdmin || permissions.includes("SALADV_DELETE") || permissions.includes("SALADV_APPROVE");

    useEffect(() => {
        fetchDetails();
        fetchSchedule();
    }, [requestId]);

    const fetchDetails = async () => {
        try {
            const data = await apiClient<{ request: RequestDetail; approval_logs: ApprovalLog[]; wallet: any }>(
                `/salary-advance/requests/${requestId}`,
                { withAuth: true }
            );

            setRequest(data.request);
            setApprovalLogs(data.approval_logs || []);
            setWallet(data.wallet || null);
        } catch (error) {
            console.error("Failed to fetch request details:", error);
        }
    };

    const fetchSchedule = async () => {
        try {
            const data = await apiClient<{
                request: any;
                repayments?: RepaymentScheduleItem[];
                schedule?: RepaymentScheduleItem[];
                summary: { total_paid: number; total_pending: number; totalPaid?: number; totalPending?: number };
            }>(`/salary-advance/requests/${requestId}/repayments`, { withAuth: true });

            const repaymentList = data.repayments || data.schedule || [];
            setSchedule(repaymentList);
            
            const totalPaid = data.summary.total_paid !== undefined ? data.summary.total_paid : (data.summary.totalPaid || 0);
            const totalPending = data.summary.total_pending !== undefined ? data.summary.total_pending : (data.summary.totalPending || 0);
            setScheduleSummary({ totalPaid, totalPending });
        } catch (error) {
            console.error("Failed to fetch repayment schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
            pending: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock, label: "Pending" },
            in_review: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, label: "In Review" },
            approved: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle, label: "Approved" },
            rejected: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle, label: "Rejected" },
            paid: { color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle, label: "Paid" },
            cancelled: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: XCircle, label: "Cancelled" },
            disbursed: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle, label: "Disbursed" },
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${config.color}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    const getActionBadge = (action: string) => {
        const actionConfig: Record<string, { color: string; icon: any }> = {
            pending: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
            approved: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
            rejected: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
            auto_approved: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle },
        };

        const config = actionConfig[action] || actionConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                <Icon size={12} />
                {action.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-8 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading details...</p>
                </div>
            </div>
        );
    }

    if (!request) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Request Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        {getStatusBadge(request.status)}
                    </div>

                    {/* Basic Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <DollarSign size={16} className="text-green-600" />
                            Financial Details
                        </h3>
                        {request.department_name && (
                            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2">
                                <Building size={16} className="text-blue-600" />
                                <span className="text-sm text-blue-900 font-medium">Department: {request.department_name}</span>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Requested Amount</div>
                                <div className="font-bold text-green-600 text-lg">{formatCurrency(request.requested_amount)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Eligible Amount</div>
                                <div className="font-semibold text-gray-900">{formatCurrency(request.eligible_amount_at_request)}</div>
                            </div>
                            {request.approved_amount && (
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Approved Amount</div>
                                    <div className="font-bold text-blue-600 text-lg">{formatCurrency(request.approved_amount)}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Total Paid</div>
                                <div className="font-bold text-green-700 text-lg">{formatCurrency(request.total_paid || 0)}</div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">Total Pending</div>
                                <div className="font-bold text-orange-700 text-lg">
                                    {formatCurrency((request.approved_amount || request.requested_amount) - (request.total_paid || 0))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Details */}
                    {wallet && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Landmark size={16} className="text-blue-600" />
                                Employee Wallet Overview
                            </h3>
                            <div className="grid grid-cols-3 gap-4 bg-blue-50/50 border border-blue-100 p-4 rounded-lg">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1 font-medium">Lifetime Borrowed</div>
                                    <div className="font-semibold text-gray-900 text-sm">{formatCurrency(wallet.total_advanced)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1 font-medium">Lifetime Repaid</div>
                                    <div className="font-semibold text-gray-900 text-sm">{formatCurrency(wallet.total_repaid)}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1 font-medium">Outstanding Balance</div>
                                    <div className="font-bold text-blue-700 text-sm">{formatCurrency(wallet.outstanding_balance)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    {request.reason && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-600" />
                                Reason
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-sm text-gray-700">{request.reason}</p>
                            </div>
                        </div>
                    )}

                    {/* Timeline */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-purple-600" />
                            Timeline
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-24 text-gray-500">Created:</div>
                                <div className="font-medium text-gray-900">{formatDate(request.created_at)}</div>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-24 text-gray-500">Updated:</div>
                                <div className="font-medium text-gray-900">{formatDate(request.updated_at)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Disbursement Details */}
                    {request.disbursed_at && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-600" />
                                Disbursement Details
                            </h3>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-32 text-green-700 font-medium">Disbursed On:</div>
                                    <div className="font-semibold text-green-900">{formatDate(request.disbursed_at)}</div>
                                </div>
                                {request.disbursement_mode && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-32 text-green-700 font-medium">Payment Mode:</div>
                                        <div className="font-medium text-green-900 capitalize">{request.disbursement_mode.replace('_', ' ')}</div>
                                    </div>
                                )}
                                {request.disbursement_reference && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-32 text-green-700 font-medium">Reference:</div>
                                        <div className="font-medium text-green-900">{request.disbursement_reference}</div>
                                    </div>
                                )}
                                {request.disbursed_by_name && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-32 text-green-700 font-medium">Disbursed By:</div>
                                        <div className="font-medium text-green-900">{request.disbursed_by_name}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Repayment Schedule */}
                    {schedule.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <Calendar size={16} className="text-blue-600" />
                                Repayment Schedule
                            </h3>
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">EMI #</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Due Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">EMI Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Paid Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Notes/Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {schedule.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.emi_number}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.due_date ? new Date(item.due_date).toLocaleDateString('en-IN') : '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatCurrency(item.emi_amount)}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.paid_amount)}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                                                        item.status === 'paid'
                                                            ? 'bg-green-50 text-green-700 border-green-200'
                                                            : item.status === 'partial'
                                                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                            : item.status === 'overdue'
                                                            ? 'bg-red-50 text-red-700 border-red-200'
                                                            : item.status === 'skipped'
                                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                            : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>
                                                        {item.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.paid_date ? new Date(item.paid_date).toLocaleDateString('en-IN') : '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-500 max-w-[200px] truncate" title={item.notes || ''}>{item.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Approval Workflow */}
                    {approvalLogs.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <User size={16} className="text-orange-600" />
                                Approval Workflow
                            </h3>
                            <div className="space-y-3">
                                {approvalLogs.map((log, index) => (
                                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-semibold text-gray-900">
                                                    {log.approver_first_name} {log.approver_last_name}
                                                </div>
                                                {getActionBadge(log.action)}
                                            </div>
                                            <div className="text-xs text-gray-600 mb-1">{log.approver_email}</div>
                                            {log.comments && (
                                                <div className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200">
                                                    {log.comments}
                                                </div>
                                            )}
                                            {log.acted_at && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {formatDate(log.acted_at)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    {canDelete && (
                        <button
                            onClick={async () => {
                                if (window.confirm("Are you sure you want to delete this salary advance request? This will permanently remove the request and its entire repayment schedule.")) {
                                    setDeleting(true);
                                    try {
                                        await apiClient(`/salary-advance/requests/${requestId}`, {
                                            method: "DELETE",
                                            withAuth: true
                                        });
                                        showSuccess("Request deleted successfully");
                                        if (onSuccess) onSuccess();
                                        onClose();
                                    } catch (err: any) {
                                        showError(err.message || "Failed to delete request");
                                    } finally {
                                        setDeleting(false);
                                    }
                                }
                            }}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Trash2 size={16} />
                            {deleting ? "Deleting..." : "Delete"}
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-semibold"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

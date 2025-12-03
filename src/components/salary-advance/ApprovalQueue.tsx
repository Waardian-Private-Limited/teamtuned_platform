"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { CheckCircle, XCircle, RefreshCw, MessageSquare, Eye } from "lucide-react";
import RequestDetails from "./RequestDetails";

type PendingApproval = {
    id: number;
    employee_id: number;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    requested_amount: number;
    eligible_amount_at_request: number;
    status: string;
    reason: string | null;
    created_at: string;
    level_index: number;
    current_level_index: number;
    decides_emi: number; // 0 or 1
    pending_since: string;
    policy_id: number;
};

type Policy = {
    emi_decision_mode: 'policy_level' | 'request_level';
    emi_calculation_method: 'auto' | 'percentage' | 'fixed_amount';
    max_repayment_months: number;
    workflow_definition: any;
};

export default function ApprovalQueue() {
    const [loading, setLoading] = useState(false);
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<PendingApproval | null>(null);
    const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject'; request: PendingApproval } | null>(null);
    const [comments, setComments] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [policy, setPolicy] = useState<Policy | null>(null);

    // EMI decision fields (for request_level mode)
    const [emiMethod, setEmiMethod] = useState<'auto' | 'percentage' | 'fixed_amount'>('auto');
    const [emiPercentage, setEmiPercentage] = useState<string>('');
    const [emiFixedAmount, setEmiFixedAmount] = useState<string>('');
    const [repaymentMonths, setRepaymentMonths] = useState<string>('');

    useEffect(() => {
        fetchPendingApprovals();
        fetchPolicy();
    }, []);

    const fetchPendingApprovals = async () => {
        setLoading(true);
        try {
            const data = await apiClient<{ approvals: PendingApproval[] }>(
                "/salary-advance/pending-approvals",
                { withAuth: true }
            );
            const ordered = (data.approvals || []).slice().sort((a, b) => a.level_index - b.level_index);
            setApprovals(ordered);

        } catch (error) {
            console.error("Failed to fetch pending approvals:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPolicy = async () => {
        try {
            const data = await apiClient<any>("/salary-advance/policy", { withAuth: true });
            if (data?.policy) {
                setPolicy(data.policy);
            }
        } catch (error) {
            console.error("Failed to fetch policy:", error);
        }
    };

    const handleAction = async (type: 'approve' | 'reject') => {
        if (!actionModal) return;

        setSubmitting(true);
        try {
            const endpoint = type === 'approve' ? 'approve' : 'reject';
            const body: any = { comments };

            // Add EMI decision if approving and policy is request_level
            if (type === 'approve' && policy?.emi_decision_mode === 'request_level') {
                body.emi_calculation_method = emiMethod;
                if (emiMethod === 'percentage') {
                    body.emi_percentage = parseFloat(emiPercentage);
                } else if (emiMethod === 'fixed_amount') {
                    body.emi_fixed_amount = parseFloat(emiFixedAmount);
                }
                if (repaymentMonths) {
                    body.repayment_months = parseInt(repaymentMonths);
                }
            }

            await apiClient(`/salary-advance/requests/${actionModal.request.id}/${endpoint}`, {
                method: "POST",
                withAuth: true,
                body,
            });

            showSuccess(`Request ${type === 'approve' ? 'approved' : 'rejected'} successfully`);
            setActionModal(null);
            setComments("");
            resetEmiFields();
            fetchPendingApprovals();
        } catch (error: any) {
            showError(error.message || `Failed to ${type} request`);
        } finally {
            setSubmitting(false);
        }
    };

    const resetEmiFields = () => {
        setEmiMethod('auto');
        setEmiPercentage('');
        setEmiFixedAmount('');
        setRepaymentMonths('');
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDaysSince = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
                        <p className="text-gray-600 mt-2">Pending salary advance requests awaiting your approval</p>
                    </div>
                    <button
                        onClick={fetchPendingApprovals}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>

                {/* Approvals List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Pending Approvals ({approvals.length})
                        </h2>
                    </div>

                    {approvals.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p>No pending approvals</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {approvals.map((approval) => {
                                console.log(`Approval Debug - ID: ${approval.id}, Level: ${approval.level_index}, Current: ${approval.current_level_index}`);
                                return (
                                    <div key={approval.id} className="p-6 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm">
                                                        {approval.first_name[0]}{approval.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">
                                                            {approval.first_name} {approval.last_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{approval.email}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Requested Amount</div>
                                                        <div className="font-bold text-green-600">{formatCurrency(approval.requested_amount)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Eligible Amount</div>
                                                        <div className="font-semibold text-gray-900">{formatCurrency(approval.eligible_amount_at_request)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Requested On</div>
                                                        <div className="text-sm text-gray-900">{formatDate(approval.created_at)}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-500 mb-1">Pending Since</div>
                                                        <div className="text-sm text-orange-600 font-medium">
                                                            {getDaysSince(approval.pending_since)} days
                                                        </div>
                                                    </div>
                                                </div>

                                                {approval.reason && (
                                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                                        <div className="text-xs text-gray-500 mb-1">Reason</div>
                                                        <div className="text-sm text-gray-700">{approval.reason}</div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setSelectedRequest(approval)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                {Number(approval.level_index) === Number(approval.current_level_index) ? (
                                                    <>
                                                        <button
                                                            onClick={() => setActionModal({ type: 'approve', request: approval })}
                                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                        >
                                                            <CheckCircle size={16} />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setActionModal({ type: 'reject', request: approval })}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            <XCircle size={16} />
                                                            Reject
                                                        </button>
                                                    </>
                                                ) : (
                                                    <div className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm">
                                                        Waiting for previous level approvals
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Modal */}
            {actionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {actionModal.type === 'approve' ? 'Approve' : 'Reject'} Request
                            </h2>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="font-semibold text-gray-900 mb-1">
                                    {actionModal.request.first_name} {actionModal.request.last_name}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Amount: {formatCurrency(actionModal.request.requested_amount)}
                                </div>
                            </div>

                            {/* EMI Decision (only for request_level mode and approve action AND if current level decides EMI) */}
                            {(() => {
                                if (actionModal.type !== 'approve' || policy?.emi_decision_mode !== 'request_level') return null;

                                // Check decides_emi flag from approval log
                                if (!actionModal.request.decides_emi) return null;

                                return (
                                    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="font-semibold text-gray-900">EMI Configuration</div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                EMI Calculation Method
                                            </label>
                                            <select
                                                value={emiMethod}
                                                onChange={(e) => setEmiMethod(e.target.value as any)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="auto">Auto (Equal EMI)</option>
                                                <option value="percentage">Percentage of Salary</option>
                                                <option value="fixed_amount">Fixed Amount</option>
                                            </select>
                                        </div>

                                        {emiMethod === 'percentage' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    EMI Percentage (% of monthly salary)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={emiPercentage}
                                                    onChange={(e) => setEmiPercentage(e.target.value)}
                                                    placeholder="e.g., 10"
                                                    min="1"
                                                    max="100"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        )}

                                        {emiMethod === 'fixed_amount' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Fixed EMI Amount (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={emiFixedAmount}
                                                    onChange={(e) => setEmiFixedAmount(e.target.value)}
                                                    placeholder="e.g., 5000"
                                                    min="1"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        )}

                                        {emiMethod === 'auto' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Repayment Months
                                                </label>
                                                <input
                                                    type="number"
                                                    value={repaymentMonths}
                                                    onChange={(e) => setRepaymentMonths(e.target.value)}
                                                    placeholder={`Max: ${policy?.max_repayment_months || 12}`}
                                                    min="1"
                                                    max={policy?.max_repayment_months || 12}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <MessageSquare size={16} />
                                    Comments (Optional)
                                </label>
                                <textarea
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    rows={4}
                                    placeholder="Add your comments..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
                            <button
                                onClick={() => {
                                    setActionModal(null);
                                    setComments("");
                                }}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(actionModal.type)}
                                disabled={submitting}
                                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${actionModal.type === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {submitting ? 'Processing...' : actionModal.type === 'approve' ? 'Approve' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Details Modal */}
            {selectedRequest && (
                <RequestDetails
                    requestId={selectedRequest.id}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    );
}

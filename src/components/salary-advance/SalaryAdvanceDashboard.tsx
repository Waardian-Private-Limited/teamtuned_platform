"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    DollarSign,
    TrendingUp,
    Calendar,
    AlertCircle,
    Plus,
    RefreshCw,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    Upload,
} from "lucide-react";
import RequestAdvanceModal from "./RequestAdvanceModal";
import RequestDetails from "./RequestDetails";

type Eligibility = {
    eligible: boolean;
    eligibleAmount: number;
    earnedAmount: number;
    monthlySalary: number;
    daysWorked: number;
    totalWorkingDays: number;
    maxPercentage: number;
    requestsUsed: number;
    maxRequests: number;
    message?: string;
    policy?: {
        min_request_amount: number;
        max_request_amount: number;
    };
};

type Request = {
    id: number;
    requested_amount: number;
    eligible_amount_at_request: number;
    approved_amount: number | null;
    status: string;
    reason: string;
    created_at: string;
    updated_at: string;
};

type Employee = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
};

export default function SalaryAdvanceDashboard() {
    const [loading, setLoading] = useState(false);
    const [eligibility, setEligibility] = useState<Eligibility | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [showManualAdvanceModal, setShowManualAdvanceModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [manualFormData, setManualFormData] = useState({
        employee_id: '',
        total_amount: '',
        amount_paid: '',
        repayment_months: '',
        start_month: new Date().toISOString().substring(0, 7),
        reason: 'Manual Entry'
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [eligData, requestsData, employeesData] = await Promise.all([
                apiClient<Eligibility>("/salary-advance/eligibility", { withAuth: true }),
                apiClient<{ requests: Request[] }>("/salary-advance/requests", { withAuth: true }),
                apiClient<{ data: Employee[] }>("/organization/employees?format=paginated&limit=1000", { withAuth: true }),
            ]);

            setEligibility(eligData);
            setRequests(requestsData.requests || []);
            setEmployees(employeesData.data || []);
        } catch (error) {
            console.error("Failed to fetch salary advance data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitManualAdvance = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await apiClient("/salary-advance/manual-advance", {
                method: "POST",
                withAuth: true,
                body: JSON.stringify({
                    ...manualFormData,
                    employee_id: Number(manualFormData.employee_id),
                    total_amount: Number(manualFormData.total_amount),
                    amount_paid: Number(manualFormData.amount_paid || 0),
                    repayment_months: Number(manualFormData.repayment_months),
                }),
            });
            setShowManualAdvanceModal(false);
            fetchData();
            // Reset form
            setManualFormData({
                employee_id: '',
                total_amount: '',
                amount_paid: '',
                repayment_months: '',
                start_month: new Date().toISOString().substring(0, 7),
                reason: 'Manual Entry'
            });
            setSearchQuery('');
        } catch (error) {
            console.error("Failed to create manual advance:", error);
            alert("Failed to create manual advance. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter((emp) => {
        if (!searchQuery.trim()) return true;
        const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
        const email = (emp.email || "").toLowerCase();
        const searchLower = searchQuery.toLowerCase();
        return fullName.includes(searchLower) || email.includes(searchLower);
    });

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
            pending: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock, label: "Pending" },
            in_review: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: AlertCircle, label: "In Review" },
            approved: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle, label: "Approved" },
            rejected: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle, label: "Rejected" },
            paid: { color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle, label: "Paid" },
            cancelled: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: XCircle, label: "Cancelled" },
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign className="w-8 h-8 text-green-600" />
                            Salary Advance
                        </h1>
                        <p className="text-gray-600 mt-2">Access your earned wages before payday</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowManualAdvanceModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Import Old Advance
                        </button>
                        {eligibility?.eligible && (
                            <button
                                onClick={() => setShowRequestModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Request Advance
                            </button>
                        )}
                    </div>
                </div>

                {/* Eligibility Card */}
                {eligibility && (
                    <div className="bg-white rounded-xl border-2 border-green-200 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 mb-1">Your Eligibility</h2>
                                <p className="text-sm text-gray-600">Based on your current payroll cycle</p>
                            </div>
                            {eligibility.eligible ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                                    <CheckCircle size={14} />
                                    Eligible
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-semibold border border-red-200">
                                    <XCircle size={14} />
                                    Not Eligible
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="text-sm text-gray-600 mb-1">Eligible Amount</div>
                                <div className="text-2xl font-bold text-green-600">{formatCurrency(eligibility.eligibleAmount)}</div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-sm text-gray-600 mb-1">Earned So Far</div>
                                <div className="text-2xl font-bold text-blue-600">{formatCurrency(eligibility.earnedAmount)}</div>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="text-sm text-gray-600 mb-1">Days Worked</div>
                                <div className="text-2xl font-bold text-purple-600">{eligibility.daysWorked}/{eligibility.totalWorkingDays}</div>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="text-sm text-gray-600 mb-1">Requests Used</div>
                                <div className="text-2xl font-bold text-orange-600">{eligibility.requestsUsed}/{eligibility.maxRequests}</div>
                            </div>
                        </div>

                        {!eligibility.eligible && eligibility.message && (
                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">{eligibility.message}</p>
                            </div>
                        )}

                        {eligibility.eligible && (
                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    You can request up to {eligibility.maxPercentage}% of your earned salary.
                                    {eligibility.policy?.min_request_amount && ` Minimum: ${formatCurrency(eligibility.policy.min_request_amount)}`}
                                    {eligibility.policy?.max_request_amount && ` | Maximum: ${formatCurrency(eligibility.policy.max_request_amount)}`}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Request History */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Request History</h2>
                    </div>

                    {requests.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p>No salary advance requests yet</p>
                            {eligibility?.eligible && (
                                <button
                                    onClick={() => setShowRequestModal(true)}
                                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Make Your First Request
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Requested Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Approved Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">{formatDate(request.created_at)}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(request.requested_amount)}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {request.approved_amount ? formatCurrency(request.approved_amount) : '-'}
                                            </td>
                                            <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setSelectedRequest(request)}
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showRequestModal && eligibility && (
                <RequestAdvanceModal
                    eligibility={eligibility}
                    onClose={() => setShowRequestModal(false)}
                    onSuccess={() => {
                        setShowRequestModal(false);
                        fetchData();
                    }}
                />
            )}

            {selectedRequest && (
                <RequestDetails
                    requestId={selectedRequest.id}
                    onClose={() => setSelectedRequest(null)}
                />
            )}

            {/* Manual Advance Modal */}
            {showManualAdvanceModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-900">Import Old Salary Advance</h2>
                            <button
                                onClick={() => setShowManualAdvanceModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <XCircle size={24} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitManualAdvance} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee</label>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name or email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee *</label>
                                <select
                                    value={manualFormData.employee_id}
                                    onChange={(e) => setManualFormData({ ...manualFormData, employee_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {filteredEmployees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.first_name} {emp.last_name} ({emp.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                                    <input
                                        type="number"
                                        value={manualFormData.total_amount}
                                        onChange={(e) => setManualFormData({ ...manualFormData, total_amount: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 10000"
                                        required
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                                    <input
                                        type="number"
                                        value={manualFormData.amount_paid}
                                        onChange={(e) => setManualFormData({ ...manualFormData, amount_paid: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 6000"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Months *</label>
                                    <input
                                        type="number"
                                        value={manualFormData.repayment_months}
                                        onChange={(e) => setManualFormData({ ...manualFormData, repayment_months: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 5"
                                        required
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Month *</label>
                                    <input
                                        type="month"
                                        value={manualFormData.start_month}
                                        onChange={(e) => setManualFormData({ ...manualFormData, start_month: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <input
                                    type="text"
                                    value={manualFormData.reason}
                                    onChange={(e) => setManualFormData({ ...manualFormData, reason: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Reason for advance"
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> The remaining amount will be split equally into the specified number of months, starting from the selected month.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowManualAdvanceModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create Advance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

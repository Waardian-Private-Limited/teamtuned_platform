"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
    Search,
    Filter,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    X,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Eye,
    ThumbsUp,
    ThumbsDown,
    DollarSign,
    Building,
    Calendar,
    Plus,
    Clock
} from "lucide-react";

type BudgetRequest = {
    id: number;
    site_id: number;
    site_name: string;
    site_code: string;
    current_budget: number;
    used_amount: number;
    requested_amount: number;
    reason?: string;
    rejection_reason?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    requested_by: number;
    requested_by_first_name: string;
    requested_by_last_name: string;
    approved_by?: number;
    approved_by_first_name?: string;
    approved_by_last_name?: string;
    created_at: string;
    updated_at: string;
    current_budget_amount?: number;
    current_budget_used?: number;
    final_budget_allocated?: number;
    actual_budget_approved?: number;
};

export default function SiteBudgetRequests() {
    const { role, permissions } = useAuth();

    // Permissions
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
    const canRequest = isOrgAdmin || hasPerm("SITE_BUDGET_REQUEST");
    const canView = isOrgAdmin || hasPerm("SITE_BUDGET_VIEW");
    const canApprove = isOrgAdmin || hasPerm("SITE_BUDGET_APPROVE");

    // State
    const [requests, setRequests] = useState<BudgetRequest[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [siteFilter, setSiteFilter] = useState<string>("");

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showActionModal, setShowActionModal] = useState(false);
    const [actionMode, setActionMode] = useState<'approve' | 'reject'>('approve');
    const [selectedRequest, setSelectedRequest] = useState<BudgetRequest | null>(null);

    // Form state
    const [formSiteId, setFormSiteId] = useState<string>("");
    const [formAmount, setFormAmount] = useState<string>("");
    const [formReason, setFormReason] = useState<string>("");
    const [rejectionReason, setRejectionReason] = useState<string>("");
    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Fetch sites
    useEffect(() => {
        (async () => {
            try {
                const res = await apiClient<{ sites?: any[] }>("/sites", { method: "GET" });
                setSites(res?.sites || []);
            } catch (e) {
                console.error("Failed to fetch sites:", e);
            }
        })();
    }, []);

    // Fetch requests
    const fetchRequests = React.useCallback(async () => {
        if (!canView) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string> = {
                page: String(page),
                pageSize: String(pageSize)
            };

            if (statusFilter && statusFilter !== "All") {
                params.status = statusFilter;
            }

            if (siteFilter) {
                params.site_id = siteFilter;
            }

            const res = await apiClient<any>("/sites/budget-requests/list", { method: "GET", params });
            setRequests(res?.requests || []);
            setTotal(res?.total || 0);
            setTotalPages(res?.pages || 1);
        } catch (e: any) {
            setError(e?.message || "Failed to load budget requests");
        } finally {
            setLoading(false);
        }
    }, [canView, page, pageSize, statusFilter, siteFilter]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // Create request
    const createRequest = async () => {
        if (!formSiteId || !formAmount) {
            setError("Site and amount are required");
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const res = await apiClient<any>("/sites/budget-requests", {
                method: "POST",
                body: {
                    site_id: parseInt(formSiteId),
                    requested_amount: parseFloat(formAmount),
                    reason: formReason.trim() || null
                }
            });

            setShowCreateModal(false);
            setFormSiteId("");
            setFormAmount("");
            setFormReason("");
            fetchRequests();

            if (res?.auto_approved) {
                showNotification("Budget request auto-approved!", "success");
            } else {
                showNotification("Budget request created successfully", "success");
            }
        } catch (e: any) {
            setError(e?.message || "Failed to create budget request");
            showNotification(e?.message || "Failed to create budget request", "error");
        } finally {
            setSaving(false);
        }
    };

    // Approve request
    const approveRequest = async (id: number) => {
        setActionLoading(`approve_${id}`);
        try {
            await apiClient(`/sites/budget-requests/${id}/approve`, { method: "POST", withAuth: true });
            fetchRequests();
            setShowActionModal(false);
            showNotification("Budget request approved successfully", "success");
        } catch (e: any) {
            showNotification(e?.message || "Failed to approve request", "error");
        } finally {
            setActionLoading(null);
        }
    };

    // Reject request
    const rejectRequest = async (id: number, reason: string) => {
        setActionLoading(`reject_${id}`);
        try {
            await apiClient(`/sites/budget-requests/${id}/reject`, {
                method: "POST",
                body: { rejection_reason: reason },
                withAuth: true
            });
            fetchRequests();
            setShowActionModal(false);
            showNotification("Budget request rejected", "success");
        } catch (e: any) {
            showNotification(e?.message || "Failed to reject request", "error");
        } finally {
            setActionLoading(null);
        }
    };


    // Modern toast notification system
    const showNotification = (message: string, type: 'success' | 'error') => {
        // Create or get container
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 12px;';
            document.body.appendChild(container);
        }

        // Create toast
        const toast = document.createElement('div');
        toast.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      min-width: 320px;
      max-width: 500px;
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      border-left: 4px solid ${type === 'success' ? '#10b981' : '#ef4444'};
    `;

        // Icon
        const iconWrapper = document.createElement('div');
        iconWrapper.style.cssText = `
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${type === 'success' ? '#d1fae5' : '#fee2e2'};
    `;

        const icon = document.createElement('div');
        icon.innerHTML = type === 'success'
            ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" fill="#10b981"/></svg>'
            : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="#ef4444"/></svg>';
        iconWrapper.appendChild(icon);

        // Content
        const content = document.createElement('div');
        content.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 4px;';

        const title = document.createElement('div');
        title.style.cssText = `font-weight: 600; font-size: 14px; color: ${type === 'success' ? '#065f46' : '#991b1b'};`;
        title.textContent = type === 'success' ? 'Success' : 'Error';

        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'font-size: 13px; color: #6b7280; line-height: 1.4;';
        messageEl.textContent = message;

        content.appendChild(title);
        content.appendChild(messageEl);

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.style.cssText = `
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      color: #9ca3af;
    `;
        closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 01.708 0L8 7.293l2.646-2.647a.5.5 0 01.708.708L8.707 8l2.647 2.646a.5.5 0 01-.708.708L8 8.707l-2.646 2.647a.5.5 0 01-.708-.708L7.293 8 4.646 5.354a.5.5 0 010-.708z"/></svg>';
        closeBtn.onmouseover = () => closeBtn.style.background = '#f3f4f6';
        closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';

        const removeToast = () => {
            toast.style.transform = 'translateX(400px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (container && container.contains(toast)) {
                    container.removeChild(toast);
                    if (container.children.length === 0) {
                        document.body.removeChild(container);
                    }
                }
            }, 300);
        };

        closeBtn.onclick = removeToast;

        // Assemble
        toast.appendChild(iconWrapper);
        toast.appendChild(content);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
            toast.style.opacity = '1';
        });

        // Auto remove after 5 seconds
        setTimeout(removeToast, 5000);
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    // Status badge
    const getStatusBadge = (status: string) => {
        const colors = {
            PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            APPROVED: 'bg-green-50 text-green-700 border-green-200',
            REJECTED: 'bg-red-50 text-red-700 border-red-200'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {status}
            </span>
        );
    };

    // Permission check
    if (!canView) {
        return (
            <div className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
                <p className="text-gray-500">You do not have permission to view budget requests.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Site Budget Requests</h1>
                    <p className="text-gray-600 mt-1">Manage site budget increase requests</p>
                </div>
                {canRequest && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Request Budget</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="All">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
                        <select
                            value={siteFilter}
                            onChange={(e) => {
                                setSiteFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Sites</option>
                            {sites.map((site) => (
                                <option key={site.id} value={site.id}>
                                    {site.name} ({site.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                setStatusFilter("All");
                                setSiteFilter("");
                                setPage(1);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <p className="text-red-600">{error}</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-8 text-center">
                        <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No budget requests found</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Budget</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Total</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested By</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="font-medium text-gray-900">{request.site_name}</div>
                                                    <div className="text-sm text-gray-500">{request.site_code}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(request.current_budget || 0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(request.used_amount || 0)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                                +{formatCurrency(request.requested_amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                {formatCurrency(Number(request.current_budget || 0) + Number(request.requested_amount))}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(request.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {request.requested_by_first_name} {request.requested_by_last_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(request.created_at)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRequest(request);
                                                            setShowDetailsModal(true);
                                                        }}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4 text-gray-600" />
                                                    </button>

                                                    {request.status === 'PENDING' && canApprove && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(request);
                                                                    setActionMode('approve');
                                                                    setShowActionModal(true);
                                                                }}
                                                                className="p-1.5 rounded-lg hover:bg-green-50 transition-colors"
                                                                title="Approve"
                                                                disabled={actionLoading === `approve_${request.id}`}
                                                            >
                                                                {actionLoading === `approve_${request.id}` ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
                                                                ) : (
                                                                    <ThumbsUp className="w-4 h-4 text-green-600" />
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(request);
                                                                    setActionMode('reject');
                                                                    setRejectionReason("");
                                                                    setShowActionModal(true);
                                                                }}
                                                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                                title="Reject"
                                                                disabled={actionLoading === `reject_${request.id}`}
                                                            >
                                                                {actionLoading === `reject_${request.id}` ? (
                                                                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                                                                ) : (
                                                                    <ThumbsDown className="w-4 h-4 text-red-600" />
                                                                )}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                <div className="text-sm text-gray-500">
                                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} requests
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm text-gray-700">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Request Budget Increase</h3>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            {canApprove && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Auto-Approve:</strong> Your request will be automatically approved since you have approval permissions.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Site *</label>
                                <select
                                    value={formSiteId}
                                    onChange={(e) => setFormSiteId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">Select a site</option>
                                    {sites.filter(s => s.has_budget).map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.name} ({site.code}) - Current: {formatCurrency(site.budget_amount || 0)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Requested Amount (₹) *</label>
                                <input
                                    type="number"
                                    value={formAmount}
                                    onChange={(e) => setFormAmount(e.target.value)}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter amount to add to budget"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                                <textarea
                                    value={formReason}
                                    onChange={(e) => setFormReason(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Explain why additional budget is needed..."
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createRequest}
                                disabled={saving || !formSiteId || !formAmount}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? "Creating..." : "Submit Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal - Simplified version */}
            {showDetailsModal && selectedRequest && (
                <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">Budget Request Details</h3>
                                <button
                                    onClick={() => setShowDetailsModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Site</h4>
                                    <p className="text-lg font-semibold">{selectedRequest.site_name}</p>
                                    <p className="text-sm text-gray-500">{selectedRequest.site_code}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Status</h4>
                                    {getStatusBadge(selectedRequest.status)}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Current Budget</h4>
                                    <p className="text-lg font-semibold">{formatCurrency(selectedRequest.current_budget || 0)}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Used Amount</h4>
                                    <p className="text-lg font-semibold">{formatCurrency(selectedRequest.used_amount || 0)}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Requested Increase</h4>
                                    <p className="text-lg font-semibold text-blue-600">+{formatCurrency(selectedRequest.requested_amount)}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">New Total Budget</h4>
                                <p className="text-2xl font-bold text-gray-900">
                                    {formatCurrency(Number(selectedRequest.current_budget || 0) + Number(selectedRequest.requested_amount))}
                                </p>
                            </div>

                            {selectedRequest.reason && (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Reason</h4>
                                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRequest.reason}</p>
                                </div>
                            )}

                            {/* Budget Comparison Context */}
                            {(selectedRequest.final_budget_allocated || selectedRequest.actual_budget_approved) && (
                                <div className="grid grid-cols-2 gap-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-800 mb-1">Final Budget Allocated</h4>
                                        <p className="text-lg font-semibold text-blue-900">
                                            {selectedRequest.final_budget_allocated ? formatCurrency(selectedRequest.final_budget_allocated) : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-blue-800 mb-1">Actual Budget Approved</h4>
                                        <p className="text-lg font-semibold text-blue-900">
                                            {selectedRequest.actual_budget_approved ? formatCurrency(selectedRequest.actual_budget_approved) : '-'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Requested By</h4>
                                    <p className="text-gray-900">{selectedRequest.requested_by_first_name} {selectedRequest.requested_by_last_name}</p>
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-1">Requested On</h4>
                                    <p className="text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                                </div>
                            </div>

                            {selectedRequest.status !== 'PENDING' && selectedRequest.approved_by_first_name && (
                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                        {selectedRequest.status === 'APPROVED' ? 'Approval Details' : 'Rejection Details'}
                                    </h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">
                                                {selectedRequest.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}
                                            </h4>
                                            <p className="text-gray-900">{selectedRequest.approved_by_first_name} {selectedRequest.approved_by_last_name}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Date</h4>
                                            <p className="text-gray-900">{formatDate(selectedRequest.updated_at)}</p>
                                        </div>
                                    </div>
                                    {selectedRequest.status === 'REJECTED' && selectedRequest.rejection_reason && (
                                        <div className="mt-4">
                                            <h4 className="text-sm font-medium text-gray-500 mb-1">Rejection Reason</h4>
                                            <p className="text-gray-900 bg-red-50 p-3 rounded-lg border border-red-200">{selectedRequest.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Modal (Approve/Reject) */}
            {showActionModal && selectedRequest && (
                <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    {actionMode === 'approve' ? 'Approve Budget Request' : 'Reject Budget Request'}
                                </h3>
                                <button
                                    onClick={() => setShowActionModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-600">Site:</span>
                                        <p className="font-medium">{selectedRequest.site_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Requested Amount:</span>
                                        <p className="font-medium text-blue-600">+{formatCurrency(selectedRequest.requested_amount)}</p>
                                    </div>
                                </div>
                            </div>

                            {actionMode === 'reject' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Provide a reason for rejecting this request..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowActionModal(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (actionMode === 'approve') {
                                        approveRequest(selectedRequest.id);
                                    } else {
                                        if (!rejectionReason.trim()) return;
                                        rejectRequest(selectedRequest.id, rejectionReason);
                                    }
                                }}
                                disabled={actionMode === 'reject' && !rejectionReason.trim()}
                                className={`px-4 py-2 text-white rounded-lg transition-colors ${actionMode === 'approve'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {actionMode === 'approve' ? 'Approve Request' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

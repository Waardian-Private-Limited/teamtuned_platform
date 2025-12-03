"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Package, User, FileText, Building, AlertCircle, CheckCircle, XCircle, Lock, Unlock, ArrowRight, MessageSquare, ShoppingCart, Trophy, Users } from "lucide-react";
import PrStatusBadge from "./PrStatusBadge";
import PrPriorityBadge from "./PrPriorityBadge";
import PrApprovalModal from "./PrApprovalModal";
import PrToPoModal from "./PrToPoModal";
import { showSuccess, showError, showWarning } from "@/lib/toast";

interface PrItem {
    id: number;
    item_id: number;
    item_name: string;
    item_code: string;
    category_name: string;
    subcategory_name: string;
    description: string;
    uom: string;
    qty_requested: number;
    qty_approved: number;
    qty_reserved: number;
    estimated_rate: number;
    tax_percentage: number;
    tax_amount: number;
    estimated_amount: number;
    is_batch_tracked: boolean;
    is_serial_tracked: boolean;
}

interface Approval {
    id: number;
    approver_id: number;
    approver_first_name: string;
    approver_last_name: string;
    level: number;
    action: string;
    comment: string;
    created_at: string;
}

interface PurchaseRequest {
    id: number;
    pr_number: string;
    organization_id: number;
    site_id: number;
    site_name: string;
    store_id: number;
    store_name: string;
    requested_by: number;
    requester_first_name: string;
    requester_last_name: string;
    purpose: string;
    preferred_vendor_id: number;
    vendor_name: string;
    priority: string;
    total_estimated_amount: number;
    restock_mode: string;
    expected_delivery?: string;
    quotation_id?: number | null;
    rfq_id?: number | null;
    status: string;
    approval_level: number;
    approvals_required: number;
    created_at: string;
    updated_at: string;
    items: PrItem[];
    approvals: Approval[];
    attachments?: { id: number; file_name: string; file_url: string; file_type: string; file_size: number; created_at: string }[];
    rfq?: { id: number; rfq_number: string; status: string } | null;
}

interface PrViewProps {
    prId: string;
}

export default function PrView({ prId }: PrViewProps) {
    const router = useRouter();
    const [pr, setPr] = useState<PurchaseRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [showPoModal, setShowPoModal] = useState(false);
    const [rfqComparison, setRfqComparison] = useState<any | null>(null);

    useEffect(() => {
        fetchPr();
    }, [prId]);

    const fetchPr = async () => {
        try {
            setLoading(true);
            const res = await apiClient<{ pr: PurchaseRequest }>(`/pr/${prId}`, {
                method: "GET",
                withAuth: true,
            });
            setPr(res?.pr || null);
            if (res?.pr?.rfq_id) {
                try {
                    const cmp = await apiClient<any>(`/rfq/${res.pr.rfq_id}/comparison`, { method: "GET", withAuth: true });
                    setRfqComparison(cmp || null);
                } catch {}
            } else {
                setRfqComparison(null);
            }
        } catch (err) {
            console.error("Failed to fetch PR:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this PR? This will release any reservations.")) {
            return;
        }

        try {
            await apiClient(`/pr/${prId}/cancel`, {
                method: "POST",
                withAuth: true,
            });
            showSuccess("PR cancelled successfully");
            fetchPr();
        } catch (err: any) {
            console.error("Failed to cancel PR:", err);
            showError(err?.message || "Failed to cancel PR");
        }
    };

    const handleReserveStock = async () => {
        if (!confirm("Reserve approved quantities in store? This will reduce available stock.")) {
            return;
        }

        try {
            const res = await apiClient<{ results: any[] }>(`/pr/${prId}/reserve`, {
                method: "POST",
                withAuth: true,
            });

            const failures = res?.results?.filter((r: any) => !r.success) || [];
            if (failures.length > 0) {
                showWarning(`Stock reserved with some failures: ${failures.map((f: any) => f.message).join(', ')}`);
            } else {
                showSuccess("Stock reserved successfully");
            }
            fetchPr();
        } catch (err: any) {
            console.error("Failed to reserve stock:", err);
            showError(err?.message || "Failed to reserve stock");
        }
    };

    const handleUnreserveStock = async () => {
        if (!confirm("Release reserved stock? This will make the stock available again.")) {
            return;
        }

        try {
            await apiClient(`/pr/${prId}/unreserve`, {
                method: "POST",
                withAuth: true,
            });
            showSuccess("Stock unreserved successfully");
            fetchPr();
        } catch (err: any) {
            console.error("Failed to unreserve stock:", err);
            showError(err?.message || "Failed to unreserve stock");
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return <div className="p-6 text-center">Loading...</div>;
    }

    if (!pr) {
        return <div className="p-6 text-center text-red-600">PR not found</div>;
    }

    const canApprove = ["pending_approval", "submitted"].includes(pr.status);
    const canCancel = !["converted", "cancelled"].includes(pr.status);
    const isMainReserveMode = (pr.restock_mode === 'main_warehouse') || Boolean((pr as any).is_main_store);
    const canReserve = ["approved", "partially_approved"].includes(pr.status) && isMainReserveMode && pr.items.some(item => Number(item.qty_approved) > Number(item.qty_reserved));
    const canUnreserve = pr.items.some(item => Number(item.qty_reserved) > 0);
    const canConvert = ["approved", "partially_approved"].includes(pr.status) && pr.items.some(item => Number(item.qty_approved) > Number(item.qty_reserved));

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.back()}
                    className="text-gray-600 hover:text-gray-800"
                >
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{pr.pr_number}</h1>
                    <p className="text-sm text-gray-600">
                        Created on {formatDate(pr.created_at)} by {pr.requester_first_name} {pr.requester_last_name}
                    </p>
                </div>
                <div className="flex gap-2">
                    <PrStatusBadge status={pr.status} />
                    <PrPriorityBadge priority={pr.priority} />
                    {pr.rfq_id ? (
                        <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 text-xs font-medium border border-amber-200">RFQ</span>
                    ) : null}
                    {pr.quotation_id ? (
                        <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-medium border border-green-200">Quotation</span>
                    ) : null}
                </div>
            </div>

            {/* PR Details */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">PR Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-500">Store</label>
                        <p className="text-gray-900">{pr.store_name}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Site</label>
                        <p className="text-gray-900">{pr.site_name || "N/A"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Preferred Vendor</label>
                        <p className="text-gray-900">{pr.vendor_name || "N/A"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Restock Mode</label>
                        <p className="text-gray-900 capitalize">{pr.restock_mode.replace("_", " ")}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                        <p className="text-gray-900">{pr.expected_delivery ? new Date(pr.expected_delivery).toLocaleDateString("en-IN") : "N/A"}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Approval Progress</label>
                        <p className="text-gray-900">
                            Level {pr.approval_level} of {pr.approvals_required}
                        </p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-500">Total Amount</label>
                        <p className="text-gray-900 font-semibold text-lg">
                            {formatCurrency(pr.total_estimated_amount)}
                        </p>
                    </div>
                    {pr.purpose && (
                        <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">Purpose</label>
                            <p className="text-gray-900">{pr.purpose}</p>
                        </div>
                    )}
                </div>
            </div>

            {pr.rfq_id ? (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">RFQ</h2>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const base = window.location.pathname.includes("org-admin") ? "/org-admin" : "/employee";
                                    router.push(`${base}/rfq/${pr.rfq_id}`);
                                }}
                                className="px-3 py-2 bg-amber-100 text-amber-800 rounded-lg border border-amber-200 flex items-center gap-2"
                            >
                                <Users size={18} />
                                Open RFQ
                            </button>
                            <button
                                onClick={() => {
                                    const base = window.location.pathname.includes("org-admin") ? "/org-admin" : "/employee";
                                    router.push(`${base}/rfq/${pr.rfq_id}/comparison`);
                                }}
                                className="px-3 py-2 bg-green-100 text-green-800 rounded-lg border border-green-200 flex items-center gap-2"
                            >
                                <Trophy size={18} />
                                View Comparison
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Items</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Requested</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Approved</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Reserved</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {pr.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                                        <div className="text-xs text-gray-500">{item.item_code}</div>
                                        {item.description && (
                                            <div className="text-xs text-gray-500 italic">{item.description}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">{item.category_name}</div>
                                        <div className="text-xs text-gray-500">{item.subcategory_name}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{item.uom}</td>
                                    <td className="px-4 py-3 text-sm">{item.qty_requested}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {item.qty_approved > 0 ? (
                                            <span className="text-green-600 font-medium">{item.qty_approved}</span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {item.qty_reserved > 0 ? (
                                            <span className="text-blue-600 font-medium">{item.qty_reserved}</span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm">{formatCurrency(item.estimated_rate)}</td>
                                    <td className="px-4 py-3 text-sm">{item.tax_percentage}%</td>
                                    <td className="px-4 py-3 text-sm font-medium">
                                        {formatCurrency(item.estimated_amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Approval Timeline */}
            {pr.approvals && pr.approvals.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Approval Timeline</h2>
                    <div className="space-y-4">
                        {pr.approvals.map((approval) => (
                            <div key={approval.id} className="flex gap-4 border-l-4 border-gray-200 pl-4">
                                <div className="flex-shrink-0">
                                    {approval.action === "approved" ? (
                                        <CheckCircle className="text-green-600" size={24} />
                                    ) : approval.action === "rejected" ? (
                                        <XCircle className="text-red-600" size={24} />
                                    ) : (
                                        <MessageSquare className="text-blue-600" size={24} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">
                                            {approval.approver_first_name} {approval.approver_last_name}
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            {approval.action === "approved" ? "approved" : approval.action === "rejected" ? "rejected" : "commented"}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            (Level {approval.level})
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">{formatDate(approval.created_at)}</div>
                                    {approval.comment && (
                                        <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                            {approval.comment}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pr.attachments && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Attachments</h2>
                    {pr.attachments.length === 0 ? (
                        <div className="text-sm text-gray-500">No attachments</div>
                    ) : (
                        <div className="space-y-2">
                            {pr.attachments.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-gray-600" />
                                        <div>
                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">
                                                {file.file_name}
                                            </a>
                                            <div className="text-xs text-gray-500">{file.file_type} • {(file.file_size / 1024).toFixed(2)} KB</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500">{new Date(file.created_at).toLocaleDateString("en-IN")}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {rfqComparison && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">RFQ Comparison</h2>
                    {rfqComparison.winner ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                            <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                                <CheckCircle size={20} />
                                Winner Selected
                            </div>
                            <p className="text-gray-700">
                                <strong>{rfqComparison.comparison.find((v: any) => v.vendor_id === rfqComparison.winner.vendor_id)?.vendor_name}</strong>
                            </p>
                            {rfqComparison.winner.remarks && (
                                <p className="text-sm text-gray-600 mt-2">Remarks: {rfqComparison.winner.remarks}</p>
                            )}
                        </div>
                    ) : null}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">Item</th>
                                    {rfqComparison.comparison.filter((v: any) => v.quotation).map((vendor: any) => (
                                        <th key={vendor.vendor_id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                            <div>{vendor.vendor_name}</div>
                                            <div className="text-xs text-gray-400 font-normal">{vendor.vendor_code}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {rfqComparison.items.map((item: any) => (
                                    <tr key={item.item_id}>
                                        <td className="px-4 py-3 sticky left-0 bg-white">
                                            <div className="font-medium text-gray-900">{item.item_name}</div>
                                            <div className="text-xs text-gray-500">{item.item_code} • Required: {item.required_qty} {item.uom}</div>
                                        </td>
                                        {rfqComparison.comparison.filter((v: any) => v.quotation).map((vendor: any) => {
                                            const qi = vendor.quotation.items.find((q: any) => q.item_id === item.item_id);
                                            return (
                                                <td key={vendor.vendor_id} className="px-4 py-3 text-center">
                                                    {qi ? (
                                                        <div>
                                                            <div className="font-semibold text-gray-900">₹{parseFloat(qi.rate).toFixed(2)}</div>
                                                            <div className="text-xs text-gray-500">Qty: {qi.offered_qty}</div>
                                                            <div className="text-xs text-gray-500">Tax: {qi.tax_percentage}%</div>
                                                            <div className="text-xs font-medium text-gray-700 mt-1">Total: ₹{parseFloat(qi.total).toFixed(2)}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
                {canUnreserve && (
                    <button
                        onClick={handleUnreserveStock}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Package size={20} />
                        Unreserve Stock
                    </button>
                )}
                {canReserve && (
                    <button
                        onClick={handleReserveStock}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Package size={20} />
                        Reserve Stock
                    </button>
                )}
                {canUnreserve && (
                    <button
                        onClick={async () => {
                            if (!confirm("Issue all reserved stock for this PR?")) return;
                            try {
                                await apiClient(`/pr/${prId}/issue`, { method: "POST", withAuth: true });
                                showSuccess("Reserved stock issued successfully");
                                fetchPr();
                            } catch (err: any) {
                                showError(err?.message || "Failed to issue stock");
                            }
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                        <CheckCircle size={20} />
                        Issue Reserved Stock
                    </button>
                )}
                {canCancel && (
                    <button
                        onClick={handleCancel}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                    >
                        Cancel PR
                    </button>
                )}
                {canApprove && (
                    <button
                        onClick={() => setShowApprovalModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                        <CheckCircle size={20} />
                        Approve / Reject
                    </button>
                )}
                {canConvert && (
                    <button
                        onClick={() => setShowPoModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
                    >
                        <ShoppingCart size={20} />
                        Convert to PO
                    </button>
                )}
            </div>

            {/* Approval Modal */}
            {showApprovalModal && (
                <PrApprovalModal
                    pr={pr}
                    onClose={() => setShowApprovalModal(false)}
                    onSuccess={() => {
                        setShowApprovalModal(false);
                        fetchPr();
                    }}
                />
            )}

            {/* PO Conversion Modal */}
            {showPoModal && (
                <PrToPoModal
                    pr={pr}
                    onClose={() => setShowPoModal(false)}
                    onSuccess={() => {
                        setShowPoModal(false);
                        fetchPr();
                    }}
                />
            )}
        </div>
    );
}

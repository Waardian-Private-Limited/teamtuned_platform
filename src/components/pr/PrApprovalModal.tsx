"use client";
import React, { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { X, CheckCircle, XCircle, Store, Building, Calendar, AlertCircle } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";

interface PrItem {
    id: number;
    item_id: number;
    item_name: string;
    item_code: string;
    qty_requested: number;
    qty_approved: number;
    qty_reserved: number;
    vendor_id?: number | null;
    vendor_name?: string | null;
    vendor_rate?: number | null;
    source?: string;
    store_available_qty?: number | null;
}

interface PurchaseRequest {
    id: number;
    pr_number: string;
    store_id: number;
    store_name?: string;
    site_name?: string;
    priority?: string;
    approval_level?: number;
    approvals_required?: number;
    restock_mode?: string;
    status?: string;
    created_at?: string;
    requester_first_name?: string;
    requester_last_name?: string;
    items: PrItem[];
}

interface PrApprovalModalProps {
    pr: PurchaseRequest;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PrApprovalModal({ pr, onClose, onSuccess }: PrApprovalModalProps) {
    const [action, setAction] = useState<"approve" | "reject">("approve");
    const [comment, setComment] = useState("");
    const [reserveStock, setReserveStock] = useState(false);
    const [vendors, setVendors] = useState<{ id: number; vendor_name: string }[]>([]);
    const [rows, setRows] = useState<Record<number, {
        approve_qty: number;
        reject_qty: number;
        reserve_qty: number;
        vendor_id: number | null;
        vendor_rate: number | null;
        remarks: string;
        requested: number;
        available: number;
        locked: boolean;
    }>>(() => {
        const init: Record<number, any> = {};
        pr.items.forEach((item) => {
            const requested = Number(item.qty_requested || 0);
            const approved = Number(item.qty_approved || requested);
            const reserved = Number(item.qty_reserved || 0);
            init[item.item_id] = {
                approve_qty: approved,
                reject_qty: Math.max(0, requested - approved),
                reserve_qty: Math.min(approved, reserved),
                vendor_id: item.source === "quotation" ? (item.vendor_id ?? null) : (item.vendor_id ?? null),
                vendor_rate: item.source === "quotation" ? (item.vendor_rate ?? null) : (item.vendor_rate ?? null),
                remarks: "",
                requested,
                available: Number(item.store_available_qty || 0),
                locked: item.source === "quotation",
            };
        });
        return init;
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadVendors = async () => {
            try {
                const res = await apiClient<{ vendors: { id: number; vendor_name: string }[] }>("/vendors", {
                    method: "GET",
                    withAuth: true,
                    params: { limit: "1000" }
                });
                setVendors(res?.vendors || []);
            } catch (e) {}
        };
        loadVendors();
    }, []);

    const canReserveAfterApproval = useMemo(() => {
        return (pr.restock_mode === 'main_warehouse') || Boolean((pr as any).is_main_store);
    }, [pr]);

    const totals = useMemo(() => {
        let requested = 0, approved = 0, rejected = 0, reserved = 0, toPurchase = 0;
        pr.items.forEach((item) => {
            const r = rows[item.item_id];
            if (!r) return;
            requested += r.requested;
            approved += r.approve_qty;
            rejected += r.reject_qty;
            reserved += r.reserve_qty;
            toPurchase += Math.max(0, r.approve_qty - r.reserve_qty);
        });
        return { requested, approved, rejected, reserved, toPurchase };
    }, [rows, pr.items]);

    const updateRow = (itemId: number, patch: Partial<typeof rows[number]>) => {
        setRows((prev) => {
            const current = prev[itemId];
            const next = { ...current, ...patch };
            if (patch.approve_qty !== undefined || patch.reject_qty !== undefined) {
                const requested = next.requested;
                let approve = Number(next.approve_qty);
                let reject = Number(next.reject_qty);
                if (patch.approve_qty !== undefined && patch.reject_qty === undefined) {
                    approve = Math.max(0, Math.min(requested, approve));
                    reject = Math.max(0, Number((requested - approve).toFixed(2)));
                } else if (patch.reject_qty !== undefined && patch.approve_qty === undefined) {
                    reject = Math.max(0, Math.min(requested, reject));
                    approve = Math.max(0, Number((requested - reject).toFixed(2)));
                }
                next.approve_qty = approve;
                next.reject_qty = reject;
                next.reserve_qty = Math.min(next.reserve_qty, approve);
            }
            if (patch.reserve_qty !== undefined) {
                next.reserve_qty = Math.max(0, Math.min(next.approve_qty, Math.min(next.available, Number(patch.reserve_qty))));
            }
            return { ...prev, [itemId]: next };
        });
    };

    const handleSubmit = async () => {
        if (action === "reject" && !comment.trim()) {
            showError("Comment is required when rejecting");
            return;
        }

        try {
            setLoading(true);

            if (action === "approve") {
                const payloadItems = pr.items.map((item) => {
                    const r = rows[item.item_id];
                    return {
                        item_id: item.item_id,
                        approve_qty: r.approve_qty,
                        reject_qty: r.reject_qty,
                        reserve_qty: r.reserve_qty,
                        vendor_id: r.locked ? item.vendor_id ?? null : r.vendor_id ?? null,
                        vendor_rate: r.locked ? item.vendor_rate ?? null : r.vendor_rate ?? null,
                        remarks: r.remarks || undefined,
                    };
                });

                await apiClient(`/pr/${pr.id}/approve`, {
                    method: "POST",
                    withAuth: true,
                    body: {
                        comment: comment.trim() || undefined,
                        items: payloadItems,
                        reserve_stock: reserveStock,
                    },
                });

                showSuccess("PR approved successfully");
            } else {
                await apiClient(`/pr/${pr.id}/reject`, {
                    method: "POST",
                    withAuth: true,
                    body: {
                        comment: comment.trim(),
                    },
                });

                showSuccess("PR rejected successfully");
            }

            onSuccess();
        } catch (err: any) {
            console.error(`Failed to ${action} PR:`, err);
            showError(err?.message || `Failed to ${action} PR`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold">
                        {action === "approve" ? "Approve" : "Reject"} PR - {pr.pr_number}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Header Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <Calendar size={18} className="text-gray-600" />
                            <div>
                                <div className="text-sm text-gray-500">PR Date</div>
                                <div className="text-sm font-medium text-gray-900">{pr.created_at ? new Date(pr.created_at).toLocaleDateString() : "-"}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <AlertCircle size={18} className="text-gray-600" />
                            <div>
                                <div className="text-sm text-gray-500">Priority</div>
                                <div className="text-sm font-medium text-gray-900">{pr.priority || "normal"}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <AlertCircle size={18} className="text-gray-600" />
                            <div>
                                <div className="text-sm text-gray-500">Approval Level</div>
                                <div className="text-sm font-medium text-gray-900">{pr.approval_level} / {pr.approvals_required}</div>
                            </div>
                        </div>
                    </div>

                    {/* Requester & Site */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <Building size={18} className="text-gray-600" />
                            <div>
                                <div className="text-sm text-gray-500">Site</div>
                                <div className="text-sm font-medium text-gray-900">{pr.site_name || "-"}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <Store size={18} className="text-gray-600" />
                            <div>
                                <div className="text-sm text-gray-500">Store</div>
                                <div className="text-sm font-medium text-gray-900">{pr.store_name || "-"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Action <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setAction("approve")}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 flex items-center justify-center gap-2 ${action === "approve"
                                    ? "border-green-600 bg-green-50 text-green-700"
                                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                                    }`}
                            >
                                <CheckCircle size={20} />
                                Approve
                            </button>
                            <button
                                onClick={() => setAction("reject")}
                                className={`flex-1 px-4 py-3 rounded-lg border-2 flex items-center justify-center gap-2 ${action === "reject"
                                    ? "border-red-600 bg-red-50 text-red-700"
                                    : "border-gray-300 text-gray-700 hover:border-gray-400"
                                    }`}
                            >
                                <XCircle size={20} />
                                Reject
                            </button>
                        </div>
                    </div>

                    {/* Items Approval Table */}
                    {action === "approve" && (
                        <div className="mb-6">
                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <button
                                    onClick={() => {
                                        setRows((prev) => {
                                            const next: typeof prev = { ...prev };
                                            pr.items.forEach((item) => {
                                                const r = next[item.item_id];
                                                const requested = r.requested;
                                                next[item.item_id] = { ...r, approve_qty: requested, reject_qty: 0, reserve_qty: Math.min(requested, r.available) };
                                            });
                                            return next;
                                        });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Approve All
                                </button>
                                {canReserveAfterApproval && (
                                    <button
                                        onClick={() => {
                                            setRows((prev) => {
                                                const next: typeof prev = { ...prev };
                                                pr.items.forEach((item) => {
                                                    const r = next[item.item_id];
                                                    next[item.item_id] = { ...r, reserve_qty: Math.min(r.approve_qty, r.available) };
                                                });
                                                return next;
                                            });
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Reserve Auto
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setRows((prev) => {
                                            const next: typeof prev = { ...prev };
                                            pr.items.forEach((item) => {
                                                const r = next[item.item_id];
                                                next[item.item_id] = { ...r, reserve_qty: 0 };
                                            });
                                            return next;
                                        });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Clear Reserves
                                </button>
                            </div>
                            <div className="border border-gray-200 rounded-lg overflow-x-auto">
                                <table className="w-full min-w-[900px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approve</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reject</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserve</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">To Purchase</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {pr.items.map((item) => {
                                            const r = rows[item.item_id];
                                            const toPurchase = Math.max(0, r.approve_qty - r.reserve_qty);
                                            return (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                                                        <div className="text-xs text-gray-500">{item.item_code}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{r.requested}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{r.available}</td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" inputMode="decimal" value={String(r.approve_qty)}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                updateRow(item.item_id, { approve_qty: Number(val || 0) });
                                                            }}
                                                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" inputMode="decimal" value={String(r.reject_qty)}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                updateRow(item.item_id, { reject_qty: Number(val || 0) });
                                                            }}
                                                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" inputMode="decimal" value={String(r.reserve_qty)}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                                updateRow(item.item_id, { reserve_qty: Number(val || 0) });
                                                            }}
                                                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-medium">{toPurchase}</td>
                                                    <td className="px-4 py-3">
                                                        {r.locked ? (
                                                            <div className="text-sm text-gray-900">{item.vendor_name || "-"}</div>
                                                        ) : (
                                                            <select
                                                                value={r.vendor_id || ""}
                                                                onChange={(e) => updateRow(item.item_id, { vendor_id: e.target.value ? Number(e.target.value) : null })}
                                                                className="px-3 py-2 border border-gray-300 rounded-lg"
                                                            >
                                                                <option value="">Select</option>
                                                                {vendors.map((v) => (
                                                                    <option key={v.id} value={v.id}>{v.vendor_name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {r.locked ? (
                                                            <div className="text-sm text-gray-900">{item.vendor_rate ?? 0}</div>
                                                        ) : (
                                                            <input type="number" value={r.vendor_rate ?? 0}
                                                                onChange={(e) => updateRow(item.item_id, { vendor_rate: Number(e.target.value) })}
                                                                min={0} step="0.01" className="w-28 px-3 py-2 border border-gray-300 rounded-lg" />
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" value={r.remarks}
                                                            onChange={(e) => updateRow(item.item_id, { remarks: e.target.value })}
                                                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg" />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Reserve Stock Option (only for approve and main store mode) */}
                    {action === "approve" && canReserveAfterApproval && (
                        <div className="mb-6">
                            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    checked={reserveStock}
                                    onChange={(e) => setReserveStock(e.target.checked)}
                                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                />
                                <div>
                                    <div className="font-medium text-gray-900">
                                        Reserve Stock After Approval
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Automatically reserve approved quantities in the store
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Summary */}
                    {action === "approve" && (
                        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="p-4 border border-gray-200 rounded-lg"><div className="text-xs text-gray-500">Requested</div><div className="text-lg font-semibold">{totals.requested}</div></div>
                            <div className="p-4 border border-gray-200 rounded-lg"><div className="text-xs text-gray-500">Approved</div><div className="text-lg font-semibold">{totals.approved}</div></div>
                            <div className="p-4 border border-gray-200 rounded-lg"><div className="text-xs text-gray-500">Rejected</div><div className="text-lg font-semibold">{totals.rejected}</div></div>
                            <div className="p-4 border border-gray-200 rounded-lg"><div className="text-xs text-gray-500">Reserved</div><div className="text-lg font-semibold">{totals.reserved}</div></div>
                            <div className="p-4 border border-gray-200 rounded-lg"><div className="text-xs text-gray-500">To Purchase</div><div className="text-lg font-semibold">{totals.toPurchase}</div></div>
                        </div>
                    )}

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Comment {action === "reject" && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={4}
                            placeholder={
                                action === "reject"
                                    ? "Please provide a reason for rejection..."
                                    : "Add any comments or notes (optional)..."
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-4 p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className={`px-6 py-2 rounded-lg text-white flex items-center gap-2 disabled:opacity-50 ${action === "approve"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                            }`}
                    >
                        {action === "approve" ? (
                            <>
                                <CheckCircle size={20} />
                                Approve PR
                            </>
                        ) : (
                            <>
                                <XCircle size={20} />
                                Reject PR
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

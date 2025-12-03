"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, XCircle, Clock, CheckCircle, Users, Package, AlertTriangle } from "lucide-react";
import RfqStatusBadge from "./RfqStatusBadge";
import { showSuccess, showError } from "@/lib/toast";

export default function RfqDetails() {
    const params = useParams();
    const router = useRouter();
    const rfqId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [rfq, setRfq] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'send' | 'close' | null>(null);

    useEffect(() => {
        if (rfqId) {
            fetchRfqDetails();
        }
    }, [rfqId]);

    const fetchRfqDetails = async () => {
        try {
            setLoading(true);
            const res = await apiClient<any>(`/rfq/${rfqId}`, {
                method: "GET",
                withAuth: true,
            });

            setRfq(res?.rfq);
            // Items and vendors are nested inside rfq object
            setItems(res?.rfq?.items || []);
            setVendors(res?.rfq?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch RFQ details:", err);
            showError("Failed to load RFQ details");
        } finally {
            setLoading(false);
        }
    };

    const handleSendRfq = async () => {
        setConfirmAction('send');
        setShowConfirmModal(true);
    };

    const handleCloseRfq = async () => {
        setConfirmAction('close');
        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        setShowConfirmModal(false);

        if (confirmAction === 'send') {
            try {
                setLoading(true);
                await apiClient(`/rfq/${rfqId}/send`, {
                    method: "POST",
                    withAuth: true,
                });

                showSuccess("RFQ sent to vendors successfully");
                fetchRfqDetails();
            } catch (err: any) {
                console.error("Failed to send RFQ:", err);
                showError(err?.message || "Failed to send RFQ");
            } finally {
                setLoading(false);
            }
        } else if (confirmAction === 'close') {
            try {
                setLoading(true);
                await apiClient(`/rfq/${rfqId}/close`, {
                    method: "POST",
                    withAuth: true,
                });

                showSuccess("RFQ closed successfully");
                fetchRfqDetails();
            } catch (err: any) {
                console.error("Failed to close RFQ:", err);
                showError(err?.message || "Failed to close RFQ");
            } finally {
                setLoading(false);
            }
        }

        setConfirmAction(null);
    };

    const handleViewComparison = () => {
        router.push(`${window.location.pathname}/comparison`);
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">Loading RFQ details...</div>
            </div>
        );
    }

    if (!rfq) {
        return (
            <div className="p-6">
                <div className="text-center py-12 text-gray-500">RFQ not found</div>
            </div>
        );
    }

    const canSend = rfq.status === 'draft';
    const canClose = rfq.status === 'sent' || rfq.status === 'partially_quoted' || rfq.status === 'fully_quoted';
    const canViewComparison = rfq.status === 'partially_quoted' || rfq.status === 'fully_quoted';

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{rfq.rfq_number}</h1>
                        <p className="text-gray-600">RFQ Details</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {canSend && (
                        <button
                            onClick={handleSendRfq}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Send size={18} />
                            Send RFQ
                        </button>
                    )}
                    {canViewComparison && (
                        <button
                            onClick={handleViewComparison}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                        >
                            <CheckCircle size={18} />
                            View Comparison
                        </button>
                    )}
                    {canClose && (
                        <button
                            onClick={handleCloseRfq}
                            disabled={loading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <XCircle size={18} />
                            Close RFQ
                        </button>
                    )}
                </div>
            </div>

            {/* RFQ Header Info */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                        <RfqStatusBadge status={rfq.status} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Site</label>
                        <p className="text-gray-900">{rfq.site_name || "N/A"}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Store</label>
                        <p className="text-gray-900">{rfq.store_name || "N/A"}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Created By</label>
                        <p className="text-gray-900">
                            {rfq.requester_first_name} {rfq.requester_last_name}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Due Date</label>
                        <p className="text-gray-900">
                            {rfq.due_date ? new Date(rfq.due_date).toLocaleDateString() : "Not specified"}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                        <p className="text-gray-900">
                            {new Date(rfq.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    {rfq.purpose && (
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-500 mb-1">Purpose</label>
                            <p className="text-gray-900">{rfq.purpose}</p>
                        </div>
                    )}
                    {rfq.attachment_url && (
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-500 mb-1">Attachment</label>
                            <a
                                href={rfq.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                View Attachment
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Package className="text-gray-600" size={20} />
                    <h2 className="text-lg font-semibold">Items ({items.length})</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Item
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Category
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    UOM
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Required Qty
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Specification
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.item_name}
                                        </div>
                                        <div className="text-xs text-gray-500">{item.item_code}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">{item.category_name || "-"}</div>
                                        <div className="text-xs text-gray-500">{item.subcategory_name || "-"}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.uom}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{item.required_qty}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {item.specification || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vendors */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="text-gray-600" size={20} />
                    <h2 className="text-lg font-semibold">Vendors ({vendors.length})</h2>
                </div>
                <div className="space-y-3">
                    {vendors.map((vendor) => (
                        <div
                            key={vendor.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                        >
                            <div className="flex-1">
                                <div className="font-medium text-gray-900">{vendor.vendor_name}</div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {vendor.vendor_code && <span>{vendor.vendor_code} • </span>}
                                    {vendor.email}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    {vendor.contact_person && <span>Contact: {vendor.contact_person}</span>}
                                    {vendor.phone && <span> • {vendor.phone}</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {vendor.email_sent_at && (
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={14} />
                                        Sent: {new Date(vendor.email_sent_at).toLocaleDateString()}
                                    </div>
                                )}
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${vendor.response_status === "submitted"
                                        ? "bg-green-100 text-green-700"
                                        : vendor.response_status === "declined"
                                            ? "bg-red-100 text-red-700"
                                            : vendor.response_status === "draft"
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {vendor.response_status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-3 rounded-full ${confirmAction === 'send' ? 'bg-blue-100' : 'bg-red-100'
                                    }`}>
                                    <AlertTriangle
                                        className={confirmAction === 'send' ? 'text-blue-600' : 'text-red-600'}
                                        size={24}
                                    />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {confirmAction === 'send' ? 'Send RFQ' : 'Close RFQ'}
                                </h3>
                            </div>
                            <p className="text-gray-600 mb-6">
                                {confirmAction === 'send'
                                    ? 'Are you sure you want to send this RFQ to all selected vendors? They will receive email notifications with the RFQ details.'
                                    : 'Are you sure you want to close this RFQ? This action cannot be undone and vendors will no longer be able to submit quotations.'}
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setConfirmAction(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={executeAction}
                                    className={`px-4 py-2 text-white rounded-lg font-medium ${confirmAction === 'send'
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-red-600 hover:bg-red-700'
                                        }`}
                                >
                                    {confirmAction === 'send' ? 'Send RFQ' : 'Close RFQ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

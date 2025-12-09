"use client";
import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { FileText, ArrowLeft, Download, Package, Calendar, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";

interface GrnData {
    id: number;
    grn_type: string;
    store_id: number;
    vendor_id: number | null;
    invoice_no: string | null;
    invoice_date: string | null;
    attachment_url: string | null;
    remarks: string | null;
    status: string;
    created_at: string;
    store_name: string;
    vendor_name: string | null;
    first_name: string;
    last_name: string;
    items: GrnItemData[];
}

interface GrnItemData {
    id: number;
    item_id: number;
    item_name: string;
    item_code: string;
    uom: string;
    qty_ordered: number | null;
    qty_received: number;
    qty_damaged: number;
    qty_missing: number;
    batches: BatchData[];
    serials: SerialData[];
}

interface BatchData {
    id: number;
    batch_no: string;
    qty: number;
    expiry_date: string | null;
    mfg_date: string | null;
}

interface SerialData {
    id: number;
    serial_no: string;
}

const GRN_TYPE_COLORS: any = {
    OPENING: 'bg-indigo-100 text-indigo-800',
    VENDOR: 'bg-green-100 text-green-800',
    TRANSFER: 'bg-blue-100 text-blue-800',
    REPLACEMENT: 'bg-purple-100 text-purple-800'
};

export default function GrnView() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const grnId = params?.id as string;
    const [grn, setGrn] = useState<GrnData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (grnId) {
            fetchGrn(Number(grnId));
        }
    }, [grnId]);

    const fetchGrn = async (id: number) => {
        setLoading(true);
        try {
            const res = await apiClient<{ grn: GrnData }>(
                `/inventory/grn/${id}`,
                {
                    method: 'GET',
                    withAuth: true
                }
            );
            setGrn(res?.grn || null);
        } catch (err: any) {
            console.error("Failed to fetch GRN:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    const getBasePath = () => {
        return pathname.includes('/org-admin') ? '/org-admin' : '/employee';
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!grn) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                    <p className="text-red-800">GRN not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href={`${getBasePath()}/inventory/grn`}
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
                >
                    <ArrowLeft size={20} />
                    Back to GRN List
                </Link>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                            <FileText className="text-indigo-600" size={28} />
                            GRN #{grn.id}
                        </h1>
                        <div className="mt-2 flex items-center gap-3">
                            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${GRN_TYPE_COLORS[grn.grn_type]}`}>
                                {grn.grn_type}
                            </span>
                            <span className={`inline-flex px-3 py-1 text-sm font-medium rounded ${grn.status === 'submitted' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                {grn.status.charAt(0).toUpperCase() + grn.status.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* GRN Details */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">GRN Details</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium text-slate-600">Store</label>
                        <p className="text-slate-900">{grn.store_name}</p>
                    </div>
                    {grn.vendor_name && (
                        <div>
                            <label className="text-sm font-medium text-slate-600">Vendor</label>
                            <p className="text-slate-900">{grn.vendor_name}</p>
                        </div>
                    )}
                    {grn.invoice_no && (
                        <div>
                            <label className="text-sm font-medium text-slate-600">Invoice Number</label>
                            <p className="text-slate-900">{grn.invoice_no}</p>
                        </div>
                    )}
                    {grn.invoice_date && (
                        <div>
                            <label className="text-sm font-medium text-slate-600">Invoice Date</label>
                            <p className="text-slate-900">{formatDate(grn.invoice_date)}</p>
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-medium text-slate-600">Created By</label>
                        <p className="text-slate-900">{[grn.first_name, grn.last_name].filter(Boolean).join(' ')}</p>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-600">Created At</label>
                        <p className="text-slate-900">{formatDate(grn.created_at)}</p>
                    </div>
                    {grn.remarks && (
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-600">Remarks</label>
                            <p className="text-slate-900">{grn.remarks}</p>
                        </div>
                    )}
                    {grn.attachment_url && (
                        <div className="col-span-2">
                            <label className="text-sm font-medium text-slate-600">Attachment</label>
                            <a
                                href={grn.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
                            >
                                <Download size={16} />
                                Download Invoice
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Items */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-900">Items</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Ordered</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Received</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Damaged</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Missing</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Batches/Serials</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {grn.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-slate-900">{item.item_name}</div>
                                        <div className="text-xs text-slate-500">{item.item_code}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                                        {item.qty_ordered !== null ? `${item.qty_ordered} ${item.uom}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-semibold text-green-700">
                                        {item.qty_received} {item.uom}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-red-700">
                                        {item.qty_damaged > 0 ? `${item.qty_damaged} ${item.uom}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm text-amber-700">
                                        {item.qty_missing > 0 ? `${item.qty_missing} ${item.uom}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {item.batches.length > 0 && (
                                            <div className="space-y-1">
                                                {item.batches.map((batch) => (
                                                    <div key={batch.id} className="text-xs">
                                                        <span className="font-mono font-semibold">{batch.batch_no}</span>
                                                        <span className="text-slate-500"> ({batch.qty} {item.uom})</span>
                                                        {batch.expiry_date && (
                                                            <span className="text-slate-500"> - Exp: {formatDate(batch.expiry_date)}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {item.serials.length > 0 && (
                                            <div className="text-xs text-slate-600">
                                                {item.serials.length} serial(s)
                                            </div>
                                        )}
                                        {item.batches.length === 0 && item.serials.length === 0 && '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

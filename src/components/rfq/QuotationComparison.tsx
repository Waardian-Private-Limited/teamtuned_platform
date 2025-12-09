"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useParams, useRouter } from "next/navigation";
import { Trophy, CheckCircle, ArrowLeft } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";

interface VendorQuotation {
    vendor_id: number;
    vendor_name: string;
    vendor_code: string;
    response_status: string;
    quotation: {
        id: number;
        quotation_date: string;
        valid_till: string;
        delivery_days: number;
        remarks: string;
        total_value: number;
        submitted_at: string;
        items: any[];
    } | null;
}

export default function QuotationComparison() {
    const params = useParams();
    const router = useRouter();
    const rfqId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [rfq, setRfq] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [comparison, setComparison] = useState<VendorQuotation[]>([]);
    const [winner, setWinner] = useState<any>(null);
    const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        if (rfqId) {
            fetchComparison();
        }
    }, [rfqId]);

    const fetchComparison = async () => {
        try {
            setLoading(true);
            const res = await apiClient<any>(`/rfq/${rfqId}/comparison`, {
                method: "GET",
                withAuth: true,
            });

            setRfq(res?.rfq);
            setItems(res?.items || []);
            setComparison(res?.comparison || []);
            setWinner(res?.winner);

            if (res?.winner) {
                setSelectedVendor(res.winner.vendor_id);
            }
        } catch (err) {
            console.error("Failed to fetch comparison:", err);
            showError("Failed to load comparison data");
        } finally {
            setLoading(false);
        }
    };

    const getLowestRateForItem = (itemId: number) => {
        const rates = comparison
            .filter(v => v.quotation && v.quotation.items)
            .flatMap(v => v.quotation!.items)
            .filter(item => item.item_id === itemId)
            .map(item => parseFloat(item.rate));

        return rates.length > 0 ? Math.min(...rates) : null;
    };

    const handleSelectWinner = async () => {
        if (!selectedVendor) {
            showError("Please select a vendor");
            return;
        }

        try {
            setLoading(true);
            await apiClient(`/rfq/${rfqId}/select-winner`, {
                method: "POST",
                withAuth: true,
                body: {
                    vendor_id: selectedVendor,
                    remarks,
                },
            });

            showSuccess("Winner selected successfully");
            fetchComparison();
        } catch (err: any) {
            console.error("Failed to select winner:", err);
            showError(err?.message || "Failed to select winner");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center py-12">Loading comparison...</div>
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

    const submittedVendors = comparison.filter(v => v.quotation);

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
                        <h1 className="text-2xl font-bold">Quotation Comparison</h1>
                        <p className="text-gray-600">{rfq.rfq_number}</p>
                    </div>
                </div>
            </div>

            {submittedVendors.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <p className="text-gray-500">No quotations submitted yet</p>
                </div>
            ) : (
                <>
                    {/* Comparison Table */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50">
                                            Item
                                        </th>
                                        {submittedVendors.map((vendor) => (
                                            <th
                                                key={vendor.vendor_id}
                                                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                                            >
                                                <div>{vendor.vendor_name}</div>
                                                <div className="text-xs text-gray-400 font-normal">
                                                    {vendor.vendor_code}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {items.map((item) => {
                                        const lowestRate = getLowestRateForItem(item.item_id);

                                        return (
                                            <tr key={item.item_id}>
                                                <td className="px-4 py-3 sticky left-0 bg-white">
                                                    <div className="font-medium text-gray-900">
                                                        {item.item_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {item.item_code} • Required: {item.required_qty} {item.uom}
                                                    </div>
                                                </td>
                                                {submittedVendors.map((vendor) => {
                                                    const quotationItem = vendor.quotation?.items.find(
                                                        (qi: any) => qi.item_id === item.item_id
                                                    );

                                                    const isLowest =
                                                        quotationItem &&
                                                        lowestRate !== null &&
                                                        parseFloat(quotationItem.rate) === lowestRate;

                                                    return (
                                                        <td
                                                            key={vendor.vendor_id}
                                                            className={`px-4 py-3 text-center ${isLowest ? "bg-green-50" : ""
                                                                }`}
                                                        >
                                                            {quotationItem ? (
                                                                <div>
                                                                    <div
                                                                        className={`font-semibold ${isLowest ? "text-green-700" : "text-gray-900"
                                                                            }`}
                                                                    >
                                                                        ₹{parseFloat(quotationItem.rate).toFixed(2)}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        Qty: {quotationItem.offered_qty}
                                                                    </div>
                                                                    {quotationItem.discount > 0 && (
                                                                        <div className="text-xs text-gray-500">
                                                                            Disc: ₹{quotationItem.discount}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-xs text-gray-500">
                                                                        Tax: {quotationItem.tax_percentage}%
                                                                    </div>
                                                                    <div className="text-xs font-medium text-gray-700 mt-1">
                                                                        Total: ₹{parseFloat(quotationItem.total).toFixed(2)}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}

                                    {/* Delivery Days Row */}
                                    <tr className="bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-gray-50">
                                            Delivery Days
                                        </td>
                                        {submittedVendors.map((vendor) => (
                                            <td key={vendor.vendor_id} className="px-4 py-3 text-center font-medium">
                                                {vendor.quotation?.delivery_days || "-"}
                                            </td>
                                        ))}
                                    </tr>

                                    {/* Total Value Row */}
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="px-4 py-3 text-gray-900 sticky left-0 bg-gray-50">
                                            Total Value
                                        </td>
                                        {submittedVendors.map((vendor) => (
                                            <td key={vendor.vendor_id} className="px-4 py-3 text-center text-blue-600">
                                                ₹{Number(vendor.quotation?.total_value || 0).toFixed(2)}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Winner Selection */}
                    <div className="bg-white rounded-lg shadow-sm p-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Trophy className="text-yellow-500" size={24} />
                            Select Winner
                        </h2>

                        {winner ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                                    <CheckCircle size={20} />
                                    Winner Selected
                                </div>
                                <p className="text-gray-700">
                                    <strong>
                                        {comparison.find(v => v.vendor_id === winner.vendor_id)?.vendor_name}
                                    </strong>
                                </p>
                                {winner.remarks && (
                                    <p className="text-sm text-gray-600 mt-2">Remarks: {winner.remarks}</p>
                                )}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Vendor <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedVendor || ""}
                                    onChange={(e) => setSelectedVendor(Number(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Choose vendor...</option>
                                    {submittedVendors.map((vendor) => (
                                        <option key={vendor.vendor_id} value={vendor.vendor_id}>
                                            {vendor.vendor_name} - ₹
                                            {Number(vendor.quotation?.total_value || 0).toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                                <input
                                    type="text"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Optional remarks"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4 mt-6">
                            <button
                                onClick={handleSelectWinner}
                                disabled={loading || !selectedVendor}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                <Trophy size={20} />
                                {winner ? "Update Winner" : "Select Winner"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

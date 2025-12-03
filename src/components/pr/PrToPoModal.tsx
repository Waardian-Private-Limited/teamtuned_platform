"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { X, ShoppingCart } from "lucide-react";

interface PrItem {
    id: number;
    item_id: number;
    item_name: string;
    item_code: string;
    qty_approved: number;
    estimated_rate: number;
    tax_percentage: number;
    description: string;
}

interface PurchaseRequest {
    id: number;
    pr_number: string;
    preferred_vendor_id: number;
    items: PrItem[];
}

interface Vendor {
    id: number;
    vendor_name: string;
}

interface PrToPoModalProps {
    pr: PurchaseRequest;
    onClose: () => void;
    onSuccess: () => void;
}

interface PoItem {
    item_id: number;
    selected: boolean;
    qty: number;
    rate: number;
    tax_percentage: number;
    description: string;
}

export default function PrToPoModal({ pr, onClose, onSuccess }: PrToPoModalProps) {
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorId, setVendorId] = useState<number>(pr.preferred_vendor_id || 0);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [poItems, setPoItems] = useState<{ [key: number]: PoItem }>(
        pr.items.reduce((acc, item) => {
            acc[item.item_id] = {
                item_id: item.item_id,
                selected: true,
                qty: item.qty_approved,
                rate: item.estimated_rate,
                tax_percentage: item.tax_percentage,
                description: item.description || "",
            };
            return acc;
        }, {} as { [key: number]: PoItem })
    );

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        try {
            const res = await apiClient<{ vendors: Vendor[] }>("/vendors", {
                method: "GET",
                withAuth: true,
            });
            setVendors(res?.vendors || []);
        } catch (err) {
            console.error("Failed to fetch vendors:", err);
        }
    };

    const updateItem = (itemId: number, field: keyof PoItem, value: any) => {
        setPoItems({
            ...poItems,
            [itemId]: {
                ...poItems[itemId],
                [field]: value,
            },
        });
    };

    const calculateItemTotal = (item: PoItem) => {
        const baseAmount = Number(item.qty) * Number(item.rate);
        const taxAmount = (baseAmount * Number(item.tax_percentage)) / 100;
        return baseAmount + taxAmount;
    };

    const calculateGrandTotal = () => {
        return Object.values(poItems)
            .filter((item) => item.selected)
            .reduce((total, item) => total + calculateItemTotal(item), 0);
    };

    const handleSubmit = async () => {
        if (!vendorId) {
            alert("Please select a vendor");
            return;
        }

        const selectedItems = Object.values(poItems).filter((item) => item.selected);
        if (selectedItems.length === 0) {
            alert("Please select at least one item");
            return;
        }

        try {
            setLoading(true);
            await apiClient(`/pr/${pr.id}/convert-to-po`, {
                method: "POST",
                withAuth: true,
                body: JSON.stringify({
                    vendor_id: vendorId,
                    notes,
                    items: selectedItems.map((item) => ({
                        item_id: item.item_id,
                        qty: item.qty,
                        rate: item.rate,
                        tax_percentage: item.tax_percentage,
                        description: item.description,
                    })),
                }),
            });

            alert("PR converted to PO successfully");
            onSuccess();
        } catch (err) {
            console.error("Failed to convert PR to PO:", err);
            alert("Failed to convert PR to PO");
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
        }).format(amount);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold">Convert PR to PO - {pr.pr_number}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Vendor Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vendor <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={vendorId}
                            onChange={(e) => setVendorId(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select Vendor</option>
                            {vendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>
                                    {vendor.vendor_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Items Selection */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">
                            Select Items & Adjust Quantities/Rates
                        </h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            <input
                                                type="checkbox"
                                                checked={Object.values(poItems).every((item) => item.selected)}
                                                onChange={(e) => {
                                                    const newItems = { ...poItems };
                                                    Object.keys(newItems).forEach((key) => {
                                                        newItems[Number(key)].selected = e.target.checked;
                                                    });
                                                    setPoItems(newItems);
                                                }}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Item
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Qty
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Rate
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Tax %
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {pr.items.map((prItem) => {
                                        const poItem = poItems[prItem.item_id];
                                        return (
                                            <tr
                                                key={prItem.id}
                                                className={!poItem.selected ? "bg-gray-50 opacity-60" : ""}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={poItem.selected}
                                                        onChange={(e) =>
                                                            updateItem(prItem.item_id, "selected", e.target.checked)
                                                        }
                                                        className="w-4 h-4 text-blue-600 rounded"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {prItem.item_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{prItem.item_code}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={poItem.qty}
                                                        onChange={(e) =>
                                                            updateItem(prItem.item_id, "qty", Number(e.target.value))
                                                        }
                                                        disabled={!poItem.selected}
                                                        min="0"
                                                        max={prItem.qty_approved}
                                                        step="0.01"
                                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={poItem.rate}
                                                        onChange={(e) =>
                                                            updateItem(prItem.item_id, "rate", Number(e.target.value))
                                                        }
                                                        disabled={!poItem.selected}
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        value={poItem.tax_percentage}
                                                        onChange={(e) =>
                                                            updateItem(
                                                                prItem.item_id,
                                                                "tax_percentage",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                        disabled={!poItem.selected}
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium">
                                                    {poItem.selected ? formatCurrency(calculateItemTotal(poItem)) : "-"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-3 text-right font-bold text-lg">
                                            Grand Total:
                                        </td>
                                        <td className="px-4 py-3 font-bold text-lg">
                                            {formatCurrency(calculateGrandTotal())}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Add any notes for this PO..."
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
                        className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                    >
                        <ShoppingCart size={20} />
                        Convert to PO
                    </button>
                </div>
            </div>
        </div>
    );
}

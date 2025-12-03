"use client";
import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { useInventoryStore } from "../InventoryStoreContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, Send, Search } from "lucide-react";
import Link from "next/link";
import BatchEntryModal from "./BatchEntryModal";
import SerialEntryModal from "./SerialEntryModal";
import ItemSearchModal from "./ItemSearchModal";

interface Item {
    id: string;
    itemId: number;
    itemName: string;
    itemCode: string;
    uom: string;
    qtyOrdered: number | null;
    qtyReceived: number;
    qtyDamaged: number;
    qtyMissing: number;
    isBatchTracked: boolean;
    isSerialTracked: boolean;
    batches: BatchData[];
    serials: SerialData[];
}

interface BatchData {
    batchNo: string;
    qty: number;
    expiryDate: string | null;
    mfgDate: string | null;
}

interface SerialData {
    serialNo: string;
}

interface InventoryItem {
    id: number;
    item_name: string;
    item_code: string;
    uom: string;
    is_batch_tracked: boolean;
    is_serial_tracked: boolean;
    is_expiry_required: boolean;
    category_name?: string;
    subcategory_name?: string;
}

interface Vendor {
    id: number;
    vendor_name: string;
}

export default function GrnForm() {
    const router = useRouter();
    const { selectedStore } = useInventoryStore();

    // Form state
    const [grnType, setGrnType] = useState<'OPENING' | 'VENDOR' | 'TRANSFER' | 'REPLACEMENT'>('VENDOR');
    const [vendorId, setVendorId] = useState<number | null>(null);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [invoiceDate, setInvoiceDate] = useState("");
    const [remarks, setRemarks] = useState("");
    const [items, setItems] = useState<Item[]>([]);

    // Data
    const [vendors, setVendors] = useState<Vendor[]>([]);

    // Modal state
    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [serialModalOpen, setSerialModalOpen] = useState(false);
    const [itemSearchModalOpen, setItemSearchModalOpen] = useState(false);
    const [currentItemId, setCurrentItemId] = useState<string | null>(null);

    // Loading
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (grnType === 'VENDOR') {
            fetchVendors();
        }
    }, [grnType]);

    const fetchVendors = async () => {
    try {
      const res = await apiClient<{ vendors: Vendor[] }>(
        '/vendors',
        { method: 'GET', withAuth: true }
      );
      setVendors(res?.vendors || []);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    }
  };

  const addItem = () => {
    setCurrentItemId(Date.now().toString());
    setItemSearchModalOpen(true);
  };

  const selectItem = (selectedItem: InventoryItem) => {
    if (currentItemId) {
      // Check if item already exists
      if (items.some(item => item.itemId === selectedItem.id)) {
        alert("This item is already added");
        return;
      }

      const newItem: Item = {
        id: currentItemId,
        itemId: selectedItem.id,
        itemName: selectedItem.item_name,
        itemCode: selectedItem.item_code,
        uom: selectedItem.uom,
        qtyOrdered: null,
        qtyReceived: 0,
        qtyDamaged: 0,
        qtyMissing: 0,
        isBatchTracked: selectedItem.is_batch_tracked,
        isSerialTracked: selectedItem.is_serial_tracked,
        batches: [],
        serials: []
      };
      setItems([...items, newItem]);
    }
    setItemSearchModalOpen(false);
    setCurrentItemId(null);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

    const openBatchModal = (itemId: string) => {
        setCurrentItemId(itemId);
        setBatchModalOpen(true);
    };

    const openSerialModal = (itemId: string) => {
        setCurrentItemId(itemId);
        setSerialModalOpen(true);
    };

    const saveBatches = (batches: BatchData[]) => {
        if (currentItemId) {
            setItems(items.map(item =>
                item.id === currentItemId ? { ...item, batches } : item
            ));
        }
        setBatchModalOpen(false);
        setCurrentItemId(null);
    };

    const saveSerials = (serials: SerialData[]) => {
        if (currentItemId) {
            setItems(items.map(item =>
                item.id === currentItemId ? { ...item, serials } : item
            ));
        }
        setSerialModalOpen(false);
        setCurrentItemId(null);
    };

    const validateForm = () => {
        if (!selectedStore) {
            alert("Please select a store first");
            return false;
        }
        if (grnType === 'VENDOR' && !vendorId) {
            alert("Please select a vendor");
            return false;
        }
        if (items.length === 0) {
            alert("Please add at least one item");
            return false;
        }
        for (const item of items) {
            if (!item.itemId) {
                alert("Please select an item for all rows");
                return false;
            }
            if (item.qtyReceived <= 0) {
                alert("Quantity received must be greater than 0");
                return false;
            }
            if (item.isBatchTracked && item.batches.length === 0) {
                alert(`Please add batch details for ${ item.itemName }`);
                return false;
            }
            if (item.isSerialTracked && item.serials.length === 0) {
                alert(`Please add serial numbers for ${ item.itemName }`);
                return false;
            }
            // Validate batch quantities
            if (item.isBatchTracked) {
                const totalBatchQty = item.batches.reduce((sum, b) => sum + Number(b.qty), 0);
                const expectedQty = Number(item.qtyReceived) - Number(item.qtyDamaged);
                if (Math.abs(totalBatchQty - expectedQty) > 0.01) {
                    alert(`Batch quantities for ${ item.itemName } must equal ${ expectedQty } `);
                    return false;
                }
            }
            // Validate serial count
            if (item.isSerialTracked) {
                const expectedCount = Number(item.qtyReceived) - Number(item.qtyDamaged);
                if (item.serials.length !== expectedCount) {
                    alert(`Serial count for ${ item.itemName } must equal ${ expectedCount } `);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSubmit = async (status: 'draft' | 'submitted') => {
        if (!validateForm()) return;

        setSubmitting(true);
        try {
            const payload = {
                grnType,
                storeId: selectedStore!.id,
                vendorId: grnType === 'VENDOR' ? vendorId : null,
                invoiceNo: invoiceNo || null,
                invoiceDate: invoiceDate || null,
                remarks: remarks || null,
                status,
                items: items.map(item => ({
                    itemId: item.itemId,
                    qtyOrdered: item.qtyOrdered,
                    qtyReceived: item.qtyReceived,
                    qtyDamaged: item.qtyDamaged,
                    qtyMissing: item.qtyMissing
                })),
                batches: items.flatMap(item =>
                    item.batches.map(batch => ({
                        itemId: item.itemId,
                        batchNo: batch.batchNo,
                        qty: batch.qty,
                        expiryDate: batch.expiryDate,
                        mfgDate: batch.mfgDate
                    }))
                ),
                serials: items.flatMap(item =>
                    item.serials.map(serial => ({
                        itemId: item.itemId,
                        serialNo: serial.serialNo
                    }))
                )
            };

            const res = await apiClient<{ grnId: number }>(
                '/inventory/grn',
                {
                    method: 'POST',
                    withAuth: true,
                    body: JSON.stringify(payload)
                }
            );

            alert(status === 'submitted' ? 'GRN submitted successfully!' : 'GRN saved as draft');
            router.push(`${ getBasePath() } /inventory/grn / ${ res.grnId } `);
        } catch (err: any) {
            console.error("Failed to create GRN:", err);
            alert("Failed to create GRN: " + (err.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const getBasePath = () => {
        return window.location.pathname.includes('/org-admin') ? '/org-admin' : '/employee';
    };

    const currentItem = currentItemId ? items.find(i => i.id === currentItemId) : null;

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href={`${ getBasePath() } /inventory/grn`}
                    className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
                >
                    <ArrowLeft size={20} />
                    Back to GRN List
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">Create New GRN</h1>
            </div>

            {/* Form */}
            <div className="space-y-6">
                {/* Header Section */}
                <div className="bg-white border border-slate-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">GRN Details</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                GRN Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={grnType}
                                onChange={(e) => setGrnType(e.target.value as any)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="OPENING">Opening Stock</option>
                                <option value="VENDOR">Vendor Delivery</option>
                                <option value="TRANSFER">Transfer Receive</option>
                                <option value="REPLACEMENT">Replacement</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Store <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={selectedStore?.name || 'No store selected'}
                                disabled
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                            />
                        </div>

                        {grnType === 'VENDOR' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Vendor <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={vendorId || ''}
                                        onChange={(e) => setVendorId(Number(e.target.value))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select Vendor</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.vendor_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                                    <input
                                        type="text"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </>
                        )}

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                            <textarea
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-slate-900">Items</h2>
                        <button
                            onClick={addItem}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Add Item
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">
                            No items added yet. Click "Add Item" to get started.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Item</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Qty Received</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Damaged</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Missing</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Batch/Serial</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {items.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-slate-900">{item.itemName}</div>
                                                <div className="text-xs text-slate-500">{item.itemCode} • {item.uom}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.qtyReceived}
                                                    onChange={(e) => updateItem(item.id, 'qtyReceived', Number(e.target.value))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-right"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.qtyDamaged}
                                                    onChange={(e) => updateItem(item.id, 'qtyDamaged', Number(e.target.value))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-right"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.qtyMissing}
                                                    onChange={(e) => updateItem(item.id, 'qtyMissing', Number(e.target.value))}
                                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-right"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.isBatchTracked && (
                                                    <button
                                                        onClick={() => openBatchModal(item.id)}
                                                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                                    >
                                                        Batch ({item.batches.length})
                                                    </button>
                                                )}
                                                {item.isSerialTracked && (
                                                    <button
                                                        onClick={() => openSerialModal(item.id)}
                                                        className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors ml-2"
                                                    >
                                                        Serial ({item.serials.length})
                                                    </button>
                                                )}
                                                {!item.isBatchTracked && !item.isSerialTracked && '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        onClick={() => handleSubmit('draft')}
                        disabled={submitting}
                        className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save size={16} />
                        Save Draft
                    </button>
                    <button
                        onClick={() => handleSubmit('submitted')}
                        disabled={submitting}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        <Send size={16} />
                        {submitting ? 'Submitting...' : 'Submit GRN'}
                    </button>
                </div>
            </div>

            {/* Modals */}
            {batchModalOpen && currentItem && (
                <BatchEntryModal
                    item={currentItem}
                    batches={currentItem.batches}
                    onSave={saveBatches}
                    onClose={() => {
                        setBatchModalOpen(false);
                        setCurrentItemId(null);
                    }}
                />
            )}

            {serialModalOpen && currentItem && (
                <SerialEntryModal
                    item={currentItem}
                    serials={currentItem.serials}
                    onSave={saveSerials}
                    onClose={() => {
                        setSerialModalOpen(false);
                        setCurrentItemId(null);
                    }}
                />
            )}

            {itemSearchModalOpen && (
                <ItemSearchModal
                    onSelect={selectItem}
                    onClose={() => {
                        setItemSearchModalOpen(false);
                        setCurrentItemId(null);
                    }}
                />
            )}
        </div>
    );
}

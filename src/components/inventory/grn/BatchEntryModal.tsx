"use client";
import React, { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface BatchData {
    batchNo: string;
    qty: number;
    expiryDate: string | null;
    mfgDate: string | null;
}

interface Props {
    item: {
        itemName: string;
        uom: string;
        qtyReceived: number;
        qtyDamaged: number;
    };
    batches: BatchData[];
    onSave: (batches: BatchData[]) => void;
    onClose: () => void;
}

export default function BatchEntryModal({ item, batches, onSave, onClose }: Props) {
    const [localBatches, setLocalBatches] = useState<BatchData[]>([...batches]);
    const [newBatch, setNewBatch] = useState<BatchData>({
        batchNo: "",
        qty: 0,
        expiryDate: null,
        mfgDate: null
    });

    const expectedQty = item.qtyReceived - item.qtyDamaged;
    const totalQty = localBatches.reduce((sum, b) => sum + Number(b.qty), 0);
    const remainingQty = expectedQty - totalQty;

    const addBatch = () => {
        if (!newBatch.batchNo) {
            alert("Please enter batch number");
            return;
        }
        if (newBatch.qty <= 0) {
            alert("Quantity must be greater than 0");
            return;
        }
        if (newBatch.qty > remainingQty) {
            alert(`Quantity cannot exceed remaining ${remainingQty} ${item.uom}`);
            return;
        }

        setLocalBatches([...localBatches, { ...newBatch }]);
        setNewBatch({
            batchNo: "",
            qty: 0,
            expiryDate: null,
            mfgDate: null
        });
    };

    const removeBatch = (index: number) => {
        setLocalBatches(localBatches.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (Math.abs(totalQty - expectedQty) > 0.01) {
            alert(`Total batch quantity (${totalQty}) must equal ${expectedQty} ${item.uom}`);
            return;
        }
        onSave(localBatches);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Batch Entry</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            {item.itemName} - Expected: {expectedQty} {item.uom}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {/* Add New Batch */}
                    <div className="bg-slate-50 p-4 rounded-lg mb-6">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Add New Batch</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Batch No <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newBatch.batchNo}
                                    onChange={(e) => setNewBatch({ ...newBatch, batchNo: e.target.value })}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                    placeholder="BATCH-001"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={newBatch.qty || ''}
                                    onChange={(e) => setNewBatch({ ...newBatch, qty: Number(e.target.value) })}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                    min="0"
                                    step="0.01"
                                    placeholder={`Max: ${remainingQty}`}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">MFG Date</label>
                                <input
                                    type="date"
                                    value={newBatch.mfgDate || ''}
                                    onChange={(e) => setNewBatch({ ...newBatch, mfgDate: e.target.value || null })}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
                                <input
                                    type="date"
                                    value={newBatch.expiryDate || ''}
                                    onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value || null })}
                                    className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                                />
                            </div>
                        </div>
                        <button
                            onClick={addBatch}
                            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                        >
                            <Plus size={16} />
                            Add Batch
                        </button>
                    </div>

                    {/* Batch List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Batches ({localBatches.length})</h3>
                            <div className="text-sm">
                                <span className="text-slate-600">Total: </span>
                                <span className={`font-semibold ${Math.abs(totalQty - expectedQty) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                    {totalQty} / {expectedQty} {item.uom}
                                </span>
                            </div>
                        </div>

                        {localBatches.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No batches added yet
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Batch No</th>
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">Quantity</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">MFG Date</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Expiry Date</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {localBatches.map((batch, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm font-mono">{batch.batchNo}</td>
                                                <td className="px-4 py-2 text-sm text-right">{batch.qty} {item.uom}</td>
                                                <td className="px-4 py-2 text-sm">{batch.mfgDate || '-'}</td>
                                                <td className="px-4 py-2 text-sm">{batch.expiryDate || '-'}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => removeBatch(index)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={14} />
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

                {/* Footer */}
                <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Save Batches
                    </button>
                </div>
            </div>
        </div>
    );
}

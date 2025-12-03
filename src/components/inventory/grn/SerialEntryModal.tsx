"use client";
import React, { useState } from "react";
import { X, Plus, Trash2, Upload } from "lucide-react";

interface SerialData {
    serialNo: string;
}

interface Props {
    item: {
        itemName: string;
        uom: string;
        qtyReceived: number;
        qtyDamaged: number;
    };
    serials: SerialData[];
    onSave: (serials: SerialData[]) => void;
    onClose: () => void;
}

export default function SerialEntryModal({ item, serials, onSave, onClose }: Props) {
    const [localSerials, setLocalSerials] = useState<SerialData[]>([...serials]);
    const [inputMethod, setInputMethod] = useState<'manual' | 'bulk' | 'csv'>('manual');
    const [manualSerial, setManualSerial] = useState("");
    const [bulkText, setBulkText] = useState("");

    const expectedCount = item.qtyReceived - item.qtyDamaged;
    const currentCount = localSerials.length;
    const remainingCount = expectedCount - currentCount;

    const addManualSerial = () => {
        if (!manualSerial.trim()) {
            alert("Please enter a serial number");
            return;
        }
        if (localSerials.some(s => s.serialNo === manualSerial.trim())) {
            alert("Serial number already exists");
            return;
        }
        if (currentCount >= expectedCount) {
            alert(`Cannot add more than ${expectedCount} serials`);
            return;
        }

        setLocalSerials([...localSerials, { serialNo: manualSerial.trim() }]);
        setManualSerial("");
    };

    const addBulkSerials = () => {
        const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) {
            alert("Please enter serial numbers (one per line)");
            return;
        }

        const newSerials: SerialData[] = [];
        const duplicates: string[] = [];
        const existing = new Set(localSerials.map(s => s.serialNo));

        for (const line of lines) {
            if (existing.has(line) || newSerials.some(s => s.serialNo === line)) {
                duplicates.push(line);
            } else {
                newSerials.push({ serialNo: line });
            }
        }

        if (duplicates.length > 0) {
            alert(`Duplicate serial numbers found: ${duplicates.join(', ')}`);
            return;
        }

        if (currentCount + newSerials.length > expectedCount) {
            alert(`Cannot add ${newSerials.length} serials. Only ${remainingCount} remaining.`);
            return;
        }

        setLocalSerials([...localSerials, ...newSerials]);
        setBulkText("");
    };

    const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);

            const newSerials: SerialData[] = [];
            const duplicates: string[] = [];
            const existing = new Set(localSerials.map(s => s.serialNo));

            for (const line of lines) {
                if (existing.has(line) || newSerials.some(s => s.serialNo === line)) {
                    duplicates.push(line);
                } else {
                    newSerials.push({ serialNo: line });
                }
            }

            if (duplicates.length > 0) {
                alert(`Duplicate serial numbers found: ${duplicates.join(', ')}`);
                return;
            }

            if (currentCount + newSerials.length > expectedCount) {
                alert(`Cannot add ${newSerials.length} serials. Only ${remainingCount} remaining.`);
                return;
            }

            setLocalSerials([...localSerials, ...newSerials]);
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    const removeSerial = (index: number) => {
        setLocalSerials(localSerials.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (currentCount !== expectedCount) {
            alert(`Serial count (${currentCount}) must equal ${expectedCount}`);
            return;
        }
        onSave(localSerials);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Serial Entry</h2>
                        <p className="text-sm text-slate-600 mt-1">
                            {item.itemName} - Expected: {expectedCount} serials
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
                    {/* Input Method Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-slate-200">
                        <button
                            onClick={() => setInputMethod('manual')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputMethod === 'manual'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Manual Entry
                        </button>
                        <button
                            onClick={() => setInputMethod('bulk')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputMethod === 'bulk'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            Bulk Paste
                        </button>
                        <button
                            onClick={() => setInputMethod('csv')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inputMethod === 'csv'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                }`}
                        >
                            CSV Upload
                        </button>
                    </div>

                    {/* Input Method Content */}
                    <div className="bg-slate-50 p-4 rounded-lg mb-6">
                        {inputMethod === 'manual' && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Serial Number</h3>
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={manualSerial}
                                        onChange={(e) => setManualSerial(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addManualSerial()}
                                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                        placeholder="Enter serial number"
                                    />
                                    <button
                                        onClick={addManualSerial}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                                    >
                                        <Plus size={16} />
                                        Add
                                    </button>
                                </div>
                            </div>
                        )}

                        {inputMethod === 'bulk' && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Paste Serial Numbers (one per line)</h3>
                                <textarea
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    rows={8}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                                    placeholder="SN-001&#10;SN-002&#10;SN-003"
                                />
                                <button
                                    onClick={addBulkSerials}
                                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Plus size={16} />
                                    Add All
                                </button>
                            </div>
                        )}

                        {inputMethod === 'csv' && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-3">Upload CSV File</h3>
                                <p className="text-xs text-slate-600 mb-3">
                                    Upload a CSV file with one serial number per line
                                </p>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer text-sm">
                                    <Upload size={16} />
                                    Choose File
                                    <input
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleCSVUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Serial List */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-slate-700">Serials ({currentCount})</h3>
                            <div className="text-sm">
                                <span className="text-slate-600">Count: </span>
                                <span className={`font-semibold ${currentCount === expectedCount ? 'text-green-600' : 'text-red-600'}`}>
                                    {currentCount} / {expectedCount}
                                </span>
                            </div>
                        </div>

                        {localSerials.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No serials added yet
                            </div>
                        ) : (
                            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">#</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">Serial Number</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-slate-700">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {localSerials.map((serial, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm text-slate-600">{index + 1}</td>
                                                <td className="px-4 py-2 text-sm font-mono">{serial.serialNo}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => removeSerial(index)}
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
                        Save Serials
                    </button>
                </div>
            </div>
        </div>
    );
}

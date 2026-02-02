"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, FileText, X, RefreshCw, Download } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

const SalarySlipEditorModal = ({
    isOpen,
    onClose,
    initialData,
    employeeId,
    cycleStart,
    cycleEnd
}: {
    isOpen: boolean;
    onClose: () => void;
    initialData: any;
    employeeId: number;
    cycleStart: string;
    cycleEnd: string;
}) => {
    const [earnings, setEarnings] = React.useState<any[]>([]);
    const [deductions, setDeductions] = React.useState<any[]>([]);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        console.log("SalarySlipEditorModal: isOpen=", isOpen, "data=", !!initialData, "mounted=", mounted);
        if (isOpen && initialData) {
            // Parse initial data
            // Ensure we have array
            const breakdown = initialData.salary_breakdown || [];

            const earningItems = breakdown
                .filter((i: any) => i.type === 'credit')
                .map((i: any, idx: number) => ({ id: `e-${idx}`, name: i.name, amount: Number(i.amount || 0) }));

            const deductionItems = breakdown
                .filter((i: any) => i.type === 'debit')
                .map((i: any, idx: number) => ({ id: `d-${idx}`, name: i.name, amount: Number(i.amount || 0) }));

            // Add default empty rows if empty? No, keep as is.
            setEarnings(earningItems);
            setDeductions(deductionItems);
        }
    }, [isOpen, initialData, mounted]);

    const addEarning = () => {
        setEarnings([...earnings, { id: `e-new-${Date.now()}`, name: "New Earning", amount: 0 }]);
    };

    const addDeduction = () => {
        setDeductions([...deductions, { id: `d-new-${Date.now()}`, name: "New Deduction", amount: 0 }]);
    };

    const updateItem = (list: any[], setList: any, id: string, field: string, val: any) => {
        setList(list.map(i => i.id === id ? { ...i, [field]: val } : i));
    };

    const removeItem = (list: any[], setList: any, id: string) => {
        setList(list.filter(i => i.id !== id));
    };

    const totalEarnings = earnings.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalDeductions = deductions.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const netPay = totalEarnings - totalDeductions;

    const handleDownload = async () => {
        try {
            setIsGenerating(true);

            // Reconstruct salary object
            const newSalary = {
                ...initialData.salary,
                creditTotal: totalEarnings,
                debitTotal: totalDeductions,
                earnedGross: totalEarnings,
                net_payment: netPay,
                gross: totalEarnings,
                total_deductions: totalDeductions
            };

            // Reconstruct breakdown array
            const newBreakdown = [
                ...earnings.map(e => ({ name: e.name, amount: Number(e.amount), type: 'credit', full_amount: Number(e.amount) })),
                ...deductions.map(d => ({ name: d.name, amount: Number(d.amount), type: 'debit', full_amount: Number(d.amount) }))
            ];

            const payload = {
                employeeId,
                cycleStart, // Sending raw ISO or formatted? API expects cycleStart for monthYear slicing.
                metrics: initialData.metrics,
                salary: newSalary,
                salary_breakdown: newBreakdown
            };

            const response = await apiClient.post('/attendance/salary-slip/custom', payload, {
                responseType: 'blob' // Important for PDF
            });

            // response IS the Blob (apiClient returns res.blob())
            const blob = response as unknown as Blob;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Salary_Slip_Custom.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            onClose();
        } catch (err: any) {
            console.error("Failed to generate slip", err);
            alert("Failed to generate PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Salary Slip Editor</h2>
                            <p className="text-xs text-gray-500">Modify earnings and deductions before downloading</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Earnings Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-green-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500" /> Earnings
                                </h3>
                                <button
                                    onClick={addEarning}
                                    className="text-xs flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>

                            <div className="space-y-2">
                                {earnings.map(item => (
                                    <div key={item.id} className="flex gap-2 items-center group">
                                        <input
                                            className="flex-1 p-2 border rounded text-sm text-gray-900 focus:outline-none focus:border-green-500"
                                            value={item.name}
                                            onChange={e => updateItem(earnings, setEarnings, item.id, 'name', e.target.value)}
                                        />
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                            <input
                                                type="number"
                                                className="w-full pl-6 p-2 border rounded text-sm text-right text-gray-900 focus:outline-none focus:border-green-500 font-mono"
                                                value={item.amount}
                                                onChange={e => updateItem(earnings, setEarnings, item.id, 'amount', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeItem(earnings, setEarnings, item.id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t mt-4">
                                <span className="text-sm font-medium text-gray-600">Total Earnings</span>
                                <span className="font-bold text-green-700">₹{totalEarnings.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Deductions Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-red-700 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500" /> Deductions
                                </h3>
                                <button
                                    onClick={addDeduction}
                                    className="text-xs flex items-center gap-1 bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100"
                                >
                                    <Plus className="w-3 h-3" /> Add
                                </button>
                            </div>

                            <div className="space-y-2">
                                {deductions.map(item => (
                                    <div key={item.id} className="flex gap-2 items-center group">
                                        <input
                                            className="flex-1 p-2 border rounded text-sm text-gray-900 focus:outline-none focus:border-red-500"
                                            value={item.name}
                                            onChange={e => updateItem(deductions, setDeductions, item.id, 'name', e.target.value)}
                                        />
                                        <div className="relative w-32">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                                            <input
                                                type="number"
                                                className="w-full pl-6 p-2 border rounded text-sm text-right text-gray-900 focus:outline-none focus:border-red-500 font-mono"
                                                value={item.amount}
                                                onChange={e => updateItem(deductions, setDeductions, item.id, 'amount', e.target.value)}
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeItem(deductions, setDeductions, item.id)}
                                            className="p-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t mt-4">
                                <span className="text-sm font-medium text-gray-600">Total Deductions</span>
                                <span className="font-bold text-red-700">₹{totalDeductions.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex justify-between items-center border border-blue-100">
                        <div>
                            <span className="block text-sm text-blue-600 uppercase tracking-wide font-semibold">Net Payable</span>
                            <span className="text-xs text-blue-400">Final amount to be transferred</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-700">
                            ₹{netPay.toFixed(2)}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isGenerating}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all text-sm font-medium disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Download PDF
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SalarySlipEditorModal;

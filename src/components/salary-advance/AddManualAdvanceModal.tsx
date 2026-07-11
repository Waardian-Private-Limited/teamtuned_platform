"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { X, Search, Calendar, Landmark, Check, Loader2 } from "lucide-react";

type Employee = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    department_name?: string;
};

type AddManualAdvanceModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

type EmiRow = {
    amount: number;
    due_date: string;
};

export default function AddManualAdvanceModal({ isOpen, onClose, onSuccess }: AddManualAdvanceModalProps) {
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchingEmployees, setSearchingEmployees] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Form inputs
    const [totalAmount, setTotalAmount] = useState<number | "">("");
    const [amountPaid, setAmountPaid] = useState<number>(0);
    const [repaymentMonths, setRepaymentMonths] = useState<number>(1);
    const [startMonth, setStartMonth] = useState<string>(() => {
        const d = new Date();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return `${d.getFullYear()}-${mm}`;
    });
    const [reason, setReason] = useState("Direct Import");
    const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
    const [deductInCurrentMonth, setDeductInCurrentMonth] = useState(false);

    // Consolidate logic state
    const [outstandingBalance, setOutstandingBalance] = useState(0);
    const [cycleStartDay, setCycleStartDay] = useState(1);
    const [combineOldAdvances, setCombineOldAdvances] = useState(false);
    const [loadingEligibility, setLoadingEligibility] = useState(false);

    // Custom EMIs list
    const [customEmis, setCustomEmis] = useState<EmiRow[]>([]);

    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle clicking outside searchable dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Search employees
    useEffect(() => {
        if (!searchQuery.trim()) {
            setEmployees([]);
            return;
        }
        const timer = setTimeout(() => {
            fetchEmployees();
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchEmployees = async () => {
        setSearchingEmployees(true);
        try {
            const data = await apiClient<Employee[] | { data: Employee[] }>("/organization/employees", {
                withAuth: true,
                params: {
                    format: "paginated",
                    page: 1,
                    limit: 10,
                    search: searchQuery
                }
            });
            const list = Array.isArray(data) ? data : (data.data || []);
            setEmployees(list);
        } catch (error) {
            console.error("Failed to search employees:", error);
        } finally {
            setSearchingEmployees(false);
        }
    };

    // Load eligibility and active advance balance when employee changes
    useEffect(() => {
        if (selectedEmployee) {
            fetchEligibility(selectedEmployee.id);
        } else {
            setOutstandingBalance(0);
            setCycleStartDay(1);
            setCombineOldAdvances(false);
        }
    }, [selectedEmployee]);

    const fetchEligibility = async (empId: number) => {
        setLoadingEligibility(true);
        try {
            const data = await apiClient<any>(`/salary-advance/eligibility`, {
                withAuth: true,
                params: { employee_id: empId }
            });
            setOutstandingBalance(Number(data.wallet?.outstanding_balance || 0));
            setCycleStartDay(Number(data.cycleStartDay || 1));
        } catch (error) {
            console.error("Failed to load eligibility data:", error);
            setOutstandingBalance(0);
            setCycleStartDay(1);
        } finally {
            setLoadingEligibility(false);
        }
    };

    // Recalculate EMIs list when variables change
    const baseLoanAmount = (Number(totalAmount) || 0) + (combineOldAdvances ? outstandingBalance : 0);
    const remainingAmount = Math.max(0, baseLoanAmount - amountPaid);

    useEffect(() => {
        // Pre-populate equal split values or re-dimension custom split array size
        const count = Math.max(1, repaymentMonths);
        const [yearStr, monthStr] = startMonth.split("-");
        let yr = Number(yearStr || new Date().getFullYear());
        let mo = Number(monthStr || new Date().getMonth() + 1); // 0-indexed for next month (T+1)

        const newSchedule: EmiRow[] = [];
        const baseEmi = count > 0 ? Math.floor(remainingAmount / count) : 0;
        const remainder = count > 0 ? remainingAmount - (baseEmi * count) : 0;

        for (let i = 0; i < count; i++) {
            const currentMo = mo + i;
            const tempDate = new Date(yr, currentMo, 1);
            const dueYr = tempDate.getFullYear();
            const dueMo = String(tempDate.getMonth() + 1).padStart(2, "0");
            const dueDay = String(cycleStartDay).padStart(2, "0");
            const dueDate = `${dueYr}-${dueMo}-${dueDay}`;

            const amount = i === count - 1 ? (baseEmi + remainder) : baseEmi;
            newSchedule.push({
                amount: Math.round(amount * 100) / 100,
                due_date: dueDate
            });
        }
        setCustomEmis(newSchedule);
    }, [totalAmount, amountPaid, repaymentMonths, startMonth, cycleStartDay, combineOldAdvances, outstandingBalance]);

    const handleCustomEmiChange = (index: number, field: keyof EmiRow, value: any) => {
        const copy = [...customEmis];
        if (field === "amount") {
            copy[index].amount = Number(value) || 0;
        } else {
            copy[index].due_date = value;
        }
        setCustomEmis(copy);
    };

    const customTotal = customEmis.reduce((s, row) => s + row.amount, 0);
    const customDifference = Math.round((remainingAmount - customTotal) * 100) / 100;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee) {
            showError("Please select an employee");
            return;
        }
        if (!totalAmount || Number(totalAmount) <= 0) {
            showError("Please enter a valid total amount");
            return;
        }

        if (splitType === "custom" && customDifference !== 0) {
            showError(`The sum of custom EMIs does not equal the remaining amount (${remainingAmount}). Difference: ${customDifference}`);
            return;
        }

        setSubmitting(true);
        try {
            const body = {
                employee_id: selectedEmployee.id,
                total_amount: Number(totalAmount),
                amount_paid: amountPaid,
                repayment_months: repaymentMonths,
                start_month: startMonth,
                reason,
                deduct_in_current_month: deductInCurrentMonth,
                combine_old_advances: combineOldAdvances,
                emi_schedule: splitType === "custom" ? customEmis.map(e => ({
                    amount: e.amount,
                    due_date: e.due_date
                })) : []
            };

            await apiClient("/salary-advance/manual-advance", {
                method: "POST",
                withAuth: true,
                body
            });

            showSuccess("Advance request imported successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            showError(error.message || "Failed to import manual advance");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Direct Entry / Import Advance</h2>
                        <p className="text-xs text-gray-500 mt-1">This request skips approvals and registers directly as approved</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors p-1.5 hover:bg-gray-50 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Search Employee */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Employee *</label>
                        {selectedEmployee ? (
                            <div className="flex items-center justify-between p-3 border border-indigo-200 bg-indigo-50/30 rounded-lg">
                                <div>
                                    <div className="font-semibold text-gray-900">
                                        {selectedEmployee.first_name} {selectedEmployee.last_name}
                                    </div>
                                    <div className="text-xs text-gray-500">{selectedEmployee.email}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedEmployee(null)}
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline"
                                >
                                    Change
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Type name or email to search..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setDropdownOpen(true);
                                        }}
                                        onFocus={() => setDropdownOpen(true)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                    {searchingEmployees && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                {dropdownOpen && (
                                    <div className="absolute z-10 w-full mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-50">
                                        {employees.length === 0 ? (
                                            <div className="p-3 text-center text-sm text-gray-500">
                                                {searchQuery.trim() ? "No employees found" : "Type to begin searching..."}
                                            </div>
                                        ) : (
                                            employees.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEmployee(emp);
                                                        setDropdownOpen(false);
                                                        setSearchQuery("");
                                                    }}
                                                    className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex flex-col"
                                                >
                                                    <span className="font-medium text-gray-900">
                                                        {emp.first_name} {emp.last_name}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{emp.email}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Eligibility Warning / Combine Toggle */}
                    {loadingEligibility && (
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            Checking employee eligibility & balances...
                        </div>
                    )}

                    {!loadingEligibility && selectedEmployee && outstandingBalance > 0 && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                            <div className="flex items-start gap-2">
                                <Landmark className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-amber-900 text-sm">Active Advance Outstanding</h4>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        This employee has an existing unpaid balance of <span className="font-bold">₹{outstandingBalance.toLocaleString()}</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4 pl-7">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="outstanding_mode"
                                        checked={!combineOldAdvances}
                                        onChange={() => setCombineOldAdvances(false)}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-medium text-gray-700">Keep Separate</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="outstanding_mode"
                                        checked={combineOldAdvances}
                                        onChange={() => setCombineOldAdvances(true)}
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-medium text-gray-700">Combine (Roll over ₹{outstandingBalance.toLocaleString()})</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Numeric Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹) *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                placeholder="e.g. 20000"
                                value={totalAmount}
                                onChange={(e) => setTotalAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (Already Repaid) (₹)</label>
                            <input
                                type="number"
                                min="0"
                                max={Number(totalAmount) || 0}
                                placeholder="e.g. 5000"
                                value={amountPaid || ""}
                                onChange={(e) => setAmountPaid(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Month *</label>
                            <input
                                type="month"
                                required
                                value={startMonth}
                                onChange={(e) => setStartMonth(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Repayment Months *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="60"
                                value={repaymentMonths}
                                onChange={(e) => setRepaymentMonths(Math.max(1, Number(e.target.value)))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    {/* Summary Info */}
                    {totalAmount && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col md:flex-row md:justify-between text-sm gap-2">
                            <div>
                                <span className="text-gray-500">Base Amount:</span>{" "}
                                <span className="font-semibold text-gray-900">₹{Number(totalAmount).toLocaleString()}</span>
                            </div>
                            {combineOldAdvances && (
                                <div>
                                    <span className="text-gray-500">Consolidated Balance:</span>{" "}
                                    <span className="font-semibold text-gray-900">+ ₹{outstandingBalance.toLocaleString()}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-gray-500">Amount Paid:</span>{" "}
                                <span className="font-semibold text-green-700">- ₹{amountPaid.toLocaleString()}</span>
                            </div>
                            <div className="border-t md:border-t-0 md:border-l border-gray-200 pt-2 md:pt-0 md:pl-4">
                                <span className="font-medium text-gray-700">Remaining Balance:</span>{" "}
                                <span className="font-bold text-indigo-700">₹{remainingAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Repayment Month Split selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Split Type</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setSplitType("equal")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    splitType === "equal"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                Equal Monthly Split
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitType("custom")}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    splitType === "custom"
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                Custom Split
                            </button>
                        </div>
                    </div>

                    {/* Split details preview / fields */}
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <div className="bg-gray-50/70 px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-700 uppercase tracking-wider flex justify-between">
                            <span>Repayment Installments</span>
                            {splitType === "custom" && (
                                <span className={customDifference === 0 ? "text-green-700" : "text-amber-700"}>
                                    Sum: ₹{customTotal.toLocaleString()} (Diff: {customDifference > 0 ? `+₹${customDifference}` : customDifference < 0 ? `-₹${Math.abs(customDifference)}` : "Balanced"})
                                </span>
                            )}
                        </div>

                        <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                            {customEmis.map((row, index) => (
                                <div key={index} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <span className="font-medium text-gray-800">Installment {index + 1}</span>
                                    </div>

                                    <div className="flex flex-1 sm:justify-end gap-3">
                                        {/* Date */}
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-gray-50/50 text-gray-600">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {splitType === "equal" ? (
                                                row.due_date
                                            ) : (
                                                <input
                                                    type="date"
                                                    value={row.due_date}
                                                    onChange={(e) => handleCustomEmiChange(index, "due_date", e.target.value)}
                                                    className="border-0 bg-transparent p-0 text-xs focus:ring-0 w-28 text-gray-700"
                                                />
                                            )}
                                        </div>

                                        {/* Amount */}
                                        <div className="w-32">
                                            {splitType === "equal" ? (
                                                <div className="px-3 py-1.5 text-right font-semibold text-gray-900 bg-gray-50 border border-transparent rounded-lg">
                                                    ₹{row.amount.toLocaleString()}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                                                    <input
                                                        type="number"
                                                        value={row.amount || ""}
                                                        onChange={(e) => handleCustomEmiChange(index, "amount", e.target.value)}
                                                        className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Notes</label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Why are you importing this manual advance record..."
                        />
                    </div>

                    {/* Current Month Deduction Toggle */}
                    <label className="flex items-start gap-3 p-3 border border-gray-100 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={deductInCurrentMonth}
                            onChange={(e) => setDeductInCurrentMonth(e.target.checked)}
                            className="w-4.5 h-4.5 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5"
                        />
                        <div>
                            <span className="text-sm font-semibold text-gray-900">Deduct from current month's salary</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                If enabled, the first EMI installment due date will align with the current payroll cycle deduction start day.
                            </p>
                        </div>
                    </label>
                </form>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            "Create & Approve"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

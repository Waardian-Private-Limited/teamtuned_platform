"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { X, DollarSign, AlertCircle } from "lucide-react";

type Eligibility = {
    eligible: boolean;
    eligibleAmount: number;
    earnedAmount: number;
    monthlySalary: number;
    daysWorked: number;
    totalWorkingDays: number;
    maxPercentage: number;
    requestsUsed: number;
    maxRequests: number;
    policy?: {
        min_request_amount: number;
        max_request_amount: number;
    };
};

type Props = {
    eligibility: Eligibility;
    onClose: () => void;
    onSuccess: () => void;
};

export default function RequestAdvanceModal({ eligibility, onClose, onSuccess }: Props) {
    const [amount, setAmount] = useState<number>(0);
    const [reason, setReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (amount <= 0) {
            showError("Please enter a valid amount");
            return;
        }

        if (amount > eligibility.eligibleAmount) {
            showError(`Amount cannot exceed eligible amount of ₹${eligibility.eligibleAmount.toLocaleString()}`);
            return;
        }

        if (eligibility.policy?.min_request_amount && amount < eligibility.policy.min_request_amount) {
            showError(`Minimum request amount is ₹${eligibility.policy.min_request_amount.toLocaleString()}`);
            return;
        }

        if (eligibility.policy?.max_request_amount && amount > eligibility.policy.max_request_amount) {
            showError(`Maximum request amount is ₹${eligibility.policy.max_request_amount.toLocaleString()}`);
            return;
        }

        setSubmitting(true);
        try {
            await apiClient("/salary-advance/requests", {
                method: "POST",
                withAuth: true,
                body: { amount, reason },
            });

            showSuccess("Salary advance request submitted successfully");
            onSuccess();
        } catch (error: any) {
            showError(error.message || "Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (value: number) => {
        return `₹${Number(value || 0).toLocaleString('en-IN')}`;
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAmount(Number(e.target.value));
    };

    const percentage = eligibility.eligibleAmount > 0
        ? Math.round((amount / eligibility.eligibleAmount) * 100)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Request Salary Advance</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded-md hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Eligibility Summary */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-5 h-5 text-green-600" />
                            <span className="font-semibold text-green-900">Eligible Amount</span>
                        </div>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(eligibility.eligibleAmount)}</div>
                        <div className="text-sm text-green-700 mt-1">
                            Based on {eligibility.daysWorked} days worked out of {eligibility.totalWorkingDays} days
                        </div>
                    </div>

                    {/* Amount Slider */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Select Amount
                        </label>
                        <div className="space-y-3">
                            <input
                                type="range"
                                min="0"
                                max={eligibility.eligibleAmount}
                                step="100"
                                value={amount}
                                onChange={handleSliderChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">₹0</span>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(amount)}</div>
                                    <div className="text-sm text-gray-600">{percentage}% of eligible amount</div>
                                </div>
                                <span className="text-sm text-gray-600">{formatCurrency(eligibility.eligibleAmount)}</span>
                            </div>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="grid grid-cols-4 gap-2 mt-3">
                            {[25, 50, 75, 100].map((percent) => {
                                const quickAmount = Math.floor((eligibility.eligibleAmount * percent) / 100);
                                return (
                                    <button
                                        key={percent}
                                        type="button"
                                        onClick={() => setAmount(quickAmount)}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        {percent}%
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            placeholder="Enter reason for advance request..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>

                    {/* Policy Info */}
                    {(eligibility.policy?.min_request_amount || eligibility.policy?.max_request_amount) && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
                                    <div className="font-semibold mb-1">Policy Limits:</div>
                                    {eligibility.policy.min_request_amount && (
                                        <div>Minimum: {formatCurrency(eligibility.policy.min_request_amount)}</div>
                                    )}
                                    {eligibility.policy.max_request_amount && (
                                        <div>Maximum: {formatCurrency(eligibility.policy.max_request_amount)}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || amount <= 0}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {submitting ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

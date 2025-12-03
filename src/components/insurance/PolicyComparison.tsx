"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showError } from "@/lib/toast";
import { X, Check, Minus, Shield, DollarSign, Calendar, Users } from "lucide-react";

export default function PolicyComparison() {
    const [policies, setPolicies] = useState<any[]>([]);
    const [selectedPolicies, setSelectedPolicies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            setLoading(true);
            const data = await apiClient<any[]>("/insurance/policies", { method: "GET", withAuth: true });
            setPolicies(data || []);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch policies");
        } finally {
            setLoading(false);
        }
    };

    const togglePolicy = (policy: any) => {
        if (selectedPolicies.find((p) => p.id === policy.id)) {
            setSelectedPolicies(selectedPolicies.filter((p) => p.id !== policy.id));
        } else if (selectedPolicies.length < 3) {
            setSelectedPolicies([...selectedPolicies, policy]);
        } else {
            showError("You can compare up to 3 policies at a time");
        }
    };

    const getComparisonRows = () => {
        return [
            { label: "Policy Name", key: "policy_name" },
            { label: "Provider", key: "provider_name" },
            { label: "Type", key: "type" },
            { label: "Coverage Amount", key: "coverage_amount", format: (val: any) => `₹${Number(val).toLocaleString()}` },
            { label: "Premium Amount", key: "premium_amount", format: (val: any) => `₹${Number(val).toLocaleString()}` },
            { label: "Employer Contribution", key: "employer_percent", format: (val: any) => `${val}%` },
            { label: "Employee Contribution", key: "employee_percent", format: (val: any) => `${val}%` },
            { label: "Waiting Period", key: "waiting_period_days", format: (val: any) => `${val} days` },
            { label: "Room Rent Limit", key: "room_rent_limit", format: (val: any) => val ? `₹${Number(val).toLocaleString()}/day` : "No limit" },
            { label: "Co-pay", key: "copay_percentage", format: (val: any) => `${val}%` },
            { label: "Maternity Coverage", key: "maternity_coverage", format: (val: any) => val ? "✓ Yes" : "✗ No", highlight: true },
            { label: "Pre-existing Coverage", key: "pre_existing_coverage", format: (val: any) => val ? "✓ Yes" : "✗ No", highlight: true },
        ];
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Policy Comparison</h1>

            {/* Policy Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Select Policies to Compare (up to 3)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {policies.map((policy) => {
                        const isSelected = selectedPolicies.find((p) => p.id === policy.id);
                        return (
                            <button
                                key={policy.id}
                                onClick={() => togglePolicy(policy)}
                                className={`p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                        ? "border-indigo-500 bg-indigo-50"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-semibold text-gray-900">{policy.policy_name}</h3>
                                    {isSelected && <Check className="text-indigo-600" size={20} />}
                                </div>
                                <p className="text-sm text-gray-600">{policy.provider_name}</p>
                                <p className="text-sm text-gray-500 mt-2 capitalize">{policy.type}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Comparison Table */}
            {selectedPolicies.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Comparing {selectedPolicies.length} {selectedPolicies.length === 1 ? "Policy" : "Policies"}
                        </h2>
                        <button
                            onClick={() => setSelectedPolicies([])}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                                        Feature
                                    </th>
                                    {selectedPolicies.map((policy) => (
                                        <th key={policy.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                                            {policy.policy_name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {getComparisonRows().map((row, index) => {
                                    const values = selectedPolicies.map((p) => p[row.key]);
                                    const allSame = values.every((v) => v === values[0]);

                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                                                {row.label}
                                            </td>
                                            {selectedPolicies.map((policy) => {
                                                const value = policy[row.key];
                                                const formatted = row.format ? row.format(value) : value;
                                                const isDifferent = !allSame && row.highlight;

                                                return (
                                                    <td
                                                        key={policy.id}
                                                        className={`px-4 py-3 text-sm text-center ${isDifferent
                                                                ? value
                                                                    ? "bg-green-50 text-green-700 font-semibold"
                                                                    : "bg-red-50 text-red-700"
                                                                : "text-gray-900"
                                                            }`}
                                                    >
                                                        {formatted}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Benefits Comparison */}
                    <div className="p-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Benefits Comparison</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {selectedPolicies.map((policy) => {
                                let benefits = [];
                                try {
                                    benefits = policy.benefits ? JSON.parse(policy.benefits) : [];
                                } catch (e) {
                                    benefits = [];
                                }

                                return (
                                    <div key={policy.id} className="border border-gray-200 rounded-lg p-4">
                                        <h4 className="font-semibold text-gray-900 mb-3">{policy.policy_name}</h4>
                                        {benefits.length === 0 ? (
                                            <p className="text-sm text-gray-500">No benefits listed</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {benefits.map((benefit: any, idx: number) => (
                                                    <li key={idx} className="flex items-start gap-2 text-sm">
                                                        <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                                                        <span className="text-gray-700">{benefit.title}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { Shield, CheckCircle, History, Download, AlertCircle } from "lucide-react";

export default function EmployeeInsurancePage() {
    const [activeInsurance, setActiveInsurance] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInsurance();
    }, []);

    const fetchInsurance = async () => {
        try {
            // Fetch current user's insurance enrollment
            const data = await apiClient<any>(`/insurance/enrollment/my-enrollment`, { method: "GET", withAuth: true });
            setActiveInsurance(data?.active || []);
            setHistory(data?.history || []);
        } catch (error) {
            console.error("Failed to fetch insurance:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Loading insurance details...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Insurance</h1>
                <p className="text-gray-500">View your active policies and coverage history.</p>
            </div>

            {/* Active Policies */}
            <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Shield className="text-indigo-600" size={20} /> Active Coverage
                </h2>

                {activeInsurance.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                            <AlertCircle className="text-gray-400" size={24} />
                        </div>
                        <h3 className="text-gray-900 font-medium">No Active Insurance</h3>
                        <p className="text-gray-500 mt-1">You are not currently enrolled in any insurance plans.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeInsurance.map((ins) => (
                            <div key={ins.id} className="bg-white border border-green-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="bg-green-50/50 px-6 py-4 border-b border-green-100 flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{ins.policy_name}</h3>
                                        <p className="text-green-700 text-sm font-medium flex items-center gap-1 mt-1">
                                            <CheckCircle size={14} /> Active Policy
                                        </p>
                                    </div>
                                    <span className="bg-white text-gray-600 text-xs px-2 py-1 rounded border border-gray-200 font-medium uppercase tracking-wide">
                                        {ins.type}
                                    </span>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-medium">Provider</p>
                                            <p className="text-gray-900 font-medium">{ins.provider_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-medium">Coverage</p>
                                            <p className="text-gray-900 font-medium">{Number(ins.coverage_amount).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-medium">Valid From</p>
                                            <p className="text-gray-900">{new Date(ins.start_date).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-medium">Valid Until</p>
                                            <p className="text-gray-900">{new Date(ins.end_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-medium">Your Premium</p>
                                                <p className="text-gray-900 font-bold">{Number(ins.premium_employee).toLocaleString()} <span className="text-xs font-normal text-gray-500">/ month</span></p>
                                            </div>
                                            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                                                <Download size={16} /> Policy Doc
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* History */}
            {history.length > 0 && (
                <section>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <History className="text-gray-500" size={20} /> Coverage History
                    </h2>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3">Policy</th>
                                        <th className="px-6 py-3">Period</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Premium</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {history.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {item.policy_name} <span className="text-xs text-gray-400 ml-1">(v{item.version_number})</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {new Date(item.start_date).toLocaleDateString()} — {new Date(item.end_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.status === 'expired' ? 'bg-orange-100 text-orange-700' :
                                                    item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{Number(item.premium_employee).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}

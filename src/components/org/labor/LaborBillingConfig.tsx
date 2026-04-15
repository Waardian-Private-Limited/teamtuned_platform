"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { DollarSign, Save, Loader2, Info, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";


export default function LaborBillingConfig() {
    const { permissions, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        labor_yearly_rate: 0,
        labor_base_fees: 0,
        labor_per_day_fees: 0
    });

    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasLaborAdmin = (permissions || []).some((p: any) => (p || "").toUpperCase() === "LABOR_ADMIN");
    const isReadOnly = hasLaborAdmin && !isOrgAdmin;


    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/labor/billing/config");
            if (res.success) {
                setConfig(res.config);
            }
        } catch (error) {
            console.error("Error fetching billing config:", error);
            toast.error("Failed to load billing configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const res = await apiClient.put("/labor/billing/config", config);
            if (res.success) {
                toast.success("Billing configuration saved successfully");
            }
        } catch (error) {
            console.error("Error saving billing config:", error);
            toast.error("Failed to save billing configuration");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="text-blue-600" /> Labor Billing Configuration
                </h1>
                <p className="text-gray-500 text-sm">Configure yearly rates and base fees for labor attendance billing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Info Card */}
                <div className="md:col-span-1 bg-blue-50 border border-blue-100 rounded-lg p-6 h-fit">
                    <h3 className="text-blue-800 font-semibold flex items-center gap-2 mb-4">
                        <Info size={18} /> How it works
                    </h3>
                    <ul className="space-y-3 text-sm text-blue-700">
                        <li>• <strong>Base Fees:</strong> Deducted once during labor registration.</li>
                        <li>• <strong>Daily Fee:</strong> A fixed amount charged for every day the labor marks attendance.</li>
                        <li>• <strong>Subscriptions:</strong> Base fees grant an active subscription for 1 year.</li>
                        <li>• <strong>Renewals:</strong> If a labor punches with an expired subscription, base fees are charged again to renew for 1 year.</li>
                    </ul>
                </div>

                {/* Form Card */}
                <div className="md:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    <form onSubmit={handleSave} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Base Fees (Ammount charged for 1-year subscription)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={config.labor_base_fees}
                                        onChange={(e) => setConfig({ ...config, labor_base_fees: parseFloat(e.target.value) || 0 })}
                                        disabled={isReadOnly}
                                        className="block w-full pl-7 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                    />

                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Per Day Fee (Direct amount charged for daily attendance)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 sm:text-sm">₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={config.labor_per_day_fees}
                                        onChange={(e) => setConfig({ ...config, labor_per_day_fees: parseFloat(e.target.value) || 0 })}
                                        disabled={isReadOnly}
                                        className="block w-full pl-7 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                                        placeholder="0.00"
                                        step="0.01"
                                        min="0"
                                    />

                                </div>
                                <p className="mt-2 text-xs text-gray-500 italic">
                                    This amount will be deducted from the labor wallet for each day they punch in.
                                </p>
                            </div>

                            {config.labor_yearly_rate > 0 && (
                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-600">
                                        <strong>Note:</strong> A Yearly Rate of ₹{config.labor_yearly_rate} is also configured. 
                                        The Per Day Fee takes precedence. If Per Day Fee is 0, the monthly-calculated rate will be used.
                                    </p>
                                </div>
                            )}
                        </div>

                        {!isReadOnly && (
                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> Save Configuration
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {isReadOnly && (
                            <div className="pt-4">
                                <div className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-500 font-semibold py-3 px-6 rounded-lg border border-gray-200">
                                    <Lock size={18} /> View Only Mode
                                </div>
                            </div>
                        )}

                    </form>
                </div>
            </div>
        </div>
    );
}

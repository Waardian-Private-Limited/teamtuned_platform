"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";
import { 
    Building2, 
    MapPin, 
    FileText, 
    CreditCard, 
    Smartphone, 
    Save, 
    Loader2 
} from "lucide-react";

export default function SuperadminBillingProfile() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [details, setDetails] = useState({
        name: "",
        address: "",
        gst_number: "",
        bank_name: "",
        account_name: "",
        account_number: "",
        ifsc_code: "",
        upi_id: ""
    });

    useEffect(() => {
        fetchBillingDetails();
    }, []);

    const fetchBillingDetails = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get("/superadmin/platform/billing");
            if (res.success && res.details) {
                setDetails({
                    name: res.details.name || "",
                    address: res.details.address || "",
                    gst_number: res.details.gst_number || "",
                    bank_name: res.details.bank_name || "",
                    account_name: res.details.account_name || "",
                    account_number: res.details.account_number || "",
                    ifsc_code: res.details.ifsc_code || "",
                    upi_id: res.details.upi_id || ""
                });
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch billing details");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            const res = await apiClient.put("/superadmin/platform/billing", details);
            if (res.success) {
                toast.success("Billing profile updated successfully");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Platform Billing Profile</h1>
                <p className="text-gray-500 font-medium mt-1">Manage TeamTuned's official billing and payment details.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Company Information */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <Building2 size={18} className="text-blue-600" /> Company Identity
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company Name</label>
                            <input 
                                type="text"
                                value={details.name}
                                onChange={(e) => setDetails({ ...details, name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="e.g. Wardian Private Limited"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Registered Address</label>
                            <textarea 
                                value={details.address}
                                rows={3}
                                onChange={(e) => setDetails({ ...details, address: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="Full corporate address..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">GST Number</label>
                            <input 
                                type="text"
                                value={details.gst_number}
                                onChange={(e) => setDetails({ ...details, gst_number: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                placeholder="27XXXXX..."
                            />
                        </div>
                    </div>
                </div>

                {/* Bank & Payment Details */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
                        <CreditCard size={18} className="text-blue-600" /> Payment & Bank Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Account Holder Name (A/C Name)</label>
                            <input 
                                type="text"
                                value={details.account_name}
                                onChange={(e) => setDetails({ ...details, account_name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="e.g. Wardian Private Limited / Kasim Pathan"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Bank Name</label>
                            <input 
                                type="text"
                                value={details.bank_name}
                                onChange={(e) => setDetails({ ...details, bank_name: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                placeholder="e.g. HDFC Bank"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Account Number</label>
                            <input 
                                type="text"
                                value={details.account_number}
                                onChange={(e) => setDetails({ ...details, account_number: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                placeholder="000123456789"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">IFSC Code</label>
                            <input 
                                type="text"
                                value={details.ifsc_code}
                                onChange={(e) => setDetails({ ...details, ifsc_code: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                placeholder="HDFC0001234"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">UPI ID</label>
                            <input 
                                type="text"
                                value={details.upi_id}
                                onChange={(e) => setDetails({ ...details, upi_id: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                                placeholder="teamtuned@okaxis"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl shadow-xl shadow-gray-200 transition-all font-bold text-sm uppercase tracking-widest disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Billing Profile
                    </button>
                </div>
            </form>
        </div>
    );
}

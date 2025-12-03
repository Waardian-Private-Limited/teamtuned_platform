"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Plus, X, Trash2, UserCheck, AlertCircle } from "lucide-react";

interface Beneficiary {
    id?: number;
    name: string;
    relationship?: string;
    percentage: number;
    contact_number?: string;
    address?: string;
}

export default function BeneficiaryManagement({ enrollment, onUpdate }: { enrollment: any; onUpdate: () => void }) {
    const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showBeneficiaries, setShowBeneficiaries] = useState(false);

    React.useEffect(() => {
        if (showBeneficiaries) {
            fetchBeneficiaries();
        }
    }, [showBeneficiaries]);

    const fetchBeneficiaries = async () => {
        try {
            setLoading(true);
            const data = await apiClient<Beneficiary[]>(`/insurance/enrollments/${enrollment.id}/beneficiaries`, {
                method: "GET",
                withAuth: true,
            });
            setBeneficiaries(data || []);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch beneficiaries");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (beneficiaryId: number) => {
        if (!confirm("Are you sure you want to remove this beneficiary?")) return;

        try {
            await apiClient(`/insurance/beneficiaries/${beneficiaryId}`, { method: "DELETE", withAuth: true });
            showSuccess("Beneficiary removed successfully");
            fetchBeneficiaries();
            onUpdate();
        } catch (error: any) {
            showError(error?.message || "Failed to remove beneficiary");
        }
    };

    const totalPercentage = beneficiaries.reduce((sum, b) => sum + b.percentage, 0);
    const isComplete = totalPercentage === 100;

    if (!showBeneficiaries) {
        return (
            <button
                onClick={() => setShowBeneficiaries(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
            >
                <UserCheck size={16} />
                Manage Beneficiaries
            </button>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Beneficiaries / Nominees</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        disabled={totalPercentage >= 100}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus size={16} />
                        Add Beneficiary
                    </button>
                    <button
                        onClick={() => setShowBeneficiaries(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Total Percentage Indicator */}
            <div className={`p-4 rounded-lg border ${isComplete ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
                <div className="flex items-center gap-3">
                    {isComplete ? (
                        <UserCheck className="text-green-600" size={24} />
                    ) : (
                        <AlertCircle className="text-orange-600" size={24} />
                    )}
                    <div className="flex-1">
                        <div className="font-semibold text-gray-900">Total Allocation: {totalPercentage}%</div>
                        {!isComplete && (
                            <div className="text-sm text-gray-600">
                                Remaining: {100 - totalPercentage}% (Total must equal 100%)
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : beneficiaries.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <UserCheck className="mx-auto mb-3 text-gray-400" size={48} />
                    <p className="text-gray-500 mb-4">No beneficiaries added yet</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <Plus size={16} />
                        Add First Beneficiary
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {beneficiaries.map((beneficiary) => (
                        <div key={beneficiary.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h4 className="font-semibold text-gray-900">{beneficiary.name}</h4>
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                            {beneficiary.percentage}%
                                        </span>
                                    </div>
                                    {beneficiary.relationship && (
                                        <p className="text-sm text-gray-600 mb-2">{beneficiary.relationship}</p>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        {beneficiary.contact_number && (
                                            <div>
                                                <span className="text-gray-500">Contact: </span>
                                                <span className="font-medium text-gray-900">{beneficiary.contact_number}</span>
                                            </div>
                                        )}
                                        {beneficiary.address && (
                                            <div>
                                                <span className="text-gray-500">Address: </span>
                                                <span className="font-medium text-gray-900">{beneficiary.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(beneficiary.id!)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAddModalOpen && (
                <AddBeneficiaryModal
                    enrollmentId={enrollment.id}
                    remainingPercentage={100 - totalPercentage}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchBeneficiaries();
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
}

function AddBeneficiaryModal({
    enrollmentId,
    remainingPercentage,
    onClose,
    onSuccess,
}: {
    enrollmentId: number;
    remainingPercentage: number;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState<Beneficiary>({
        name: "",
        relationship: "",
        percentage: remainingPercentage,
        contact_number: "",
        address: "",
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.percentage > remainingPercentage) {
            showError(`Percentage cannot exceed ${remainingPercentage}%`);
            return;
        }

        setSaving(true);
        try {
            await apiClient(`/insurance/enrollments/${enrollmentId}/beneficiaries`, {
                method: "POST",
                body: formData,
                withAuth: true,
            });
            showSuccess("Beneficiary added successfully");
            onSuccess();
        } catch (error: any) {
            showError(error?.message || "Failed to add beneficiary");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Add Beneficiary</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            <strong>Available:</strong> {remainingPercentage}% remaining to allocate
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Full name of beneficiary"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                            <input
                                type="text"
                                value={formData.relationship}
                                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g. Spouse, Parent, Child"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Percentage * (Max: {remainingPercentage}%)</label>
                            <input
                                required
                                type="number"
                                min="1"
                                max={remainingPercentage}
                                value={formData.percentage}
                                onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                        <input
                            type="tel"
                            value={formData.contact_number}
                            onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="+91 XXXXX XXXXX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={2}
                            placeholder="Full address"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Adding..." : "Add Beneficiary"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

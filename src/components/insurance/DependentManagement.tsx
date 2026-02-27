"use client";

import React, { useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Plus, X, Trash2, UserPlus, Users } from "lucide-react";

interface Dependent {
    id?: number;
    relationship: string;
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    id_proof_type?: string;
    id_proof_number?: string;
}

export default function DependentManagement({ enrollment, onUpdate }: { enrollment: any; onUpdate: () => void }) {
    const [dependents, setDependents] = useState<Dependent[]>([]);
    const [loading, setLoading] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showDependents, setShowDependents] = useState(false);

    React.useEffect(() => {
        if (showDependents) {
            fetchDependents();
        }
    }, [showDependents]);

    const fetchDependents = async () => {
        try {
            setLoading(true);
            const data = await apiClient<Dependent[]>(`/insurance/enrollments/${enrollment.id}/dependents`, {
                method: "GET",
                withAuth: true,
            });
            setDependents(data || []);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch dependents");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (dependentId: number) => {
        if (!confirm("Are you sure you want to remove this dependent?")) return;

        try {
            await apiClient(`/insurance/dependents/${dependentId}`, { method: "DELETE", withAuth: true });
            showSuccess("Dependent removed successfully");
            fetchDependents();
            onUpdate();
        } catch (error: any) {
            showError(error?.message || "Failed to remove dependent");
        }
    };

    const getRelationshipIcon = (relationship: string) => {
        switch (relationship.toLowerCase()) {
            case "spouse":
                return "❤️";
            case "child":
                return "👶";
            case "parent":
                return "👴";
            case "sibling":
                return "👫";
            default:
                return "👤";
        }
    };

    const calculateAge = (dob: string) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    if (!showDependents) {
        return (
            <button
                onClick={() => setShowDependents(true)}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors border border-indigo-200 font-semibold"
            >
                <Users className="w-4 h-4" />
                <span>Manage Dependents ({enrollment.total_members - 1})</span>
            </button>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Dependents</h3>
                        <p className="text-sm text-gray-600 mt-0.5">{dependents.length} dependent{dependents.length !== 1 ? 's' : ''} enrolled</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center space-x-1 text-sm font-bold shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Dependent</span>
                        </button>
                        <button
                            onClick={() => setShowDependents(false)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors text-sm font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Dependents List */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {[...Array(3)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="h-5 bg-gray-200 rounded w-20"></div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="h-6 bg-gray-200 rounded w-6"></div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : dependents.length === 0 ? (
                    <div className="text-center py-12">
                        <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-gray-900 mb-1">No dependents added yet</h3>
                        <p className="text-xs text-gray-500 mb-4">Add dependents to include them in your insurance coverage</p>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-sm mx-auto font-bold shadow-sm"
                        >
                            <Plus className="w-3 h-3" />
                            <span>Add First Dependent</span>
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependent</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Proof</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {dependents.map((dependent) => (
                                    <tr key={dependent.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center space-x-3">
                                                <span className="text-2xl">{getRelationshipIcon(dependent.relationship)}</span>
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">
                                                        {dependent.first_name} {dependent.last_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 capitalize border border-indigo-100 uppercase tracking-wider">
                                                {dependent.relationship}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">
                                                {dependent.date_of_birth ? `${calculateAge(dependent.date_of_birth)} years` : '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900 capitalize">
                                                {dependent.gender || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">
                                                {dependent.id_proof_type || '-'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleDelete(dependent.id!)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Remove dependent"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isAddModalOpen && (
                <AddDependentModal
                    enrollmentId={enrollment.id}
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={() => {
                        setIsAddModalOpen(false);
                        fetchDependents();
                        onUpdate();
                    }}
                />
            )}
        </div>
    );
}

function AddDependentModal({ enrollmentId, onClose, onSuccess }: { enrollmentId: number; onClose: () => void; onSuccess: () => void }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<Dependent>({
        relationship: "spouse",
        first_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "",
        id_proof_type: "",
        id_proof_number: "",
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            if (!formData.first_name || !formData.last_name || !formData.relationship) {
                showError("Please fill in all required fields");
                return;
            }
            setStep(2);
            return;
        }

        setSaving(true);
        try {
            await apiClient(`/insurance/enrollments/${enrollmentId}/dependents`, {
                method: "POST",
                body: formData,
                withAuth: true,
            });
            showSuccess("Dependent added successfully");
            onSuccess();
        } catch (error: any) {
            showError(error?.message || "Failed to add dependent");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-200">
                <div className="p-6 border-b border-gray-200 bg-gray-50/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <UserPlus size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Add Dependent</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className={`h-1 w-8 rounded-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                    <div className={`h-1 w-8 rounded-full ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest ml-1">Step {step} of 2</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1">
                    {step === 1 ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-1.5">
                                <label className="text-sm font-semibold text-gray-700">Relationship *</label>
                                <select
                                    required
                                    value={formData.relationship}
                                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                >
                                    <option value="spouse">Spouse</option>
                                    <option value="child">Child</option>
                                    <option value="parent">Parent</option>
                                    <option value="sibling">Sibling</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">First Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. John"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Last Name *</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Doe"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                <p className="text-xs text-indigo-600 font-medium">Please provide the legal name of your dependent as per their official identification documents.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Date of Birth</label>
                                    <input
                                        type="date"
                                        value={formData.date_of_birth}
                                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                        max={new Date().toISOString().split("T")[0]}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">ID Proof Type</label>
                                    <input
                                        type="text"
                                        value={formData.id_proof_type}
                                        onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                        placeholder="e.g. Aadhar, Passport"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700">ID Proof Number</label>
                                    <input
                                        type="text"
                                        value={formData.id_proof_number}
                                        onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-sm"
                                        placeholder="Enter ID number"
                                    />
                                </div>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <p className="text-xs text-amber-700 font-medium italic">Verification details are optional but recommended for faster claim processing.</p>
                            </div>
                        </div>
                    )}
                </form>

                <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50/30">
                    <button
                        type="button"
                        onClick={step === 1 ? onClose : () => setStep(1)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm shadow-sm"
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={saving}
                        className={`px-6 py-2 rounded-xl transition-all font-bold text-sm shadow-lg flex items-center gap-2 ${saving
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed shadow-none'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                            }`}
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Adding...</span>
                            </>
                        ) : (
                            <span>{step === 1 ? "Next Step" : "Save Dependent"}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

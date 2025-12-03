"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Plus, Search, Eye, X, FileText, Calendar, DollarSign, Building2, AlertCircle, Users } from "lucide-react";

export default function ClaimManagement() {
    const [claims, setClaims] = useState<any[]>([]);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
    const [viewClaim, setViewClaim] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch all claims - backend will filter based on user role
            const [claimsData, enrollmentsData] = await Promise.all([
                apiClient<any[]>("/insurance/claims", { method: "GET", withAuth: true }),
                apiClient<any>("/insurance/enrollment/employees", { method: "GET", withAuth: true }),
            ]);

            setClaims(claimsData || []);

            // Check if user is admin based on response
            const isAdminUser = enrollmentsData?.employees && Array.isArray(enrollmentsData.employees);
            setIsAdmin(isAdminUser);

            if (isAdminUser) {
                // Admin view - get all employees and their enrollments
                setEmployees(enrollmentsData.employees || []);
                const allEnrollments: any[] = [];
                enrollmentsData.employees.forEach((emp: any) => {
                    if (emp.enrollments) {
                        emp.enrollments.forEach((enrollment: any) => {
                            if (enrollment.status === 'active') {
                                allEnrollments.push({
                                    ...enrollment,
                                    employee_name: `${emp.first_name} ${emp.last_name}`,
                                    employee_id: emp.id,
                                });
                            }
                        });
                    }
                });
                setEnrollments(allEnrollments);
            } else {
                // Employee view - just get their enrollments
                const activeEnrollments: any[] = [];
                if (enrollmentsData?.employees) {
                    enrollmentsData.employees.forEach((emp: any) => {
                        if (emp.enrollments) {
                            activeEnrollments.push(...emp.enrollments.filter((e: any) => e.status === 'active'));
                        }
                    });
                }
                setEnrollments(activeEnrollments);
            }
        } catch (error: any) {
            showError(error?.message || "Failed to fetch claims");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "submitted":
                return "bg-blue-50 text-blue-700 border-blue-200";
            case "under_review":
                return "bg-orange-50 text-orange-700 border-orange-200";
            case "approved":
                return "bg-green-50 text-green-700 border-green-200";
            case "rejected":
                return "bg-red-50 text-red-700 border-red-200";
            case "settled":
                return "bg-purple-50 text-purple-700 border-purple-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    const filteredClaims = claims.filter((claim) => {
        const matchesSearch =
            claim.claim_number?.toLowerCase().includes(search.toLowerCase()) ||
            claim.hospital_name?.toLowerCase().includes(search.toLowerCase()) ||
            claim.diagnosis?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Claim Management</h1>
                <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    disabled={enrollments.length === 0}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={20} />
                    Submit Claim
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search claims..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="all">All Status</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="settled">Settled</option>
                </select>
            </div>

            {/* Claims List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : filteredClaims.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {claims.length === 0 ? "No claims submitted yet" : "No claims match your filters"}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredClaims.map((claim) => (
                            <div key={claim.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-gray-900">{claim.claim_number || "Pending"}</h3>
                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                                                {claim.status.replace("_", " ").toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 capitalize">{claim.claim_type.replace("_", " ")}</p>
                                    </div>
                                    <button
                                        onClick={() => setViewClaim(claim)}
                                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <div className="text-gray-500 mb-1">Claim Amount</div>
                                        <div className="font-semibold text-gray-900">₹{Number(claim.claim_amount).toLocaleString()}</div>
                                    </div>
                                    {claim.approved_amount > 0 && (
                                        <div>
                                            <div className="text-gray-500 mb-1">Approved Amount</div>
                                            <div className="font-semibold text-green-600">₹{Number(claim.approved_amount).toLocaleString()}</div>
                                        </div>
                                    )}
                                    <div>
                                        <div className="text-gray-500 mb-1">Claim Date</div>
                                        <div className="font-medium text-gray-900">{new Date(claim.claim_date).toLocaleDateString()}</div>
                                    </div>
                                    {claim.hospital_name && (
                                        <div>
                                            <div className="text-gray-500 mb-1">Hospital</div>
                                            <div className="font-medium text-gray-900 truncate">{claim.hospital_name}</div>
                                        </div>
                                    )}
                                </div>

                                {claim.remarks && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs font-medium text-gray-500 mb-1">Remarks:</div>
                                        <div className="text-sm text-gray-700">{claim.remarks}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit Claim Modal */}
            {isSubmitModalOpen && (
                <SubmitClaimModal
                    enrollments={enrollments}
                    employees={employees}
                    isAdmin={isAdmin}
                    onClose={() => setIsSubmitModalOpen(false)}
                    onSuccess={() => {
                        setIsSubmitModalOpen(false);
                        fetchData();
                    }}
                />
            )}

            {/* View Claim Modal */}
            {viewClaim && (
                <ViewClaimModal
                    claim={viewClaim}
                    onClose={() => setViewClaim(null)}
                    isAdmin={isAdmin}
                    onUpdate={() => {
                        fetchData();
                        setViewClaim(null);
                    }}
                />
            )}
        </div>
    );
}

function SubmitClaimModal({ enrollments, onClose, onSuccess, isAdmin, employees }: { enrollments: any[]; onClose: () => void; onSuccess: () => void; isAdmin?: boolean; employees?: any[] }) {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(employees?.[0]?.id || "");
    const [formData, setFormData] = useState({
        enrollment_id: enrollments[0]?.id || "",
        claim_type: "hospitalization",
        claim_amount: "",
        claim_date: new Date().toISOString().split("T")[0],
        hospital_name: "",
        diagnosis: "",
        treatment_details: "",
    });
    const [submitting, setSubmitting] = useState(false);

    // Filter enrollments based on selected employee (for admin)
    const availableEnrollments = isAdmin && selectedEmployeeId
        ? enrollments.filter(e => e.employee_id?.toString() === selectedEmployeeId)
        : enrollments;

    // Update enrollment when employee changes
    useEffect(() => {
        if (isAdmin && availableEnrollments.length > 0) {
            setFormData(prev => ({ ...prev, enrollment_id: availableEnrollments[0]?.id || "" }));
        } else if (isAdmin && availableEnrollments.length === 0) {
            setFormData(prev => ({ ...prev, enrollment_id: "" }));
        }
    }, [selectedEmployeeId, isAdmin, availableEnrollments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await apiClient("/insurance/claims", { method: "POST", body: formData, withAuth: true });
            showSuccess("Claim submitted successfully");
            onSuccess();
        } catch (error: any) {
            showError(error?.message || "Failed to submit claim");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Submit Insurance Claim</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {isAdmin && employees && employees.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Users size={16} className="inline mr-1" />
                                Employee *
                            </label>
                            <select
                                required
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.first_name} {emp.last_name} - {emp.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Policy *</label>
                        <select
                            required
                            value={formData.enrollment_id}
                            onChange={(e) => setFormData({ ...formData, enrollment_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            disabled={availableEnrollments.length === 0}
                        >
                            {availableEnrollments.length === 0 ? (
                                <option value="">No active policies for this employee</option>
                            ) : (
                                availableEnrollments.map((enrollment) => (
                                    <option key={enrollment.id} value={enrollment.id}>
                                        {enrollment.policy_name} - {enrollment.provider_name}
                                        {isAdmin && enrollment.employee_name && ` (${enrollment.employee_name})`}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Type *</label>
                            <select
                                required
                                value={formData.claim_type}
                                onChange={(e) => setFormData({ ...formData, claim_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="hospitalization">Hospitalization</option>
                                <option value="outpatient">Outpatient</option>
                                <option value="maternity">Maternity</option>
                                <option value="dental">Dental</option>
                                <option value="optical">Optical</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Amount *</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.claim_amount}
                                onChange={(e) => setFormData({ ...formData, claim_amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="₹"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Claim Date *</label>
                            <input
                                required
                                type="date"
                                value={formData.claim_date}
                                onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
                                max={new Date().toISOString().split("T")[0]}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hospital/Clinic Name</label>
                            <input
                                type="text"
                                value={formData.hospital_name}
                                onChange={(e) => setFormData({ ...formData, hospital_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                        <textarea
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={2}
                            placeholder="Brief diagnosis"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Details</label>
                        <textarea
                            value={formData.treatment_details}
                            onChange={(e) => setFormData({ ...formData, treatment_details: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            rows={3}
                            placeholder="Describe the treatment received"
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
                            disabled={submitting}
                            className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {submitting ? "Submitting..." : "Submit Claim"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ViewClaimModal({ claim, onClose, isAdmin, onUpdate }: { claim: any; onClose: () => void; isAdmin?: boolean; onUpdate?: () => void }) {
    const [updating, setUpdating] = useState(false);
    const [remarks, setRemarks] = useState(claim.remarks || "");
    const [approvedAmount, setApprovedAmount] = useState(claim.approved_amount || claim.claim_amount);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "submitted":
                return "bg-blue-50 text-blue-700 border-blue-200";
            case "under_review":
                return "bg-orange-50 text-orange-700 border-orange-200";
            case "approved":
                return "bg-green-50 text-green-700 border-green-200";
            case "rejected":
                return "bg-red-50 text-red-700 border-red-200";
            case "settled":
                return "bg-purple-50 text-purple-700 border-purple-200";
            default:
                return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    const handleStatusUpdate = async (status: string) => {
        if (!confirm(`Are you sure you want to ${status} this claim?`)) return;

        setUpdating(true);
        try {
            await apiClient(`/insurance/claims/${claim.id}/review`, {
                method: "POST",
                body: { status, approved_amount: approvedAmount, remarks },
                withAuth: true
            });
            showSuccess(`Claim ${status} successfully`);
            onUpdate?.();
            onClose();
        } catch (error: any) {
            showError(error?.message || "Failed to update claim");
        } finally {
            setUpdating(false);
        }
    };

    const documents = typeof claim.documents === 'string' ? JSON.parse(claim.documents) : claim.documents;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Claim Details</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{claim.claim_number || "Pending"}</h3>
                            <p className="text-sm text-gray-600 capitalize">{claim.claim_type.replace("_", " ")}</p>
                        </div>
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.status)}`}>
                            {claim.status.replace("_", " ").toUpperCase()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Claim Amount</div>
                            <div className="text-2xl font-bold text-gray-900">₹{Number(claim.claim_amount).toLocaleString()}</div>
                        </div>
                        {claim.approved_amount > 0 && (
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Approved Amount</div>
                                <div className="text-2xl font-bold text-green-600">₹{Number(claim.approved_amount).toLocaleString()}</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500 mb-1">Claim Date</div>
                            <div className="font-medium text-gray-900">{new Date(claim.claim_date).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <div className="text-gray-500 mb-1">Submitted On</div>
                            <div className="font-medium text-gray-900">{new Date(claim.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>

                    {claim.hospital_name && (
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Hospital/Clinic</div>
                            <div className="font-medium text-gray-900">{claim.hospital_name}</div>
                        </div>
                    )}

                    {claim.diagnosis && (
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Diagnosis</div>
                            <div className="text-gray-900">{claim.diagnosis}</div>
                        </div>
                    )}

                    {claim.treatment_details && (
                        <div>
                            <div className="text-sm text-gray-500 mb-1">Treatment Details</div>
                            <div className="text-gray-900">{claim.treatment_details}</div>
                        </div>
                    )}

                    {/* Documents Section */}
                    {documents && documents.length > 0 && (
                        <div>
                            <div className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <FileText size={16} />
                                Attached Documents
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {documents.map((doc: any, idx: number) => (
                                    <a
                                        key={idx}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="p-2 bg-indigo-50 rounded text-indigo-600 group-hover:bg-indigo-100">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                                            <p className="text-xs text-gray-500">{doc.type}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                        <div className="border-t border-gray-200 pt-6 mt-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-4">Admin Review</h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved Amount</label>
                                    <input
                                        type="number"
                                        value={approvedAmount}
                                        onChange={(e) => setApprovedAmount(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        rows={3}
                                        placeholder="Add remarks for approval/rejection..."
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleStatusUpdate('approved')}
                                        disabled={updating}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate('rejected')}
                                        disabled={updating}
                                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleStatusUpdate('under_review')}
                                        disabled={updating}
                                        className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        Under Review
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isAdmin && claim.remarks && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-700 mb-2">Remarks from Reviewer:</div>
                            <div className="text-gray-900">{claim.remarks}</div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

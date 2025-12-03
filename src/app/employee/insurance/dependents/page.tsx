"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showError } from "@/lib/toast";
import DependentManagement from "@/components/insurance/DependentManagement";

interface Enrollment {
    id: number;
    policy_name: string;
    provider_name: string;
    type: string;
    certificate_number?: string;
    start_date: string;
    end_date?: string;
    status: string;
    total_members: number;
    has_dependents: boolean;
}

export default function EmployeeDependentsPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const data = await apiClient<{ active: Enrollment[] }>("/insurance/enrollment/my", {
                method: "GET",
                withAuth: true,
            });
            setEnrollments(data.active || []);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch enrollments");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Manage Dependents</h1>
                <p className="text-sm text-gray-600 mt-1">
                    Add and manage family members covered under your insurance policies
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : enrollments.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Insurance Policies</h3>
                    <p className="text-gray-600">
                        You don't have any active insurance enrollments. Please contact HR for enrollment.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {enrollments.map((enrollment) => (
                        <div key={enrollment.id} className="bg-white rounded-lg border border-gray-200 p-6">
                            <div className="mb-4 pb-4 border-b border-gray-200">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">{enrollment.policy_name}</h2>
                                        <p className="text-sm text-gray-600 mt-1">{enrollment.provider_name}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${enrollment.status === 'active'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                        {enrollment.status.charAt(0).toUpperCase() + enrollment.status.slice(1)}
                                    </span>
                                </div>
                                {enrollment.certificate_number && (
                                    <p className="text-sm text-gray-500 mt-2">
                                        Certificate: {enrollment.certificate_number}
                                    </p>
                                )}
                            </div>

                            <DependentManagement
                                enrollment={enrollment}
                                onUpdate={fetchEnrollments}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

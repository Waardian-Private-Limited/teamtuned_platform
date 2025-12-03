"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showError } from "@/lib/toast";
import { Users, Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminBeneficiaryManagement() {
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const hydrationCacheRef = useRef<Map<number, any[]>>(new Map());

    useEffect(() => {
        fetchEmployeesWithBeneficiaries();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchEmployeesWithBeneficiaries = async () => {
        try {
            setLoading(true);
            const data = await apiClient<any>("/insurance/enrollment/employees", {
                method: "GET",
                withAuth: true,
            });

            const baseEmployees = Array.isArray(data?.employees) ? data.employees : [];

            const hydrated = await Promise.all(
                baseEmployees.map(async (emp: any) => {
                    const cached = hydrationCacheRef.current.get(emp.id);
                    if (cached) {
                        return { ...emp, activeEnrollments: cached };
                    }
                    try {
                        const ins = await apiClient<any>(`/insurance/enrollment/employee/${emp.id}`, { method: "GET", withAuth: true });
                        const active = Array.isArray(ins?.active) ? ins.active : [];
                        hydrationCacheRef.current.set(emp.id, active);
                        return { ...emp, activeEnrollments: active };
                    } catch (_) {
                        hydrationCacheRef.current.set(emp.id, []);
                        return { ...emp, activeEnrollments: [] };
                    }
                })
            );

            setEmployees(hydrated);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch employee data");
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = employees.filter((emp) =>
        `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Beneficiary Management</h1>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {employees.length === 0 ? "No employees with insurance found" : "No employees match your search"}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Active Policies
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Beneficiaries Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredEmployees.map((emp) => {
                                    const activeEnrollments = Array.isArray(emp.activeEnrollments) ? emp.activeEnrollments : [];

                                    return (
                                        <tr key={emp.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 flex-shrink-0 bg-indigo-100 rounded-full flex items-center justify-center">
                                                        <Users size={20} className="text-indigo-600" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {emp.first_name} {emp.last_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{emp.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{activeEnrollments.length}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                                    View to check
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => router.push(`/org-admin/insurance/beneficiaries/${emp.id}`)}
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                >
                                                    Manage Beneficiaries
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Employees manage their own beneficiaries through the mobile app.
                    This view is for administrative oversight only. Beneficiaries receive the sum assured in case of policyholder's Accident.
                </p>
            </div>
        </div>
    );
}

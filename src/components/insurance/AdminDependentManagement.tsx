"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { showError } from "@/lib/toast";
import { Users, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDependentManagement() {
    const router = useRouter();
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const limit = 10;

    const hydrationCacheRef = useRef<Map<number, { activeEnrollments: any[]; totalDependents: number }>>(new Map());

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchEmployeesWithDependents();
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, search]);

    const fetchEmployeesWithDependents = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: search
            });

            const data = await apiClient<any>(`/insurance/enrollment/employees?${queryParams.toString()}` , {
                method: "GET",
                withAuth: true,
            });

            const baseEmployees = Array.isArray(data?.employees) ? data.employees : [];

            const hydrated = await Promise.all(
                baseEmployees.map(async (emp: any) => {
                    const cached = hydrationCacheRef.current.get(emp.id);
                    if (cached) {
                        return { ...emp, activeEnrollments: cached.activeEnrollments, totalDependents: cached.totalDependents };
                    }
                    try {
                        const ins = await apiClient<any>(`/insurance/enrollment/employee/${emp.id}`, { method: "GET", withAuth: true });
                        const active = Array.isArray(ins?.active) ? ins.active : [];
                        const totalDependents = active.reduce((sum: number, e: any) => {
                            const members = Number(e?.total_members ?? 1);
                            return sum + Math.max(0, members - 1);
                        }, 0);
                        hydrationCacheRef.current.set(emp.id, { activeEnrollments: active, totalDependents });
                        return { ...emp, activeEnrollments: active, totalDependents };
                    } catch (_) {
                        hydrationCacheRef.current.set(emp.id, { activeEnrollments: [], totalDependents: 0 });
                        return { ...emp, activeEnrollments: [], totalDependents: 0 };
                    }
                })
            );

            setEmployees(hydrated);
            setTotalPages(data?.pagination?.totalPages || 1);
            setTotalEmployees(data?.pagination?.total || 0);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch employee data");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Dependent Management</h1>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search employees..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1); // Reset to first page on search
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">Loading...</div>
                ) : employees.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        {search ? "No employees match your search" : "No employees found"}
                    </div>
                ) : (
                    <>
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
                                            Total Dependents
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {employees.map((emp) => {
                                        const activeEnrollments = Array.isArray(emp.activeEnrollments) ? emp.activeEnrollments : [];
                                        const totalDependents = Number(emp.totalDependents || 0);

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
                                                    <div className="text-sm text-gray-900">{totalDependents}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button
                                                        onClick={() => router.push(`/org-admin/insurance/dependents/${emp.id}`)}
                                                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                    >
                                                        Manage Dependents
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalEmployees)} of {totalEmployees} entries
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className={`p-2 rounded-md ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="text-sm font-medium text-gray-700">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className={`p-2 rounded-md ${page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Employees manage their own dependents through the mobile app.
                    This view is for administrative oversight only.
                </p>
            </div>

            {/* Navigation replaces the previous modal */}
        </div>
    );
}

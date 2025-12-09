"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { Eye, Filter, RefreshCw, CheckCircle, XCircle, Clock, Search, Building, Shield } from "lucide-react";
import RequestDetails from "./RequestDetails";
import Pagination from "./Pagination";
import TableSkeleton from "./TableSkeleton";

type Request = {
    id: number;
    employee_id: number;
    first_name: string;
    last_name: string;
    email: string;
    employee_code: string;
    department_name?: string;
    requested_amount: number;
    eligible_amount_at_request: number;
    approved_amount: number | null;
    status: string;
    reason: string | null;
    created_at: string;
    updated_at: string;
};

type Department = {
    id: number;
    name: string;
};

export default function AdvanceRequests() {
    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [departments, setDepartments] = useState<Department[]>([]);

    // Permission state
    const [userRole, setUserRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [checkingPerms, setCheckingPerms] = useState(true);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const itemsPerPage = 20;

    useEffect(() => {
        (async () => {
            try {
                const session = await apiClient<any>("/auth/session", { method: "GET" });
                if (session?.authenticated) {
                    setUserRole(session.role);
                    setPermissions(session.employee?.permissions || []);
                }
            } catch (_) { } finally {
                setCheckingPerms(false);
            }
        })();
    }, []);

    const isOrgAdmin = (userRole || "").toLowerCase() === "orgadmin";
    const canView = isOrgAdmin || permissions.includes("SALADV_VIEW");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 on search change
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        if (!checkingPerms && canView) {
            fetchDepartments();
        }
    }, [checkingPerms, canView]);

    useEffect(() => {
        if (!checkingPerms && canView) {
            fetchRequests();
        }
    }, [currentPage, statusFilter, departmentFilter, debouncedSearch, checkingPerms, canView]);

    const fetchDepartments = async () => {
        try {
            const res = await apiClient<Department[] | { departments: Department[] }>("/organization/departments", { withAuth: true });
            if (Array.isArray(res)) {
                setDepartments(res);
            } else {
                setDepartments(res.departments || []);
            }
        } catch (error) {
            console.error("Failed to fetch departments:", error);
        }
    };

    const fetchRequests = async () => {
        if (!canView) return;
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit: itemsPerPage
            };

            if (statusFilter) params.status = statusFilter;
            if (departmentFilter) params.department = departmentFilter;
            if (debouncedSearch) params.search = debouncedSearch;

            const data = await apiClient<{
                requests: Request[];
                total: number;
                page: number;
                totalPages: number
            }>(
                "/salary-advance/requests/hierarchy",
                { withAuth: true, params }
            );

            setRequests(data.requests || []);
            setTotalItems(data.total || 0);
            setTotalPages(data.totalPages || 1);
        } catch (error) {
            console.error("Failed to fetch requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
            pending: { color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock, label: "Pending" },
            in_review: { color: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock, label: "In Review" },
            approved: { color: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle, label: "Approved" },
            rejected: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle, label: "Rejected" },
            paid: { color: "bg-purple-50 text-purple-700 border-purple-200", icon: CheckCircle, label: "Paid" },
            cancelled: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: XCircle, label: "Cancelled" },
        };

        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
                <Icon size={12} />
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (checkingPerms) return <div className="p-8 text-center text-gray-500">Checking access...</div>;

    if (!canView) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center text-gray-500">
                <Shield size={48} className="mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                <p className="mt-2">You do not have permission to view salary advance requests.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50 p-4 lg:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Requests</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage salary advance requests from your team</p>
                </div>
                <button
                    onClick={fetchRequests}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    {/* Department Filter */}
                    <div className="w-full md:w-48">
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={departmentFilter}
                                onChange={(e) => {
                                    setDepartmentFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                            >
                                <option value="">All Departments</option>
                                {departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Filter className="w-3 h-3 text-gray-400" />
                            </div>
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="w-full md:w-48">
                        <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
                            >
                                <option value="">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_review">In Review</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                <Filter className="w-3 h-3 text-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={10} columns={6} />
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No requests found</h3>
                        <p className="text-gray-500 mt-1">Try adjusting your filters or search query</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-xs">
                                                        {request.first_name[0]}{request.last_name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {request.first_name} {request.last_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{request.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                                                    {request.department_name || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {formatDate(request.created_at)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(request.requested_amount)}
                                                </div>
                                                {request.approved_amount && (
                                                    <div className="text-xs text-green-600">
                                                        Approved: {formatCurrency(request.approved_amount)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(request.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => setSelectedRequest(request)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                        />
                    </>
                )}
            </div>

            {/* Request Details Modal */}
            {selectedRequest && (
                <RequestDetails
                    requestId={selectedRequest.id}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    );
}

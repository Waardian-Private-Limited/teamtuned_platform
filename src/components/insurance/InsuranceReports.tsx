"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import { showSuccess, showError } from "@/lib/toast";
import { Download, FileText, Calendar, DollarSign, Users, TrendingUp, Filter } from "lucide-react";

export default function InsuranceReports() {
    const [reportType, setReportType] = useState("enrollment");
    const [filters, setFilters] = useState({
        status: "all",
        policy_id: "",
        start_date: "",
        end_date: "",
    });
    const [policies, setPolicies] = useState<any[]>([]);
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPolicies();
    }, []);

    const fetchPolicies = async () => {
        try {
            const data = await apiClient<any[]>("/insurance/policies", { method: "GET", withAuth: true });
            setPolicies(data || []);
        } catch (error: any) {
            showError(error?.message || "Failed to fetch policies");
        }
    };

    const generateReport = async () => {
        setLoading(true);
        try {
            let data;
            switch (reportType) {
                case "enrollment":
                    data = await fetchEnrollmentReport();
                    break;
                case "claims":
                    data = await fetchClaimsReport();
                    break;
                case "premium":
                    data = await fetchPremiumReport();
                    break;
                default:
                    data = null;
            }
            setReportData(data);
        } catch (error: any) {
            showError(error?.message || "Failed to generate report");
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrollmentReport = async () => {
        const params = new URLSearchParams();
        if (filters.status !== "all") params.append("status", filters.status);
        if (filters.policy_id) params.append("policy_id", filters.policy_id);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);

        const enrollments = await apiClient<any>(`/insurance/enrollments/export?${params.toString()}`, {
            method: "GET",
            withAuth: true,
        });

        return {
            type: "enrollment",
            data: enrollments.enrollments || [],
            summary: {
                total: enrollments.enrollments?.length || 0,
                active: enrollments.enrollments?.filter((e: any) => e.status === "active").length || 0,
                totalDependents: enrollments.enrollments?.reduce((sum: number, e: any) => sum + (e.total_members - 1), 0) || 0,
                totalPremium: enrollments.enrollments?.reduce((sum: number, e: any) => sum + Number(e.premium_employee) + Number(e.premium_company), 0) || 0,
            },
        };
    };

    const fetchClaimsReport = async () => {
        const claims = await apiClient<any[]>("/insurance/claims", { method: "GET", withAuth: true });
        const stats = await apiClient<any>("/insurance/claims/stats", { method: "GET", withAuth: true });

        return {
            type: "claims",
            data: claims || [],
            summary: {
                total: claims?.length || 0,
                submitted: claims?.filter((c: any) => c.status === "submitted").length || 0,
                approved: claims?.filter((c: any) => c.status === "approved").length || 0,
                rejected: claims?.filter((c: any) => c.status === "rejected").length || 0,
                totalClaimed: claims?.reduce((sum: number, c: any) => sum + Number(c.claim_amount), 0) || 0,
                totalApproved: claims?.reduce((sum: number, c: any) => sum + Number(c.approved_amount), 0) || 0,
                approvalRate: stats?.approval_rate || 0,
            },
        };
    };

    const fetchPremiumReport = async () => {
        const params = new URLSearchParams();
        if (filters.policy_id) params.append("policy_id", filters.policy_id);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);

        const enrollments = await apiClient<any>(`/insurance/enrollments/export?${params.toString()}`, {
            method: "GET",
            withAuth: true,
        });

        const data = enrollments.enrollments || [];
        const totalEmployeePremium = data.reduce((sum: number, e: any) => sum + Number(e.premium_employee), 0);
        const totalCompanyPremium = data.reduce((sum: number, e: any) => sum + Number(e.premium_company), 0);

        return {
            type: "premium",
            data,
            summary: {
                totalEmployees: data.length,
                totalEmployeePremium,
                totalCompanyPremium,
                totalPremium: totalEmployeePremium + totalCompanyPremium,
                avgEmployeePremium: data.length > 0 ? totalEmployeePremium / data.length : 0,
                avgCompanyPremium: data.length > 0 ? totalCompanyPremium / data.length : 0,
            },
        };
    };

    const exportToCSV = () => {
        if (!reportData || !reportData.data) {
            showError("No data to export");
            return;
        }

        let headers: string[] = [];
        let rows: any[] = [];

        switch (reportData.type) {
            case "enrollment":
                headers = ["Certificate No", "Employee Name", "Email", "Policy", "Provider", "Start Date", "End Date", "Status", "Premium (Employee)", "Premium (Company)", "Sum Insured", "Dependents"];
                rows = reportData.data.map((e: any) => [
                    e.certificate_number,
                    e.employee_name,
                    e.email,
                    e.policy_name,
                    e.provider_name,
                    e.start_date,
                    e.end_date,
                    e.status,
                    e.premium_employee,
                    e.premium_company,
                    e.sum_insured,
                    e.total_members - 1,
                ]);
                break;
            case "claims":
                headers = ["Claim Number", "Employee", "Policy", "Type", "Amount", "Approved Amount", "Status", "Claim Date", "Hospital"];
                rows = reportData.data.map((c: any) => [
                    c.claim_number,
                    c.employee_name || "N/A",
                    c.policy_name || "N/A",
                    c.claim_type,
                    c.claim_amount,
                    c.approved_amount,
                    c.status,
                    c.claim_date,
                    c.hospital_name || "N/A",
                ]);
                break;
            case "premium":
                headers = ["Employee Name", "Policy", "Employee Premium", "Company Premium", "Total Premium"];
                rows = reportData.data.map((e: any) => [
                    e.employee_name,
                    e.policy_name,
                    e.premium_employee,
                    e.premium_company,
                    Number(e.premium_employee) + Number(e.premium_company),
                ]);
                break;
        }

        const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `insurance_${reportData.type}_report_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showSuccess("Report exported successfully");
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Insurance Reports</h1>

            {/* Report Type Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setReportType("enrollment")}
                        className={`p-4 rounded-lg border-2 transition-all ${reportType === "enrollment"
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        <Users className={`mb-2 ${reportType === "enrollment" ? "text-indigo-600" : "text-gray-400"}`} size={24} />
                        <h3 className="font-semibold text-gray-900">Enrollment Report</h3>
                        <p className="text-sm text-gray-600 mt-1">Employee enrollments with dependents</p>
                    </button>

                    <button
                        onClick={() => setReportType("claims")}
                        className={`p-4 rounded-lg border-2 transition-all ${reportType === "claims"
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        <FileText className={`mb-2 ${reportType === "claims" ? "text-indigo-600" : "text-gray-400"}`} size={24} />
                        <h3 className="font-semibold text-gray-900">Claims Report</h3>
                        <p className="text-sm text-gray-600 mt-1">Claim submissions and approvals</p>
                    </button>

                    <button
                        onClick={() => setReportType("premium")}
                        className={`p-4 rounded-lg border-2 transition-all ${reportType === "premium"
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                    >
                        <DollarSign className={`mb-2 ${reportType === "premium" ? "text-indigo-600" : "text-gray-400"}`} size={24} />
                        <h3 className="font-semibold text-gray-900">Premium Report</h3>
                        <p className="text-sm text-gray-600 mt-1">Premium collection and breakdown</p>
                    </button>
                </div>
            </div>

            {/* Filters */}
            {reportType !== "claims" && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Filter size={20} />
                        Filters
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {reportType === "enrollment" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="expired">Expired</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Policy</label>
                            <select
                                value={filters.policy_id}
                                onChange={(e) => setFilters({ ...filters, policy_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Policies</option>
                                {policies.map((policy) => (
                                    <option key={policy.id} value={policy.id}>
                                        {policy.policy_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={generateReport}
                            disabled={loading}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Generating..." : "Generate Report"}
                        </button>
                    </div>
                </div>
            )}

            {reportType === "claims" && (
                <div className="flex justify-end">
                    <button
                        onClick={generateReport}
                        disabled={loading}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Generating..." : "Generate Report"}
                    </button>
                </div>
            )}

            {/* Report Summary */}
            {reportData && (
                <>
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">Report Summary</h2>
                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Download size={18} />
                                Export to CSV
                            </button>
                        </div>

                        {reportData.type === "enrollment" && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-600 mb-1">Total Enrollments</p>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.summary.total}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-green-600 mb-1">Active</p>
                                    <p className="text-2xl font-bold text-green-900">{reportData.summary.active}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-purple-600 mb-1">Total Dependents</p>
                                    <p className="text-2xl font-bold text-purple-900">{reportData.summary.totalDependents}</p>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg">
                                    <p className="text-sm text-orange-600 mb-1">Total Premium</p>
                                    <p className="text-2xl font-bold text-orange-900">₹{reportData.summary.totalPremium.toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {reportData.type === "claims" && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-600 mb-1">Total Claims</p>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.summary.total}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-green-600 mb-1">Approved</p>
                                    <p className="text-2xl font-bold text-green-900">{reportData.summary.approved}</p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg">
                                    <p className="text-sm text-red-600 mb-1">Rejected</p>
                                    <p className="text-2xl font-bold text-red-900">{reportData.summary.rejected}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-purple-600 mb-1">Approval Rate</p>
                                    <p className="text-2xl font-bold text-purple-900">{reportData.summary.approvalRate}%</p>
                                </div>
                            </div>
                        )}

                        {reportData.type === "premium" && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm text-blue-600 mb-1">Total Employees</p>
                                    <p className="text-2xl font-bold text-blue-900">{reportData.summary.totalEmployees}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <p className="text-sm text-green-600 mb-1">Employee Premium</p>
                                    <p className="text-2xl font-bold text-green-900">₹{reportData.summary.totalEmployeePremium.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg">
                                    <p className="text-sm text-purple-600 mb-1">Company Premium</p>
                                    <p className="text-2xl font-bold text-purple-900">₹{reportData.summary.totalCompanyPremium.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-lg">
                                    <p className="text-sm text-orange-600 mb-1">Total Premium</p>
                                    <p className="text-2xl font-bold text-orange-900">₹{reportData.summary.totalPremium.toLocaleString()}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Data Table Preview */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="font-semibold text-gray-900">Data Preview ({reportData.data.length} records)</h3>
                        </div>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        {reportData.type === "enrollment" && (
                                            <>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dependents</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Premium</th>
                                            </>
                                        )}
                                        {reportData.type === "claims" && (
                                            <>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim No</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            </>
                                        )}
                                        {reportData.type === "premium" && (
                                            <>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Premium</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Premium</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reportData.data.slice(0, 50).map((row: any, index: number) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            {reportData.type === "enrollment" && (
                                                <>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{row.employee_name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{row.policy_name}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                                            }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{row.total_members - 1}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">₹{(Number(row.premium_employee) + Number(row.premium_company)).toLocaleString()}</td>
                                                </>
                                            )}
                                            {reportData.type === "claims" && (
                                                <>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{row.claim_number}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{row.claim_type.replace("_", " ")}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">₹{Number(row.claim_amount).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-green-600">₹{Number(row.approved_amount).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${row.status === "approved" ? "bg-green-100 text-green-800" :
                                                                row.status === "rejected" ? "bg-red-100 text-red-800" :
                                                                    "bg-orange-100 text-orange-800"
                                                            }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                            {reportData.type === "premium" && (
                                                <>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{row.employee_name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">{row.policy_name}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">₹{Number(row.premium_employee).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">₹{Number(row.premium_company).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{(Number(row.premium_employee) + Number(row.premium_company)).toLocaleString()}</td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {reportData.data.length > 50 && (
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                                Showing first 50 of {reportData.data.length} records. Export to CSV to view all data.
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

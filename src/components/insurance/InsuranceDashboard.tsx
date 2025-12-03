"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    Shield,
    Building2,
    FileText,
    Users,
    Calendar,
    AlertCircle,
    RefreshCw,
    Plus,
    TrendingUp,
    DollarSign,
} from "lucide-react";
import Link from "next/link";
import ReactDOM from "react-dom";

type DashboardStats = {
    total_providers: number;
    total_policies: number;
    active_employees_insured: number;
    not_insured_employees: number;
    renewals_this_month: number;
    expired_policies: number;
    expiring_soon: number;
};

type ExpiringPolicy = {
    enrollment_id: number;
    employee_id: number;
    employee_name: string;
    employee_email: string;
    policy_name: string;
    policy_type: string;
    provider_name: string;
    end_date: string;
    days_until_expiry: number;
};

export default function InsuranceDashboard() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [expiringPolicies, setExpiringPolicies] = useState<ExpiringPolicy[]>([]);
    const [role, setRole] = useState<string | null>(null);
    const [modal, setModal] = useState<{ type: string | null } | null>(null);
    const [modalData, setModalData] = useState<any[]>([]);

    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";

    useEffect(() => {
        (async () => {
            try {
                const session = await apiClient<{ authenticated: boolean; role?: string }>("/auth/session", { method: "GET" });
                if (session?.authenticated) {
                    setRole(session.role || null);
                }
            } catch { }
        })();
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [statsRes, expiringRes] = await Promise.all([
                apiClient<{ stats: DashboardStats }>("/insurance/dashboard/stats", { withAuth: true }),
                apiClient<{ expiring_policies: ExpiringPolicy[] }>("/insurance/dashboard/expiring", { withAuth: true, params: { days: "30" } }),
            ]);

            setStats(statsRes.stats);
            setExpiringPolicies(expiringRes.expiring_policies || []);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDDMMYYYY = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "-";
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };

    const openModal = async (type: string) => {
        setModal({ type });
        setModalData([]);
        try {
            if (type === "expiring") {
                setModalData(expiringPolicies);
                return;
            }
            if (type === "providers") {
                const res = await apiClient<any>("/insurance/providers", { withAuth: true });
                setModalData(Array.isArray(res) ? res : (res?.providers || res?.data || []));
            } else if (type === "policies") {
                const res = await apiClient<any>("/insurance/policies", { withAuth: true });
                setModalData(Array.isArray(res) ? res : (res?.policies || res?.data || []));
            } else if (type === "insured") {
                const res = await apiClient<any>("/insurance/enrollment/employees", { withAuth: true, params: { status: "insured", page: "1", limit: "20" } });
                setModalData(res?.employees || []);
            } else if (type === "not-insured") {
                const res = await apiClient<any>("/insurance/enrollment/employees", { withAuth: true, params: { status: "not-insured", page: "1", limit: "20" } });
                setModalData(res?.employees || []);
            } else if (type === "expired") {
                const res = await apiClient<any>("/insurance/dashboard/expired", { withAuth: true });
                setModalData(res?.expired_policies || []);
            } else if (type === "renewals") {
                const res = await apiClient<any>("/insurance/dashboard/renewals", { withAuth: true });
                setModalData(res?.renewals || []);
            }
        } catch (e) {
            console.error("Failed to open modal:", e);
        }
    };


    const StatCard = ({ title, value, icon: Icon, borderColor, textColor, bgColor, onClick }: {
        title: string;
        value: number | string;
        icon: any;
        borderColor: string;
        textColor: string;
        bgColor: string;
        onClick?: () => void
    }) => {
        const content = (
            <div className={`rounded-xl p-4 border-2 ${borderColor} ${bgColor} ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-all duration-200`}>
                <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-5 h-5 ${textColor}`} />
                </div>
                <div className={`text-2xl font-bold ${textColor} mb-1`}>{value}</div>
                <div className="text-gray-600 text-sm">{title}</div>
            </div>
        );
        if (onClick) return <button onClick={onClick} className="w-full text-left">{content}</button>;
        return content;
    };

    const basePath = isOrgAdmin ? "/org-admin" : "/employee";

    const formatCurrency = (amount: number) => {
        return `₹${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Shield className="w-8 h-8 text-blue-600" />
                            Insurance Management
                        </h1>
                        <p className="text-gray-600 mt-2">Manage insurance providers, policies, and employee enrollment</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={fetchDashboardData}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Financial Summary */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard
                            title="Total Monthly Premium"
                            value={formatCurrency((stats as any).total_monthly_premium || 0)}
                            icon={DollarSign}
                            borderColor="border-gray-200"
                            textColor="text-gray-900"
                            bgColor="bg-white"
                        />
                        <StatCard
                            title="Company Contribution"
                            value={formatCurrency((stats as any).employer_contribution || 0)}
                            icon={TrendingUp}
                            borderColor="border-green-200"
                            textColor="text-green-600"
                            bgColor="bg-green-50"
                        />
                        <StatCard
                            title="Employee Contribution"
                            value={formatCurrency((stats as any).employee_contribution || 0)}
                            icon={DollarSign}
                            borderColor="border-blue-200"
                            textColor="text-blue-600"
                            bgColor="bg-blue-50"
                        />
                    </div>
                )}

                {/* Statistics Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            title="Total Providers"
                            value={stats.total_providers}
                            icon={Building2}
                            borderColor="border-blue-200"
                            textColor="text-blue-600"
                            bgColor="bg-blue-50"
                            onClick={() => openModal("providers")}
                        />
                        <StatCard
                            title="Total Policies"
                            value={stats.total_policies}
                            icon={FileText}
                            borderColor="border-indigo-200"
                            textColor="text-indigo-600"
                            bgColor="bg-indigo-50"
                            onClick={() => openModal("policies")}
                        />
                        <StatCard
                            title="Active Employees Insured"
                            value={stats.active_employees_insured}
                            icon={Users}
                            borderColor="border-purple-200"
                            textColor="text-purple-600"
                            bgColor="bg-purple-50"
                            onClick={() => openModal("insured")}
                        />
                        <StatCard
                            title="Not Insured Employees"
                            value={stats.not_insured_employees}
                            icon={Users}
                            borderColor="border-gray-200"
                            textColor="text-gray-600"
                            bgColor="bg-gray-50"
                            onClick={() => openModal("not-insured")}
                        />
                        <StatCard
                            title="Renewals This Month"
                            value={stats.renewals_this_month}
                            icon={Calendar}
                            borderColor="border-orange-200"
                            textColor="text-orange-600"
                            bgColor="bg-orange-50"
                            onClick={() => openModal("renewals")}
                        />
                        <StatCard
                            title="Expiring Soon (30 days)"
                            value={stats.expiring_soon}
                            icon={AlertCircle}
                            borderColor="border-red-200"
                            textColor="text-red-600"
                            bgColor="bg-red-50"
                            onClick={() => openModal("expiring")}
                        />
                        <StatCard
                            title="Expired (Not Renewed)"
                            value={stats.expired_policies}
                            icon={AlertCircle}
                            borderColor="border-gray-200"
                            textColor="text-gray-600"
                            bgColor="bg-gray-50"
                            onClick={() => openModal("expired")}
                        />
                    </div>
                )}

                {/* Filters Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        <h3 className="font-semibold text-gray-900">Filters</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="all">All Time</option>
                                <option value="30">Last 30 Days</option>
                                <option value="60">Last 60 Days</option>
                                <option value="90">Last 90 Days</option>
                                <option value="180">Last 6 Months</option>
                                <option value="365">Last Year</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Policy Type</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="">All Types</option>
                                <option value="health">Health</option>
                                <option value="life">Life</option>
                                <option value="accident">Accident</option>
                                <option value="disability">Disability</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="expiring">Expiring Soon</option>
                                <option value="expired">Expired</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                {stats && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Coverage Overview Chart */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Coverage Overview</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Insured Employees</span>
                                        <span className="text-sm font-bold text-green-600">{stats.active_employees_insured}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.active_employees_insured / (stats.active_employees_insured + stats.not_insured_employees)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Not Insured</span>
                                        <span className="text-sm font-bold text-gray-600">{stats.not_insured_employees}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-gray-400 to-gray-500 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.not_insured_employees / (stats.active_employees_insured + stats.not_insured_employees)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">Coverage Rate</span>
                                        <span className="text-lg font-bold text-indigo-600">
                                            {Math.round((stats.active_employees_insured / (stats.active_employees_insured + stats.not_insured_employees)) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Policy Status Chart */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Policy Status</h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Active Policies</span>
                                        <span className="text-sm font-bold text-purple-600">{stats.total_policies}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.total_policies / (stats.total_policies + stats.expired_policies + stats.expiring_soon)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Expiring Soon</span>
                                        <span className="text-sm font-bold text-orange-600">{stats.expiring_soon}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.expiring_soon / (stats.total_policies + stats.expired_policies + stats.expiring_soon)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-gray-700">Expired (Not Renewed)</span>
                                        <span className="text-sm font-bold text-red-600">{stats.expired_policies}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                        <div
                                            className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                                            style={{ width: `${(stats.expired_policies / (stats.total_policies + stats.expired_policies + stats.expiring_soon)) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Expiring Policies */}
                {expiringPolicies.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Policies Expiring Soon</h2>
                                </div>
                                <span className="text-sm text-gray-500">Next 30 days</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {expiringPolicies.slice(0, 10).map((policy) => (
                                        <tr key={policy.enrollment_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{policy.employee_name}</div>
                                                <div className="text-xs text-gray-500">{policy.employee_email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.policy_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                                    {policy.policy_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{policy.provider_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDDMMYYYY(policy.end_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 text-xs font-semibold rounded-full ${policy.days_until_expiry <= 7
                                                        ? "bg-red-100 text-red-700"
                                                        : policy.days_until_expiry <= 15
                                                            ? "bg-orange-100 text-orange-700"
                                                            : "bg-yellow-100 text-yellow-700"
                                                        }`}
                                                >
                                                    {policy.days_until_expiry} days
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {expiringPolicies.length > 10 && (
                            <div className="p-4 border-t border-gray-200 text-center">
                                <Link href={`${basePath}/insurance/reports/expiring`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                                    View all {expiringPolicies.length} expiring policies →
                                </Link>
                            </div>
                        )}
                    </div>
                )}
                {modal?.type && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-white text-gray-900 flex justify-between items-center">
                                <h2 className="text-lg font-semibold capitalize">{modal.type} details</h2>
                                <button onClick={() => setModal(null)} className="text-gray-600 hover:text-gray-900">&times;</button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                {modal?.type === 'insured' ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Policies</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {modalData.map((emp: any) => (
                                                    <tr key={emp.id}>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                                                            <div className="text-xs text-gray-500">{emp.email}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{emp.department_name || '-'}</td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm text-gray-900">{emp.policy_names || '-'}</div>
                                                            <div className="text-xs text-gray-500">{emp.provider_names || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{emp.earliest_start_date ? formatDDMMYYYY(emp.earliest_start_date) : '-'}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{emp.earliest_expiry ? formatDDMMYYYY(emp.earliest_expiry) : '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : modal?.type === 'not-insured' ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {modalData.map((emp: any) => (
                                                    <tr key={emp.id}>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                                                            <div className="text-xs text-gray-500">{emp.email}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{emp.department_name || '-'}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{emp.role_name || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : modal?.type === 'expiring' ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {modalData.map((p: any) => (
                                                    <tr key={p.enrollment_id}>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm font-medium text-gray-900">{p.employee_name}</div>
                                                            <div className="text-xs text-gray-500">{p.employee_email}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm text-gray-900">{p.policy_name}</div>
                                                            <div className="text-xs text-gray-500">{p.provider_name}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{formatDDMMYYYY(p.start_date)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{formatDDMMYYYY(p.end_date)}</td>
                                                        <td className="px-4 py-2">
                                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.days_until_expiry <= 7 ? 'bg-red-100 text-red-700' :
                                                                p.days_until_expiry <= 15 ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                {p.days_until_expiry}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : modal?.type === 'expired' ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ended</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Days Since</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {modalData.map((p: any) => (
                                                    <tr key={p.enrollment_id}>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm font-medium text-gray-900">{p.employee_name}</div>
                                                            <div className="text-xs text-gray-500">{p.employee_email}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm text-gray-900">{p.policy_name}</div>
                                                            <div className="text-xs text-gray-500">{p.provider_name}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{formatDDMMYYYY(p.start_date)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{formatDDMMYYYY(p.end_date)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">{p.days_since_expiry} days ago</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : modal?.type === 'renewals' ? (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {modalData.map((p: any) => (
                                                    <tr key={p.enrollment_id}>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm font-medium text-gray-900">{p.employee_name}</div>
                                                            <div className="text-xs text-gray-500">{p.employee_email}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-sm text-gray-900">{p.policy_name}</div>
                                                            <div className="text-xs text-gray-500">{p.provider_name}</div>
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{formatDDMMYYYY(p.start_date)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{formatDDMMYYYY(p.end_date)}</td>
                                                        <td className="px-4 py-2 text-sm text-gray-900">{p.version_number}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : modal?.type === 'providers' ? (
                                    <ul className="divide-y divide-gray-200">
                                        {modalData.map((item: any, idx: number) => (
                                            <li key={idx} className="py-3">
                                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-500">{item.email || '-'}</div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : modal?.type === 'policies' ? (
                                    <ul className="divide-y divide-gray-200">
                                        {modalData.map((item: any, idx: number) => (
                                            <li key={idx} className="py-3">
                                                <div className="text-sm font-medium text-gray-900">{item.policy_name}</div>
                                                <div className="text-xs text-gray-500 capitalize">{item.type}</div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {modalData.map((item: any, idx: number) => (
                                            <li key={idx} className="py-2 text-sm text-gray-900">
                                                {item.employee_name || item.name || item.policy_name || `${item.first_name} ${item.last_name}` || item.email}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

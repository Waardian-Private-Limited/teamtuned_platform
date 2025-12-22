"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/apiClient";
import {
    Users,
    Search,
    Filter,
    Download,
    ChevronLeft,
    ChevronRight,
    Phone,
    Mail,
    Building,
    Briefcase,
    MapPin,
    User,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type EmergencyContact = {
    id: number;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
};

type Employee = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    department_name?: string;
    role_name?: string;
    site_name?: string;
    emergency_contacts?: EmergencyContact[];
};

export default function EmergencyContacts() {
    const { role, permissions } = useAuth();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);

    // Permissions
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasPerm = (code: string | string[]) => {
        if (isOrgAdmin) return true;
        const check = (c: string) => (permissions || []).some((p) => (p || "").toUpperCase() === c.toUpperCase());
        if (Array.isArray(code)) return code.some(check);
        return check(code);
    };
    const isHRMode = hasPerm("HR_MODE");

    // Filters
    const [filterDepartment, setFilterDepartment] = useState<number | "all">("all");
    const [filterRole, setFilterRole] = useState<number | "all">("all");
    const [filterSite, setFilterSite] = useState<number | "all">("all");

    // Dropdown data
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
    const [sites, setSites] = useState<{ id: number; name: string }[]>([]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEmployees, setTotalEmployees] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Fetch employees with emergency contacts
    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit: pageSize,
            };

            if (searchQuery && searchQuery.trim()) params.q = searchQuery.trim();

            if (filterDepartment !== "all") params.department_id = filterDepartment;
            if (filterRole !== "all") params.role_id = filterRole;
            if (filterSite !== "all") params.site_id = filterSite;

            const res = await apiClient<{ employees: Employee[]; total: number; page: number; limit: number }>(
                "/organization/employees/emergency-contacts",
                { method: "GET", withAuth: true, params }
            );

            setEmployees(res?.employees || []);
            setTotalEmployees(res?.total || 0);
            setTotalPages(Math.ceil((res?.total || 0) / pageSize));
        } catch (error: any) {
            console.error("Failed to fetch employees:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch dropdown data
    useEffect(() => {
        const fetchDropdowns = async () => {
            try {
                // Determine if we should fetch only assigned sites (not just incharge)
                const shouldFetchAssignedOnly = !isOrgAdmin && !isHRMode;

                const sitesUrl = shouldFetchAssignedOnly
                    ? "/sites?assigned_only=1"
                    : "/sites";

                const [deptRes, roleRes, siteRes] = await Promise.all([
                    apiClient<{ departments?: any[] }>("/organization/departments", { method: "GET", withAuth: true }),
                    apiClient<{ roles?: any[] }>("/organization/roles", { method: "GET", withAuth: true }),
                    apiClient<{ sites?: any[]; data?: any[] }>(sitesUrl, { method: "GET", withAuth: true }),
                ]);

                setDepartments(deptRes?.departments || []);
                setRoles(roleRes?.roles || []);
                const siteList = siteRes?.sites || siteRes?.data || [];
                setSites(siteList.map((s: any) => ({ id: s.id, name: s.name || s.site_name })));
            } catch (error) {
                console.error("Failed to fetch dropdowns:", error);
            }
        };

        fetchDropdowns();
    }, [isOrgAdmin, isHRMode]);

    // Auto-select first site for non-HR/non-OrgAdmin users on first load
    useEffect(() => {
        if (sites.length > 0 && !isHRMode && !isOrgAdmin && filterSite === "all") {
            const firstSiteId = sites[0]?.id;
            if (firstSiteId) {
                setFilterSite(firstSiteId);
            }
        }
    }, [sites, isHRMode, isOrgAdmin, filterSite]);

    // Fetch employees when filters or pagination change
    useEffect(() => {
        fetchEmployees();
    }, [currentPage, pageSize, searchQuery, filterDepartment, filterRole, filterSite]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setCurrentPage(1);
        fetchEmployees();
    };

    const handleExport = async () => {
        try {
            const params: any = {
                q: searchQuery || undefined,
            };

            if (filterDepartment !== "all") params.department_id = filterDepartment;
            if (filterRole !== "all") params.role_id = filterRole;
            if (filterSite !== "all") params.site_id = filterSite;

            // Create CSV content
            let csv = "Employee Name,Email,Phone,Department,Role,Site,Contact Name,Relationship,Contact Phone,Contact Email\\n";

            employees.forEach(emp => {
                const empName = `${emp.first_name} ${emp.last_name}`;
                const empEmail = emp.email || "";
                const empPhone = emp.phone || "";
                const dept = emp.department_name || "";
                const role = emp.role_name || "";
                const site = emp.site_name || "";

                if (emp.emergency_contacts && emp.emergency_contacts.length > 0) {
                    emp.emergency_contacts.forEach(contact => {
                        csv += `"${empName}","${empEmail}","${empPhone}","${dept}","${role}","${site}","${contact.name}","${contact.relationship}","${contact.phone}","${contact.email || ""}"\\n`;
                    });
                } else {
                    csv += `"${empName}","${empEmail}","${empPhone}","${dept}","${role}","${site}","","","",""\\n`;
                }
            });

            const blob = new Blob([csv], { type: "text/csv" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `emergency_contacts_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Export failed:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Emergency Contacts
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            View employee emergency contact information
                        </p>
                    </div>
                    <div className="flex items-center gap-2">

                        <button
                            onClick={() => fetchEmployees()}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-all"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            <span className="text-sm font-medium">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                    <form onSubmit={handleSearch} className="flex items-center gap-3 mb-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by employee name or contact name..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span className="text-sm font-medium">Filters</span>
                            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                    </form>

                    {/* Filters Section */}
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    value={filterDepartment}
                                    onChange={(e) => {
                                        setFilterDepartment(e.target.value === "all" ? "all" : Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="all">All Departments</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={filterRole}
                                    onChange={(e) => {
                                        setFilterRole(e.target.value === "all" ? "all" : Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="all">All Roles</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Site</label>
                                <select
                                    value={filterSite}
                                    onChange={(e) => {
                                        setFilterSite(e.target.value === "all" ? "all" : Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                >
                                    <option value="all">All Sites</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>
                                            {site.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Showing {employees.length} of {totalEmployees} employees
                    </p>
                    <div className="flex items-center gap-2">
                        <label className="text-xs">Per page:</label>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 border border-gray-200 rounded-lg text-xs"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                {/* Employee List */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
                    </div>
                ) : employees.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-12 text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">No employees found</p>
                        <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {employees.map((employee) => (
                            <div
                                key={employee.id}
                                className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-all"
                            >
                                {/* Employee Info */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {employee.first_name?.[0]}{employee.last_name?.[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">
                                                {employee.first_name} {employee.last_name}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                                {employee.email && (
                                                    <div className="flex items-center gap-1">
                                                        <Mail className="w-4 h-4" />
                                                        <span>{employee.email}</span>
                                                    </div>
                                                )}
                                                {employee.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <Phone className="w-4 h-4" />
                                                        <span>{employee.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {employee.department_name && (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                                                <Building className="w-3 h-3" />
                                                {employee.department_name}
                                            </span>
                                        )}
                                        {employee.role_name && (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" />
                                                {employee.role_name}
                                            </span>
                                        )}
                                        {employee.site_name && (
                                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                {employee.site_name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Emergency Contacts */}
                                <div className="border-t border-gray-100 pt-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contacts</h4>
                                    {employee.emergency_contacts && employee.emergency_contacts.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {employee.emergency_contacts.map((contact) => (
                                                <div
                                                    key={contact.id}
                                                    className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <User className="w-5 h-5 text-violet-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-gray-900">{contact.name}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5">{contact.relationship}</p>
                                                            <div className="mt-2 space-y-1">
                                                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                                                    <Phone className="w-4 h-4 text-gray-400" />
                                                                    <span>{contact.phone}</span>
                                                                </div>
                                                                {contact.email && (
                                                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                                                        <Mail className="w-4 h-4 text-gray-400" />
                                                                        <span className="truncate">{contact.email}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-500 text-sm">
                                            No emergency contacts on file
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span className="text-sm font-medium">Previous</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </span>
                        </div>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="text-sm font-medium">Next</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

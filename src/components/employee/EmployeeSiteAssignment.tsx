"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import {
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Building,
  Mail,
  Phone,
  User,
  CheckCircle,
  RefreshCw,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Users,
  Briefcase
} from "lucide-react";

type Department = { id: number; name: string };
type Site = { id: number; name: string; code: string };
type EmployeeLite = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  department_id?: number | null;
  role_id?: number | null;
  site_ids?: number[];
  status?: 'active' | 'inactive';
  designation?: string | null;
};

type EmployeeDetail = {
  id: number;
  department_id?: number | null;
  first_name: string;
  last_name: string;
  sites: { id: number; name: string; code: string; is_incharge: boolean }[];
};

function useCountUp(target: number, duration = 800) {
  const [v, setV] = useState(0);
  const { role, permissions, user, organization, employee } = useAuth();

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const step = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      setV(Math.floor(p * (Number.isFinite(target) ? target : 0)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [target, duration]);
  return v;
}

import { useFeatures } from "@/lib/hooks/useFeatures";

import { useAuth } from "@/context/AuthContext";
export default function EmployeeSiteAssignment() {
  const { role, permissions, user, employee } = useAuth();
  // Features
  const { hasFeature } = useFeatures();
  const hasCoreFeature = hasFeature('PAYROLL_FEATURE');

  // Permissions
  const isOrgAdmin = (role || "").toUpperCase() === "ORGADMIN" || (role || "").toUpperCase() === "SUPERADMIN";
  const isHRMode = (permissions || []).some((p) => (p || "").toUpperCase() === "HR_MODE");
  const hasPerm = (code: string | string[]) => {
    const check = (c: string) => (permissions || []).some((p) => (p || "").toUpperCase() === c.toUpperCase());
    if (Array.isArray(code)) return code.some(check);
    return check(code);
  };

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDeptId, setFilterDeptId] = useState<number | "">("");
  const [filterSiteId, setFilterSiteId] = useState<number | "">("");
  const [inchargeOnly, setInchargeOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalEntries, setTotalEntries] = useState<number>(0);

  // Edit Modal State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAssigned, setEditAssigned] = useState<Set<number>>(new Set());
  const [editIncharge, setEditIncharge] = useState<Set<number>>(new Set());
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string>("");

  // Stats animation
  const totalCount = useCountUp(totalEntries || 0);
  const deptCount = useCountUp(departments.length || 0);
  const siteCount = useCountUp(sites.length || 0);
  const assignedCount = useCountUp(employees.reduce((acc, emp) => acc + (emp.site_ids?.length || 0), 0));

  // Auto-select first site for non-HR/non-OrgAdmin users on first load
  useEffect(() => {
    if (sites.length > 0 && !isHRMode && !isOrgAdmin && filterSiteId === "") {
      const firstSiteId = sites[0]?.id;
      if (firstSiteId) {
        setFilterSiteId(firstSiteId);
      }
    }
  }, [sites, isHRMode, isOrgAdmin, filterSiteId]);

  // Fetch session and permissions
  useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole((session.role || null) as string | null);
          // setPermissions(session.employee?.permissions || []);
        }
      } catch { }
    })();
  }, []);

  // Fetch dropdowns
  const fetchDropdowns = async () => {
    try {
      const canAssignSites = isOrgAdmin || isHRMode || hasPerm("EMPLOYEE_ASSIGN_SITE");
      const shouldFetchAssignedOnly = !canAssignSites;
      const sitesUrl = shouldFetchAssignedOnly ? "/sites?assigned_only=1" : "/sites";

      const [deptData, sitesData] = await Promise.all([
        apiClient<Department[]>("/organization/departments", { method: "GET" }).catch(() => []),
        apiClient<{ sites: any[] }>(sitesUrl, { method: "GET" }).catch(() => ({ sites: [] })),
      ]);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      const normalizedSites: Site[] = (sitesData.sites || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
      setSites(normalizedSites);
    } catch (e) { }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("format", "paginated");
      params.set("page", String(page));
      params.set("limit", String(pageSize));

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (typeof filterDeptId === "number") params.set("department_id", String(filterDeptId));
      if (typeof filterSiteId === "number") params.set("site_id", String(filterSiteId));
      if (inchargeOnly) params.set("incharge_only", "true");
      if (statusFilter !== "all") params.set("status", statusFilter);

      const data = await apiClient<{ data?: EmployeeLite[]; items?: EmployeeLite[]; total: number; page: number; limit: number; hasNext: boolean }>(`/organization/employees?${params.toString()}`, { method: "GET" });
      // API returns 'data' key for array, but we were looking for 'items'.
      const items = Array.isArray(data.data) ? data.data : (Array.isArray(data.items) ? data.items : []);
      setEmployees(items);
      setTotalEntries(Number(data.total || 0));
    } catch (e: any) {
      setError(e?.message || "Failed to fetch employees");
      setEmployees([]);
      setTotalEntries(0);
    } finally {
      setLoading(false);
    }
  };

  // Load dropdowns when permissions change
  useEffect(() => {
    if (role !== null) {
      fetchDropdowns();
    }
  }, [role, permissions]);

  // Fetch employees when filters change
  useEffect(() => {
    fetchEmployees();
  }, [page, pageSize, searchQuery, filterDeptId, filterSiteId, inchargeOnly, statusFilter]);

  // Edit modal functions
  const openEditor = async (employeeId: number) => {
    setEditingId(employeeId);
    setEditError("");
    setEditLoading(true);
    try {
      const detail = await apiClient<EmployeeDetail>(`/organization/employees/${employeeId}`, { method: "GET" });
      const assigned = new Set<number>((detail.sites || []).map((s) => s.id));
      const incharge = new Set<number>((detail.sites || []).filter((s) => s.is_incharge).map((s) => s.id));
      setEditAssigned(assigned);
      setEditIncharge(incharge);
    } catch (e: any) {
      setEditError(e?.message || "Failed to load employee");
      setEditAssigned(new Set());
      setEditIncharge(new Set());
    } finally {
      setEditLoading(false);
    }
  };

  const toggleAssign = (siteId: number) => {
    setEditAssigned((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
        setEditIncharge((p) => {
          const ni = new Set(p);
          ni.delete(siteId);
          return ni;
        });
      } else {
        next.add(siteId);
      }
      return next;
    });
  };

  const toggleIncharge = (siteId: number) => {
    if (!editAssigned.has(siteId)) return;
    setEditIncharge((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!editingId) return;
    if (!hasPerm("EMPLOYEE_ASSIGN_SITE") && !isOrgAdmin && !isHRMode) {
      setEditError("Not authorized to assign sites");
      return;
    }

    setEditLoading(true);
    setEditError("");
    try {
      const site_assignments = Array.from(editAssigned).map((sid) => ({ site_id: sid, is_incharge: editIncharge.has(sid) }));
      await apiClient(`/organization/employees/${editingId}/sites`, {
        method: "PUT",
        body: { site_assignments },
      });
      setEditingId(null);
      fetchEmployees();
    } catch (e: any) {
      setEditError(e?.message || "Failed to save assignments");
    } finally {
      setEditLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterDeptId("");
    setFilterSiteId("");
    setInchargeOnly(false);
    setStatusFilter("all");
    setPage(1);
  };

  const canAssign = hasPerm("EMPLOYEE_ASSIGN_SITE") || isOrgAdmin || isHRMode;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));

  // UI Helpers
  const getStatusColor = (status: string = 'active') => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-50 border border-green-200';
      case 'inactive': return 'text-red-700 bg-red-50 border border-red-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string = 'active') => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'inactive': return <X className="w-3 h-3 text-red-500" />;
      default: return <User className="w-3 h-3 text-gray-500" />;
    }
  };

  // Loading State
  if (loading && employees.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Site Assignment</h1>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 bg-gray-200 rounded flex-1 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-9 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-6 gap-4 px-4 py-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied or Feature Disabled
  if ((!isOrgAdmin && !hasPerm("EMPLOYEE_ASSIGN_SITE") && !isHRMode) || !hasCoreFeature) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Site Assignment</h1>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">
            {!hasCoreFeature
              ? "This feature (PAYROLL_FEATURE) is not enabled for your organization."
              : "You do not have permission to manage site assignments."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Site Assignment</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-10 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <select
                value={filterDeptId}
                onChange={(e) => { const v = e.target.value; setFilterDeptId(v ? Number(v) : ""); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={filterSiteId}
                onChange={(e) => { const v = e.target.value; setFilterSiteId(v ? Number(v) : ""); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {isHRMode || isOrgAdmin ? <option value="">All Sites</option> : null}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={inchargeOnly}
                    onChange={(e) => { setInchargeOnly(e.target.checked); setPage(1); }}
                    className="rounded border-gray-300"
                  />
                  <span>Show Incharge Only</span>
                </label>
              </div>

              <div className="md:col-span-3 flex items-center space-x-2">
                <button
                  onClick={fetchEmployees}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Total Employees</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Departments</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{deptCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Building className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Sites</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{siteCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <MapPin className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Total Assignments</p>
              <p className="text-2xl font-bold text-rose-900 mt-1">{assignedCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Briefcase className="w-5 h-5 text-rose-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <X className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sites
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {employees.map((employee) => {
                const deptName = departments.find((d) => d.id === employee.department_id)?.name || "-";
                const assignedSites = employee.site_ids?.length || 0;

                return (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {employee.first_name} {employee.last_name}
                        </div>
                        {employee.designation && (
                          <div className="text-xs text-gray-500">{employee.designation}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      {employee.phone && (
                        <div className="text-sm text-gray-500">{employee.phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{deptName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${assignedSites > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {assignedSites} site{assignedSites !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1.5">
                        {getStatusIcon(employee.status)}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(employee.status)} capitalize`}>
                          {employee.status || "active"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditor(employee.id)}
                        disabled={!canAssign}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${canAssign
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        Manage Sites
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && !loading && (
          <div className="text-center py-8">
            <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No employees found</h3>
            <p className="text-xs text-gray-500 mb-3">No employees match your current filters.</p>
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {employees.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(page * pageSize, totalEntries)}</span> of <span className="font-medium">{totalEntries}</span> employees
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setPage(1)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) pages.push(<span key="ellipsis1" className="px-1 text-gray-500">...</span>);
                  }
                  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
                    pages.push(
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) pages.push(<span key="ellipsis2" className="px-1 text-gray-500">...</span>);
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setPage(totalPages)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${page === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {totalPages}
                      </button>
                    );
                  }
                  return pages;
                })()}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Site Assignment Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Manage Site Assignment</h3>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {editLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : editError ? (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-4">{editError}</div>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sites.map((site) => (
                      <div
                        key={site.id}
                        className={`border rounded-lg p-3 transition-all ${editAssigned.has(site.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white'
                          }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={editAssigned.has(site.id)}
                              onChange={() => toggleAssign(site.id)}
                              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{site.name}</div>
                              <div className="text-sm text-gray-500">{site.code}</div>
                            </div>
                          </div>
                        </div>

                        {editAssigned.has(site.id) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={editIncharge.has(site.id)}
                                onChange={() => toggleIncharge(site.id)}
                                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm font-medium text-gray-700">Site Incharge</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      {editAssigned.size} site{editAssigned.size !== 1 ? 's' : ''} selected •
                      {editIncharge.size} incharge role{editIncharge.size !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveAssignments}
                        disabled={editLoading}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        {editLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
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
  RefreshCw
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
};

type EmployeeDetail = {
  id: number;
  department_id?: number | null;
  first_name: string;
  last_name: string;
  sites: { id: number; name: string; code: string; is_incharge: boolean }[];
};

export default function EmployeeSiteAssignment() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [employees, setEmployees] = React.useState<EmployeeLite[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [filterDeptId, setFilterDeptId] = React.useState<number | "">("");
  const [filterSiteId, setFilterSiteId] = React.useState<number | "">("");
  const [inchargeOnly, setInchargeOnly] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  
  // Permission helpers
  const isOrgAdmin = (role || "").toUpperCase() === "ORGADMIN";
  const isHRMode = (permissions || []).some((p) => (p || "").toUpperCase() === "HR_MODE");
  const hasPerm = (code: string | string[]) => {
    const codes = Array.isArray(code) ? code : [code];
    const upper = (permissions || []).map((p) => (p || "").toUpperCase());
    return codes.some((c) => upper.includes((c || "").toUpperCase()));
  };

  // Auto-select first site for non-HR/non-OrgAdmin users on first load
  React.useEffect(() => {
    if (sites.length > 0 && !isHRMode && !isOrgAdmin && filterSiteId === "") {
      const firstSiteId = sites[0]?.id;
      if (firstSiteId) {
        setFilterSiteId(firstSiteId);
      }
    }
  }, [sites, isHRMode, isOrgAdmin, filterSiteId]);

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole((session.role || null) as string | null);
          setPermissions(session.employee?.permissions || []);
        }
      } catch {}
    })();
  }, []);

  const fetchDropdowns = async () => {
    try {
      const [deptData, sitesData] = await Promise.all([
        apiClient<Department[]>("/organization/departments", { method: "GET" }).catch(() => []),
        apiClient<{ sites: any[] }>("/sites", { method: "GET" }).catch(() => ({ sites: [] })),
      ]);
      setDepartments(Array.isArray(deptData) ? deptData : []);
      const normalizedSites: Site[] = (sitesData.sites || []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
      setSites(normalizedSites);
    } catch (e) {}
  };

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {
        format: "paginated",
        page: String(page),
        limit: String(pageSize),
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (typeof filterDeptId === "number") params.department_id = String(filterDeptId);
      if (typeof filterSiteId === "number") params.site_id = String(filterSiteId);
      if (inchargeOnly) params.incharge_only = "true";

      const data = await apiClient<{ items: EmployeeLite[]; total: number; page: number; limit: number; hasNext: boolean }>("/organization/employees", {
        method: "GET",
        params,
      });
      const items = Array.isArray(data.items) ? data.items : [];
      setEmployees(items);
      setTotal(Number(data.total || items.length));
    } catch (e: any) {
      setError(e?.message || "Failed to fetch employees");
      setEmployees([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDropdowns();
  }, []);

  React.useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, searchQuery, filterDeptId, filterSiteId, inchargeOnly, statusFilter]);

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editAssigned, setEditAssigned] = React.useState<Set<number>>(new Set());
  const [editIncharge, setEditIncharge] = React.useState<Set<number>>(new Set());
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState<string>("");

  const openEditor = async (employeeId: number) => {
    if (!hasPerm("EMPLOYEE_ASSIGN_SITE")) {
      setError("Not authorized to assign sites");
      return;
    }
    
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
    if (!hasPerm("EMPLOYEE_ASSIGN_SITE")) {
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
      // refresh list to reflect counts
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

  const getStatusColor = (status: string = 'active') => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string = 'active') => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'inactive': return <X className="w-4 h-4 text-red-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const canAssign = hasPerm("EMPLOYEE_ASSIGN_SITE") || isOrgAdmin || isHRMode;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading && employees.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Assignment</h1>
            <p className="text-gray-600 mt-1">Manage employee site assignments and incharge roles</p>
          </div>
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-5 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 border-b border-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fixed Header Section */}
      <div className="sticky top-0 z-30 bg-white pb-6 border-b border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Assignment</h1>
            <p className="text-gray-600 mt-1">Manage employee site assignments and incharge roles</p>
          </div>
        </div>

        {/* Compact Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span> 
                Total Employees
              </div>
              <div className="text-lg font-semibold">{total}</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span> 
                Departments
              </div>
              <div className="text-lg font-semibold">{departments.length}</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span> 
                Sites
              </div>
              <div className="text-lg font-semibold">{sites.length}</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span> 
                Can Assign
              </div>
              <div className="text-lg font-semibold">{canAssign ? "Yes" : "No"}</div>
            </div>
          </div>
        </div>

        {/* Fixed Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-auto sm:min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10 pr-3 py-2 text-sm w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filterDeptId}
              onChange={(e) => { const v = e.target.value; setFilterDeptId(v ? Number(v) : ""); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={filterSiteId}
              onChange={(e) => { const v = e.target.value; setFilterSiteId(v ? Number(v) : ""); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {isHRMode || isOrgAdmin ? <option value="">All Sites</option> : null}
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input 
                type="checkbox" 
                checked={inchargeOnly} 
                onChange={(e) => { setInchargeOnly(e.target.checked); setPage(1); }}
                className="rounded border-gray-300"
              />
              Incharge only
            </label>

            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Table Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-400px)]">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sites</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => {
                const deptName = departments.find((d) => d.id === employee.department_id)?.name || "-";
                const assignedSites = (employee.site_ids || []).length;
                  
                return (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      {employee.phone && (
                        <div className="text-sm text-gray-500">{employee.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{deptName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assignedSites} site{assignedSites !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(employee.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)} capitalize`}>
                          {employee.status || 'active'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEditor(employee.id)}
                        disabled={!canAssign}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          canAssign 
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
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-4">No employees match your current filters.</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sites.map((site) => (
                      <div 
                        key={site.id} 
                        className={`border rounded-lg p-4 transition-all ${
                          editAssigned.has(site.id) 
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
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveAssignments}
                        disabled={editLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} employees
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
            
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
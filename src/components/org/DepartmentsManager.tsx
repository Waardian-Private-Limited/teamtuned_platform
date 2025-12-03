"use client";

import React from "react";
import {
  Eye,
  Pencil,
  Power,
  Users,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  RefreshCw,
  Filter,
  Building2,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

export type Department = {
  id: number;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
  created_by?: number | null;
  created_at?: string;
  updated_at?: string | null;
  employee_count?: number;
};

// Memoized form component to prevent re-renders and focus loss
const DepartmentFormFields = React.memo(({
  form,
  onChange,
  idPrefix
}: {
  form: Partial<Department>;
  onChange: (key: keyof Department, value: any) => void;
  idPrefix: string;
}) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Department Name
        </label>
        <input
          type="text"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={form.name as string}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g., HR, Site Ops, Admin"
          autoFocus
        />
        <p className="mt-1 text-xs text-gray-500">Unique within organization.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={form.description as string || ""}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Optional notes about the department"
          rows={3}
        />
        <p className="mt-1 text-xs text-gray-500">Optional notes for clarity.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          value={form.status as string || "active"}
          onChange={(e) => onChange("status", e.target.value)}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">Active departments can be used for assignments.</p>
      </div>
    </div>
  );
});

DepartmentFormFields.displayName = 'DepartmentFormFields';

export default function DepartmentsManager() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");

  // Filters
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [filtersExpanded, setFiltersExpanded] = React.useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState<boolean>(false);
  const [showViewModal, setShowViewModal] = React.useState<boolean>(false);
  const [showEditModal, setShowEditModal] = React.useState<boolean>(false);
  const [showEmployeesModal, setShowEmployeesModal] = React.useState<boolean>(false);

  // Form and state
  const [saving, setSaving] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<Department>>({
    name: "",
    description: "",
    status: "active"
  });
  const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
  const [selectedDepartmentForEmployees, setSelectedDepartmentForEmployees] = React.useState<Department | null>(null);
  const [employees, setEmployees] = React.useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = React.useState<boolean>(false);

  // Permissions
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  const onChange = React.useCallback((key: keyof Department, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const fetchDepartments = async () => {
    if (role === "Employee" && !hasPerm("DEPT_VIEW")) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      params.page = String(currentPage);
      params.pageSize = String(pageSize);

      const data = await apiClient<{
        departments: Department[];
        page: number;
        pageSize: number;
        total: number;
        pages: number;
      }>("/organization/departments", { method: "GET", params });

      setDepartments(Array.isArray(data?.departments) ? data.departments : []);
      setTotalItems(Number(data.total || 0));
      setTotalPages(Number(data.pages || 1));
    } catch (e: any) {
      setError(e?.message || "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{
          authenticated: boolean;
          role: string;
          employee?: { permissions?: string[] } | null;
        }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole(session.role || null);
          setPermissions(session.employee?.permissions || []);
        }
      } catch (_) { }
    })();
  }, []);

  React.useEffect(() => {
    fetchDepartments();
  }, [role, permissions]);

  // Re-fetch on pagination changes
  React.useEffect(() => {
    if (!role || (role === "Employee" && !hasPerm("DEPT_VIEW"))) return;
    fetchDepartments();
  }, [currentPage, pageSize]);

  // Debounced search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!role || (role === "Employee" && !hasPerm("DEPT_VIEW"))) return;
      setCurrentPage(1);
      fetchDepartments();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const applyFilters = () => {
    setCurrentPage(1);
    fetchDepartments();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    fetchDepartments();
  };

  const isValid = () => {
    return Boolean((form.name || "").trim());
  };

  const isDuplicateName = (name: string) => {
    const n = String(name || "").trim().toLowerCase();
    return departments.some((d) =>
      d.name.trim().toLowerCase() === n &&
      (!selectedDepartment || d.id !== selectedDepartment.id)
    );
  };

  const addDepartment = async () => {
    if (!isValid()) return;
    if (isDuplicateName(form.name || "")) {
      setError("Department name must be unique in your organization");
      return;
    }

    setSaving(true);
    setError("");
    try {
      let createdBy: number | undefined = undefined;
      try {
        const session = await apiClient<{ authenticated: boolean; user?: { id: number } }>("/auth/session", { method: "GET" });
        if (session?.authenticated && session?.user?.id) createdBy = session.user.id;
      } catch { }

      const payload = {
        name: (form.name || "").trim(),
        description: (form.description || "").trim() || null,
        status: (form.status as Department["status"]) || "active",
      };

      await apiClient(`/organization/departments`, {
        method: "POST",
        body: { ...payload, created_by: createdBy }
      });

      setShowCreateModal(false);
      setForm({
        name: "",
        description: "",
        status: "active"
      });
      fetchDepartments();
    } catch (e: any) {
      setError(e?.message || "Failed to add department");
    } finally {
      setSaving(false);
    }
  };

  const openView = (department: Department) => {
    setSelectedDepartment(department);
    setShowViewModal(true);
  };

  const openEdit = (department: Department) => {
    setSelectedDepartment(department);
    setForm({
      name: department.name,
      description: department.description || "",
      status: department.status
    });
    setShowEditModal(true);
  };

  const toggleStatus = async (department: Department) => {
    const next = department.status === "inactive" ? "active" : "inactive";
    try {
      setActionLoading(`status-${department.id}`);
      await apiClient(`/organization/departments/${department.id}/status`, {
        method: "PATCH",
        body: { status: next }
      });

      const updated: Department = {
        ...department,
        status: next as "active" | "inactive"
      };

      setDepartments((prev) => prev.map((d) => (d.id === department.id ? updated : d)));
      if (selectedDepartment?.id === department.id) setSelectedDepartment(updated);
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const saveEdit = async () => {
    if (!selectedDepartment) return;
    if (!isValid()) return;
    if (isDuplicateName(form.name || "")) {
      setError("Department name must be unique in your organization");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        name: (form.name || "").trim(),
        description: (form.description || "").trim() || null,
        status: (form.status as Department["status"]) || "active",
      };

      const data = await apiClient<{ department: Department }>(
        `/organization/departments/${selectedDepartment.id}`,
        { method: "PUT", body: payload }
      );

      const updated: Department = data.department;
      setDepartments((prev) => prev.map((d) => (d.id === selectedDepartment.id ? updated : d)));
      setShowEditModal(false);
      setSelectedDepartment(null);
    } catch (e: any) {
      setError(e?.message || "Failed to update department");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return;
    }

    setActionLoading(`delete-${id}`);
    try {
      await apiClient(`/organization/departments/${id}`, { method: "DELETE" });
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      if (selectedDepartment?.id === id) setSelectedDepartment(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete department");
    } finally {
      setActionLoading(null);
    }
  };

  const fetchDepartmentEmployees = async (departmentId: number) => {
    setEmployeesLoading(true);
    try {
      const data = await apiClient<any[]>(`/organization/departments/${departmentId}/employees`, { method: "GET" });
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const openEmployees = async (department: Department) => {
    setSelectedDepartmentForEmployees(department);
    setShowEmployeesModal(true);
    await fetchDepartmentEmployees(department.id);
  };

  // Status colors and icons
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-700 bg-green-50 border border-green-200';
      case 'inactive': return 'text-red-700 bg-red-50 border border-red-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'inactive': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  // Action Dropdown Component
  const ActionDropdown = ({ department }: { department: Department }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [placeUp, setPlaceUp] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);

    React.useEffect(() => {
      if (isOpen) {
        const rect = triggerRef.current?.getBoundingClientRect();
        const spaceBelow = typeof window !== 'undefined' ? (window.innerHeight - (rect?.bottom || 0)) : 0;
        const approxMenuHeight = 200;
        setPlaceUp(spaceBelow < approxMenuHeight + 16);
      }
    }, [isOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen((o) => !o)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
          disabled={actionLoading === `status-${department.id}` || actionLoading === `delete-${department.id}`}
        >
          {actionLoading === `status-${department.id}` || actionLoading === `delete-${department.id}` ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-600" />
          )}
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <div className={`fixed ${placeUp ? 'bottom-auto' : 'top-auto'} w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-[101]`}
              style={{
                left: triggerRef.current ? `${triggerRef.current.getBoundingClientRect().right - 192}px` : '0',
                top: placeUp ? 'auto' : triggerRef.current ? `${triggerRef.current.getBoundingClientRect().bottom + 4}px` : '0',
                bottom: placeUp && triggerRef.current ? `${window.innerHeight - triggerRef.current.getBoundingClientRect().top + 4}px` : 'auto'
              }}
            >
              <div className="py-1">
                {(role !== "Employee" || hasPerm("DEPT_VIEW")) && (
                  <button
                    onClick={() => { openView(department); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}

                {(role !== "Employee" || hasPerm("DEPT_EDIT")) && (
                  <button
                    onClick={() => { openEdit(department); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Department</span>
                  </button>
                )}

                <button
                  onClick={() => { openEmployees(department); setIsOpen(false); }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Users className="w-4 h-4" />
                  <span>View Employees</span>
                </button>

                <div className="border-t border-gray-100 my-1" />

                {(role !== "Employee" || hasPerm("DEPT_EDIT")) && (
                  <button
                    onClick={() => {
                      toggleStatus(department);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${department.status === "inactive"
                      ? "text-green-700 hover:bg-green-50"
                      : "text-red-700 hover:bg-red-50"
                      }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{department.status === "inactive" ? "Activate" : "Deactivate"}</span>
                  </button>
                )}

                {(role !== "Employee" || hasPerm("DEPT_DELETE")) && (
                  <button
                    onClick={() => {
                      confirmDelete(department.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Loading State
  if (loading && departments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize company departments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-4 gap-4 px-6 py-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 px-6 py-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-48"></div>
                <div className="h-5 bg-gray-200 rounded w-24"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (role === "Employee" && !hasPerm("DEPT_VIEW")) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize company departments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view departments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render Modals */}
      {/* View Department Modal */}
      {showViewModal && selectedDepartment && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Department Details</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Department Name</h4>
                    <p className="text-lg font-medium mt-1">{selectedDepartment.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div className="mt-1 flex items-center space-x-2">
                      {getStatusIcon(selectedDepartment.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDepartment.status)} capitalize`}>
                        {selectedDepartment.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="mt-1 text-gray-900">
                    {selectedDepartment.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Created</h4>
                    <p className="mt-1 text-gray-900">
                      {selectedDepartment.created_at
                        ? new Date(selectedDepartment.created_at).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Last Updated</h4>
                    <p className="mt-1 text-gray-900">
                      {selectedDepartment.updated_at
                        ? new Date(selectedDepartment.updated_at).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>

                {selectedDepartment.employee_count !== undefined && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Employees</h4>
                    <p className="mt-1 text-gray-900">
                      {selectedDepartment.employee_count} employee(s) in this department
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {(role !== "Employee" || hasPerm("DEPT_EDIT")) && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEdit(selectedDepartment);
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Edit Department
                </button>
              )}
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && selectedDepartment && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit Department</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <DepartmentFormFields
                form={form}
                onChange={onChange}
                idPrefix="edit"
              />
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={!isValid() || saving}
                className={`px-4 py-2 rounded-lg transition-colors ${isValid() && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New Department</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <DepartmentFormFields
                form={form}
                onChange={onChange}
                idPrefix="create"
              />
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addDepartment}
                disabled={!isValid() || saving}
                className={`px-4 py-2 rounded-lg transition-colors ${isValid() && !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
              >
                {saving ? 'Saving...' : 'Add Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees Modal */}
      {showEmployeesModal && selectedDepartmentForEmployees && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Employees in {selectedDepartmentForEmployees.name}
                </h3>
                <button
                  onClick={() => {
                    setShowEmployeesModal(false);
                    setSelectedDepartmentForEmployees(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {employeesLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
                  <p className="text-gray-500">Loading employees...</p>
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No employees in this department</p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-3">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {employee.email || ''}
                            {employee.phone_number ? ` · ${employee.phone_number}` : ''}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.position || 'Employee'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowEmployeesModal(false);
                  setSelectedDepartmentForEmployees(null);
                }}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Department Management</h1>
            <p className="text-sm text-gray-600 mt-0.5">{totalItems} departments found</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {(role !== "Employee" || hasPerm("DEPT_ADD")) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Department</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <div className="flex items-center space-x-2">
                <button
                  onClick={applyFilters}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Apply
                </button>
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex-1"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {departments.map((department) => (
                <tr key={department.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{department.name}</div>
                      {department.employee_count !== undefined && (
                        <div className="text-xs text-gray-500">
                          {department.employee_count} employee(s)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-600 truncate max-w-xs">
                      {department.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1.5">
                      {getStatusIcon(department.status)}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(department.status)} capitalize`}>
                        {department.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ActionDropdown department={department} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {departments.length === 0 && !loading && (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No departments found</h3>
            <p className="text-xs text-gray-500 mb-3">No departments match your current filters.</p>
            {(role !== "Employee" || hasPerm("DEPT_ADD")) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Add First Department</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-3">
          <div className="text-xs text-gray-600">
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span> of <span className="font-medium">{totalItems}</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-600">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
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
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <div className="flex items-center space-x-1">
                {(() => {
                  const pages = [];
                  const maxVisible = 5;
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                  if (endPage - startPage + 1 < maxVisible) {
                    startPage = Math.max(1, endPage - maxVisible + 1);
                  }
                  if (startPage > 1) {
                    pages.push(
                      <button
                        key={1}
                        onClick={() => setCurrentPage(1)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === 1
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        1
                      </button>
                    );
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis1" className="px-1 text-gray-500">...</span>
                      );
                    }
                  }
                  for (let page = startPage; page <= endPage; page++) {
                    pages.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis2" className="px-1 text-gray-500">...</span>
                      );
                    }
                    pages.push(
                      <button
                        key={totalPages}
                        onClick={() => setCurrentPage(totalPages)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${currentPage === totalPages
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
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
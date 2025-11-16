"use client";

import React from "react";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/apiClient";
import { 
  Edit2, 
  Trash2, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Search, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  MoreVertical,
  RefreshCw,
  Building2,
  Users,
  Filter
} from "lucide-react";

export type Department = {
  id: number;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
  created_by?: number | null;
  created_at?: string;
  updated_at?: string | null;
};

export default function DepartmentsManager() {
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  
  // Filters
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = React.useState<boolean>(false);
  const [showViewModal, setShowViewModal] = React.useState<boolean>(false);
  const [showEditModal, setShowEditModal] = React.useState<boolean>(false);
  
  // Form and state
  const [saving, setSaving] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<Department>>({ 
    name: "", 
    description: "", 
    status: "active" 
  });

  const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  // Permissions
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

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
        pages: number 
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
      } catch (_) {}
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

  const resetForm = () => setForm({ name: "", description: "", status: "active" });

  const openAdd = () => {
    resetForm();
    setSelectedDepartment(null);
    setShowCreateModal(true);
  };

  const openEdit = (dept: Department) => {
    setSelectedDepartment(dept);
    setForm({ 
      name: dept.name, 
      description: dept.description || "", 
      status: dept.status 
    });
    setShowEditModal(true);
  };

  const openView = (dept: Department) => {
    setSelectedDepartment(dept);
    setShowViewModal(true);
  };

  const isDuplicateName = (name: string) => {
    const n = String(name || "").trim().toLowerCase();
    return departments.some((d) => 
      d.name.trim().toLowerCase() === n && 
      (!selectedDepartment || d.id !== selectedDepartment.id)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = String(form.name || "").trim();
    if (!name) return setError("Department name is required");
    if (isDuplicateName(name)) return setError("Department name must be unique in your organization");

    setSaving(true);
    setError("");
    try {
      let createdBy: number | undefined = undefined;
      try {
        const session = await apiClient<{ authenticated: boolean; user?: { id: number } }>("/auth/session", { method: "GET" });
        if (session?.authenticated && session?.user?.id) createdBy = session.user.id;
      } catch {}

      if (selectedDepartment) {
        await apiClient(`/organization/departments/${selectedDepartment.id}`, {
          method: "PUT",
          body: { 
            name, 
            description: form.description || "", 
            status: form.status || "active" 
          },
        });
      } else {
        await apiClient(`/organization/departments`, {
          method: "POST",
          body: { 
            name, 
            description: form.description || "", 
            status: form.status || "active", 
            created_by: createdBy 
          },
        });
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      resetForm();
      setSelectedDepartment(null);
      await fetchDepartments();
    } catch (e: any) {
      setError(e?.message || "Failed to save department");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (dept: Department) => {
    const next = dept.status === "active" ? "inactive" : "active";
    try {
      setActionLoading(`status-${dept.id}`);
      await apiClient(`/organization/departments/${dept.id}/status`, { 
        method: "PATCH", 
        body: { status: next } 
      });
      setDepartments((prev) => 
        prev.map((d) => d.id === dept.id ? { ...d, status: next } : d)
      );
      if (selectedDepartment?.id === dept.id) {
        setSelectedDepartment({ ...selectedDepartment, status: next });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return;
    }
    
    setDeletingId(id);
    try {
      await apiClient(`/organization/departments/${id}`, { method: "DELETE" });
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setError(e?.message || "Failed to delete department");
    } finally {
      setDeletingId(null);
    }
  };

  // Status colors and icons
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
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
    const dropdownRef = React.useRef<HTMLDivElement>(null);

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

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          disabled={actionLoading === `status-${department.id}` || deletingId === department.id}
        >
          {actionLoading === `status-${department.id}` || deletingId === department.id ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
          ) : (
            <MoreVertical className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="py-1">
                {(role !== "Employee" || hasPerm("DEPT_VIEW")) && (
                  <button
                    onClick={() => { 
                      openView(department); 
                      setIsOpen(false); 
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}
                
                {(role !== "Employee" || hasPerm("DEPT_EDIT")) && (
                  <button
                    onClick={() => { 
                      openEdit(department); 
                      setIsOpen(false); 
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Department</span>
                  </button>
                )}
                
                <div className="border-t border-gray-100 my-1" />
                
                {(role !== "Employee" || hasPerm("DEPT_DELETE")) && (
                  <button
                    onClick={() => {
                      toggleStatus(department);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${
                      department.status === "inactive" 
                        ? "text-green-700 hover:bg-green-50" 
                        : "text-red-700 hover:bg-red-50"
                    }`}
                  >
                    {department.status === "active" ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
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
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize company departments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (role === "Employee" && !hasPerm("DEPT_VIEW")) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
            <p className="text-gray-600 mt-1">Manage and organize company departments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view departments.</p>
        </div>
      </div>
    );
  }

  // View Department Modal
  const ViewDepartmentModal = () => {
    if (!showViewModal || !selectedDepartment) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
          
          <div className="p-6 overflow-y-auto max-h-96">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Department Name</h4>
                <p className="text-lg font-medium mt-1">{selectedDepartment.name}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Description</h4>
                <p className="mt-1 text-gray-900">
                  {selectedDepartment.description || 'No description provided'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Status</h4>
                  <div className="mt-1 flex items-center space-x-2">
                    {getStatusIcon(selectedDepartment.status)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDepartment.status)} capitalize`}>
                      {selectedDepartment.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created</h4>
                  <p className="mt-1 text-gray-900">
                    {selectedDepartment.created_at 
                      ? new Date(selectedDepartment.created_at).toLocaleDateString() 
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowViewModal(false);
                openEdit(selectedDepartment);
              }}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit Department
            </button>
            <button
              onClick={() => setShowViewModal(false)}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Edit Department Modal
  const EditDepartmentModal = () => {
    if (!showEditModal || !selectedDepartment) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
          
          <div className="p-6 overflow-y-auto max-h-96">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., HR, Site Ops, Admin"
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Unique within organization.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional notes about the department"
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                  value={form.status || "active"}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Department["status"] }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Active departments can be used for assignments.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Create Department Modal
  const CreateDepartmentModal = () => {
    if (!showCreateModal) return null;
    
    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
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
          
          <div className="p-6 overflow-y-auto max-h-96">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., HR, Site Ops, Admin"
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Unique within organization.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional notes about the department"
                  value={form.description || ""}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
                  value={form.status || "active"}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Department["status"] }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">Active departments can be used for assignments.</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </form>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !saving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
            >
              {saving ? 'Saving...' : 'Add Department'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Render Modals */}
      <ViewDepartmentModal />
      <EditDepartmentModal />
      <CreateDepartmentModal />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-600 mt-1">Manage and organize company departments</p>
        </div>
        {(role !== "Employee" || hasPerm("DEPT_ADD")) && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex-1"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {departments.map((department) => (
                <tr key={department.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{department.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 line-clamp-2">
                      {department.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(department.status)}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(department.status)} capitalize`}>
                        {department.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <ActionDropdown department={department} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {departments.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No departments found</h3>
            <p className="text-gray-500 mb-4">No departments match your current filters.</p>
            {(role !== "Employee" || hasPerm("DEPT_ADD")) && (
              <button 
                onClick={openAdd}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto">
                <Plus className="w-4 h-4" />
                <span>Add First Department</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} departments
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
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
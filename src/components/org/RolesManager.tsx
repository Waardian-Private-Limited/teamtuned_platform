"use client";

import React from "react";
import {
  Eye,
  Pencil,
  Power,
  Users,
  Shield,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreVertical,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight as ChevronRightIcon,
  CheckSquare,
  Square,
  Building2
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

import { useAuth } from "@/context/AuthContext";
export type Department = { id: number; name: string };
export type PermissionCategory = { id: number; feature_id: number; code: string; name: string; sort_order?: number };
export type Permission = { id: number; category_id: number; code: string; name: string; description?: string };

export type Role = {
  id: number;
  name: string;
  department_id: number;
  description?: string | null;
  status: "active" | "inactive";
  is_system_role?: boolean;
  permissions?: string[];
  created_by?: number | null;
  created_at?: string;
  updated_at?: string | null;
  employee_count?: number;
};

export default function RolesManager() {
  const { role, permissions, user, organization, employee } = useAuth();
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [categories, setCategories] = React.useState<PermissionCategory[]>([]);
  const [permissionsByCat, setPermissionsByCat] = React.useState<Record<number, Permission[]>>({});
  const [catOpen, setCatOpen] = React.useState<Record<number, boolean>>({});

  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");

  // Filters & UI State
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = React.useState<number>(0);
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
  const modalScrollRef = React.useRef<HTMLDivElement | null>(null);
  const modalScrollTopRef = React.useRef<number>(0);

  // Form and state
  const [saving, setSaving] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<Partial<Role>>({
    name: "",
    department_id: 0,
    description: "",
    status: "active"
  });
  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [wizardStep, setWizardStep] = React.useState<number>(1);
  const [formErrors, setFormErrors] = React.useState<{ name?: string; department_id?: string }>({});

  // Permissions
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  React.useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole(session.role || null);
          // setPermissions(session.employee?.permissions || []);
        }
      } catch (_) { }
    })();
  }, []);

  const resetForm = () => {
    setForm({ name: "", department_id: 0, description: "", status: "active" });
    setSelectedPerms(new Set());
    setWizardStep(1);
    setFormErrors({});
  };

  const openAdd = () => {
    resetForm();
    setSelectedRole(null);
    setWizardStep(1);
    setShowCreateModal(true);
  };

  const openEdit = (roleItem: Role) => {
    setSelectedRole(roleItem);
    setForm({
      name: roleItem.name,
      department_id: roleItem.department_id,
      description: roleItem.description || "",
      status: roleItem.status
    });
    setSelectedPerms(new Set(roleItem.permissions || []));
    setWizardStep(1);
    setShowEditModal(true);
  };

  const openView = (roleItem: Role) => {
    setSelectedRole(roleItem);
    setShowViewModal(true);
  };

  // // const { role, permissions, user, organization, employee } = useAuth();



  const fetchDepartments = async () => {
    if (role === "Employee" && !hasPerm("ROLE_VIEW")) return;
    try {
      const data = await apiClient<Department[]>("/organization/departments", { method: "GET" });
      setDepartments(Array.isArray(data) ? data : []);
    } catch { }
  };

  const fetchPermissions = async () => {
    if (role === "Employee" && !hasPerm("ROLE_VIEW")) return;
    try {
      const cats = await apiClient<PermissionCategory[]>("/organization/permission-categories", { method: "GET" });
      const perms = await apiClient<Permission[]>("/organization/permissions", { method: "GET" });
      const catMap: Record<number, Permission[]> = {};
      (Array.isArray(perms) ? perms : []).forEach((p) => {
        catMap[p.category_id] = catMap[p.category_id] || [];
        catMap[p.category_id].push(p);
      });
      const sortedCats = (Array.isArray(cats) ? cats : []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      setCategories(sortedCats);
      setPermissionsByCat(catMap);
      const openMap: Record<number, boolean> = {};
      sortedCats.forEach((c) => (openMap[c.id] = true));
      setCatOpen(openMap);
    } catch { }
  };

  const fetchRoles = async () => {
    if (role === "Employee" && !hasPerm("ROLE_VIEW")) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (departmentFilter) params.department_id = String(departmentFilter);
      params.page = String(currentPage);
      params.pageSize = String(pageSize);

      const data = await apiClient<any>("/organization/roles", { method: "GET", params });
      if (Array.isArray(data)) {
        setRoles(data as Role[]);
        setTotalItems((data as Role[]).length || 0);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        const list: Role[] = Array.isArray(data.roles) ? data.roles : [];
        setRoles(list);
        setTotalItems(Number(data.total || list.length || 0));
        setTotalPages(Number(data.pages || 0));
        if (typeof data.page === "number") setCurrentPage(data.page);
        if (typeof data.pageSize === "number") setPageSize(data.pageSize);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (role === null) return;
    if (role === "Employee" && !hasPerm("ROLE_VIEW")) {
      setLoading(false);
      return;
    }
    fetchDepartments();
    fetchPermissions();
    fetchRoles();
  }, [role, permissions]);

  // Re-fetch for pagination changes
  React.useEffect(() => {
    if (!role || (role === "Employee" && !hasPerm("ROLE_VIEW"))) return;
    fetchRoles();
  }, [currentPage, pageSize]);

  // Debounced search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!role || (role === "Employee" && !hasPerm("ROLE_VIEW"))) return;
      setCurrentPage(1);
      fetchRoles();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const applyFilters = () => {
    setCurrentPage(1);
    fetchRoles();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDepartmentFilter(0);
    setCurrentPage(1);
    fetchRoles();
  };

  const toggleCat = (id: number) => {
    const el = modalScrollRef.current;
    const top = el ? el.scrollTop : 0;
    modalScrollTopRef.current = top;
    setCatOpen((m) => ({ ...m, [id]: !m[id] }));
    requestAnimationFrame(() => { if (el) el.scrollTop = modalScrollTopRef.current; });
  };

  const togglePerm = (code: string) => {
    const el = modalScrollRef.current;
    const top = el ? el.scrollTop : 0;
    modalScrollTopRef.current = top;
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    requestAnimationFrame(() => { if (el) el.scrollTop = modalScrollTopRef.current; });
  };

  const togglePermsInCat = (categoryId: number, selectAll: boolean) => {
    const el = modalScrollRef.current;
    const top = el ? el.scrollTop : 0;
    modalScrollTopRef.current = top;
    const perms = permissionsByCat[categoryId] || [];
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      perms.forEach((p) => {
        if (selectAll) next.add(p.code);
        else next.delete(p.code);
      });
      return next;
    });
    requestAnimationFrame(() => { if (el) el.scrollTop = modalScrollTopRef.current; });
  };

  React.useLayoutEffect(() => {
    const el = modalScrollRef.current;
    if (el) el.scrollTop = modalScrollTopRef.current;
  }, [selectedPerms, catOpen, showEditModal, showCreateModal]);

  const validateStep1 = () => {
    const errs: { name?: string; department_id?: string } = {};
    const name = String(form.name || "").trim();
    const deptId = Number(form.department_id || 0);
    if (!name) errs.name = "Role name is required";
    if (!deptId) errs.department_id = "Department is required";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep1()) setWizardStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = String(form.name || "").trim();
    const deptId = Number(form.department_id || 0);
    const errs: { name?: string; department_id?: string } = {};
    if (!name) errs.name = "Role name is required";
    if (!deptId) errs.department_id = "Department is required";
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      setWizardStep(1);
      return;
    }

    setSaving(true);
    try {
      let createdBy: number | undefined = undefined;
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, user: user, employee: { permissions } };
        if (session?.authenticated && session?.user?.id) createdBy = session.user.id;
      } catch { }

      const payload = {
        name,
        department_id: deptId,
        description: form.description || "",
        status: form.status || "active",
        permissions: Array.from(selectedPerms),
        created_by: createdBy,
      };

      if (selectedRole) {
        await apiClient(`/organization/roles/${selectedRole.id}`, { method: "PUT", body: payload });
      } else {
        await apiClient(`/organization/roles`, { method: "POST", body: payload });
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      resetForm();
      setSelectedRole(null);
      await fetchRoles();
    } catch (e: any) {
      console.error("Failed to save role", e);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (roleItem: Role) => {
    const next = roleItem.status === "active" ? "inactive" : "active";
    try {
      setActionLoading(`status-${roleItem.id}`);
      await apiClient(`/organization/roles/${roleItem.id}/status`, {
        method: "PATCH",
        body: { status: next }
      });

      const updated: Role = {
        ...roleItem,
        status: next as "active" | "inactive"
      };

      setRoles((prev) => prev.map((r) => (r.id === roleItem.id ? updated : r)));
      if (selectedRole?.id === roleItem.id) setSelectedRole(updated);
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }

    setActionLoading(`delete-${id}`);
    try {
      await apiClient(`/organization/roles/${id}`, { method: "DELETE" });
      setRoles((prev) => prev.filter((r) => r.id !== id));
      if (selectedRole?.id === id) setSelectedRole(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete role");
    } finally {
      setActionLoading(null);
    }
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
  const ActionDropdown = ({ role: itemRole }: { role: Role }) => {
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
          disabled={actionLoading === `status-${itemRole.id}` || actionLoading === `delete-${itemRole.id}`}
        >
          {actionLoading === `status-${itemRole.id}` || actionLoading === `delete-${itemRole.id}` ? (
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
                {(role !== "Employee" || hasPerm("ROLE_VIEW")) && (
                  <button
                    onClick={() => { openView(itemRole); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}

                {(role !== "Employee" || hasPerm("ROLE_EDIT")) && (
                  <button
                    onClick={() => { openEdit(itemRole); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Role</span>
                  </button>
                )}

                <div className="border-t border-gray-100 my-1" />

                {(role !== "Employee" || hasPerm("ROLE_EDIT")) && (
                  <button
                    onClick={() => {
                      toggleStatus(itemRole);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${itemRole.status === "inactive"
                      ? "text-green-700 hover:bg-green-50"
                      : "text-red-700 hover:bg-red-50"
                      }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{itemRole.status === "inactive" ? "Activate" : "Deactivate"}</span>
                  </button>
                )}

                {(role !== "Employee" || hasPerm("ROLE_DELETE")) && (
                  <button
                    onClick={() => {
                      confirmDelete(itemRole.id);
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
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
  if (loading && roles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
            <p className="text-sm text-gray-600 mt-0.5">Manage roles and permissions across departments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-0 overflow-hidden">
          <div className="bg-gray-50">
            <div className="grid grid-cols-5 gap-4 px-4 py-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 px-4 py-3 animate-pulse">
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
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
  if (role === "Employee" && !hasPerm("ROLE_VIEW")) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage roles and permissions across departments</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render Modals */}
      {/* View Role Modal */}
      {showViewModal && selectedRole && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Role Details</h3>
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
                    <h4 className="text-sm font-medium text-gray-500">Role Name</h4>
                    <p className="text-lg font-medium mt-1">{selectedRole.name}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Department</h4>
                    <p className="mt-1 text-gray-900">
                      {departments.find((d) => d.id === selectedRole.department_id)?.name || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="mt-1 text-gray-900">
                    {selectedRole.description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <div className="mt-1 flex items-center space-x-2">
                      {getStatusIcon(selectedRole.status)}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedRole.status)} capitalize`}>
                        {selectedRole.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Permissions</h4>
                    <p className="mt-1 text-gray-900">
                      {(selectedRole.permissions || []).length} assigned
                    </p>
                  </div>

                  {selectedRole.employee_count !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Employees</h4>
                      <p className="mt-1 text-gray-900">
                        {selectedRole.employee_count} assigned
                      </p>
                    </div>
                  )}
                </div>

                {selectedRole.permissions && selectedRole.permissions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Assigned Permissions</h4>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedRole.permissions.map((permCode) => {
                          let permName = permCode;
                          categories.forEach((cat) => {
                            const perms = permissionsByCat[cat.id] || [];
                            const perm = perms.find((p) => p.code === permCode);
                            if (perm) permName = perm.name;
                          });
                          return (
                            <div key={permCode} className="text-sm text-gray-700 p-2 bg-gray-50 rounded">
                              {permName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {(role !== "Employee" || hasPerm("ROLE_EDIT")) && (
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEdit(selectedRole);
                  }}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Edit Role
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

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Edit Role</h3>
                <div className="text-sm text-gray-500">Step {wizardStep} of 2</div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1" ref={modalScrollRef}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {wizardStep === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role Name<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="e.g., HR Manager, Site Incharge"
                          value={form.name || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => ({ ...f, name: val }));
                            setFormErrors((errs) => (errs.name ? { ...errs, name: undefined } : errs));
                          }}
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Clear, descriptive role titles help mapping.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department<span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.department_id ? 'border-red-500' : 'border-gray-300'
                            }`}
                          value={form.department_id || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm((f) => ({ ...f, department_id: val }));
                            setFormErrors((errs) => (errs.department_id ? { ...errs, department_id: undefined } : errs));
                          }}
                        >
                          <option value={0}>Select department…</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        {formErrors.department_id && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.department_id}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Choose the logical group (e.g., HR, Site Ops).</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional notes about role"
                        value={form.description || ""}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                      />
                      <p className="mt-1 text-xs text-gray-500">Optional context for what this role does.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.status || "active"}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Role["status"] }))}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Inactive roles are disabled for assignment.</p>
                    </div>
                  </>
                )}

                {wizardStep === 2 && (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
                        <span className="text-sm text-gray-500">
                          {selectedPerms.size} permissions selected
                        </span>
                      </div>

                      <div className="space-y-3">
                        {categories.map((cat) => {
                          const perms = permissionsByCat[cat.id] || [];
                          const selectedCount = perms.filter((p) => selectedPerms.has(p.code)).length;
                          const allSelected = selectedCount === perms.length && perms.length > 0;

                          return (
                            <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div
                                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={() => toggleCat(cat.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  {catOpen[cat.id] ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                  )}
                                  <span className="font-medium text-gray-900">{cat.name}</span>
                                  <span className="text-sm text-gray-500">
                                    ({selectedCount}/{perms.length} selected)
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); togglePermsInCat(cat.id, true); }}
                                  >
                                    Select All
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); togglePermsInCat(cat.id, false); }}
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>

                              {catOpen[cat.id] && (
                                <div className="p-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {perms.map((perm) => (
                                      <label
                                        key={perm.code}
                                        className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => togglePerm(perm.code)}
                                          className="mt-0.5 flex-shrink-0"
                                        >
                                          {selectedPerms.has(perm.code) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                          ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-gray-900">
                                            {perm.name}
                                          </div>
                                          {perm.description && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {perm.description}
                                            </div>
                                          )}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {wizardStep === 1 ? (
                <>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={goNext}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg transition-colors ${!saving
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Add New Role</h3>
                <div className="text-sm text-gray-500">Step {wizardStep} of 2</div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1" ref={modalScrollRef}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {wizardStep === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role Name<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="e.g., HR Manager, Site Incharge"
                          value={form.name || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((f) => ({ ...f, name: val }));
                            setFormErrors((errs) => (errs.name ? { ...errs, name: undefined } : errs));
                          }}
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Clear, descriptive role titles help mapping.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department<span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.department_id ? 'border-red-500' : 'border-gray-300'
                            }`}
                          value={form.department_id || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setForm((f) => ({ ...f, department_id: val }));
                            setFormErrors((errs) => (errs.department_id ? { ...errs, department_id: undefined } : errs));
                          }}
                        >
                          <option value={0}>Select department…</option>
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        {formErrors.department_id && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.department_id}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Choose the logical group (e.g., HR, Site Ops).</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Optional notes about role"
                        value={form.description || ""}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                      />
                      <p className="mt-1 text-xs text-gray-500">Optional context for what this role does.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={form.status || "active"}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Role["status"] }))}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Inactive roles are disabled for assignment.</p>
                    </div>
                  </>
                )}

                {wizardStep === 2 && (
                  <>
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Permissions</h3>
                        <span className="text-sm text-gray-500">
                          {selectedPerms.size} permissions selected
                        </span>
                      </div>

                      <div className="space-y-3">
                        {categories.map((cat) => {
                          const perms = permissionsByCat[cat.id] || [];
                          const selectedCount = perms.filter((p) => selectedPerms.has(p.code)).length;

                          return (
                            <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div
                                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                                onClick={() => toggleCat(cat.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  {catOpen[cat.id] ? (
                                    <ChevronDown className="w-4 h-4 text-gray-600" />
                                  ) : (
                                    <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                                  )}
                                  <span className="font-medium text-gray-900">{cat.name}</span>
                                  <span className="text-sm text-gray-500">
                                    ({selectedCount}/{perms.length} selected)
                                  </span>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); togglePermsInCat(cat.id, true); }}
                                  >
                                    Select All
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-200 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); togglePermsInCat(cat.id, false); }}
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>

                              {catOpen[cat.id] && (
                                <div className="p-4 bg-white">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {perms.map((perm) => (
                                      <label
                                        key={perm.code}
                                        className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => togglePerm(perm.code)}
                                          className="mt-0.5 flex-shrink-0"
                                        >
                                          {selectedPerms.has(perm.code) ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                          ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                          )}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium text-gray-900">
                                            {perm.name}
                                          </div>
                                          {perm.description && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {perm.description}
                                            </div>
                                          )}
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {wizardStep === 1 ? (
                <>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={goNext}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className={`px-4 py-2 rounded-lg transition-colors ${!saving
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      }`}
                  >
                    {saving ? 'Saving...' : 'Add Role'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Role Management</h1>
            <p className="text-sm text-gray-600 mt-0.5">{totalItems} roles found</p>
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
            {(role !== "Employee" || hasPerm("ROLE_ADD")) && (
              <button
                onClick={openAdd}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Role</span>
              </button>
            )}
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
                  placeholder="Search roles..."
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

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value={0}>All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
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

      {/* Roles Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {roles.map((roleItem) => (
                <tr key={roleItem.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{roleItem.name}</div>
                      {roleItem.description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{roleItem.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {departments.find((d) => d.id === roleItem.department_id)?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1.5">
                      {getStatusIcon(roleItem.status)}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(roleItem.status)} capitalize`}>
                        {roleItem.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {(roleItem.permissions || []).length} permissions
                    </div>
                    {roleItem.employee_count !== undefined && (
                      <div className="text-xs text-gray-500">
                        {roleItem.employee_count} employee(s)
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ActionDropdown role={roleItem} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {roles.length === 0 && !loading && (
          <div className="text-center py-8">
            <Shield className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No roles found</h3>
            <p className="text-xs text-gray-500 mb-3">No roles match your current filters.</p>
            {(role !== "Employee" || hasPerm("ROLE_ADD")) && (
              <button
                onClick={openAdd}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Add First Role</span>
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
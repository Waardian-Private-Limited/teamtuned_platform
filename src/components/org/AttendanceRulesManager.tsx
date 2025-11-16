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
  ChevronDown, 
  ChevronRight, 
  CheckSquare, 
  Square, 
  Search, 
  X, 
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  MoreVertical,
  RefreshCw,
  Users,
  Shield,
  Filter
} from "lucide-react";

export type AttendancePolicy = {
  id?: number;
  policy_name: string;
  policy_description: string;
  leave_cycle: "monthly" | "yearly";
  // New payroll fields
  salary_payment_cycle?: "monthly" | "biweekly" | "weekly";
  salary_date_day?: number; // 1-31
  payment_cycle_start?: number; // 1-31
  payment_cycle_end?: number; // 1-31

  grace_period_minutes: number;
  max_late_marks_per_month: number;
  late_mark_penalty: "none" | "half_day" | "full_day";
  standard_work_hours: number;
  allow_early_login: boolean;
  early_login_minutes: number;
  dont_allow_checkin_after_minutes: number;
  late_logout_redeem_minutes: number;
  redeem_nextday_allowed: boolean;
  redeem_carry_forward_days: number;
  auto_convert_to_compoff: boolean;
  min_extra_work_for_compoff_minutes: number;
  compoff_requires_approval: boolean;

  // New fields
  allow_full_day_if_late_checkin: boolean;
  half_day_threshold_percent: number;
  late_threshold_for_halfday_minutes: number;

  total_annual_leaves: number;
  max_leave_per_month: number;
  max_carry_forward_leaves: number;
  monthly_carry_forward_allowed: boolean;
  leave_breakdown: { type: string; allocation: number }[];
};

const defaultPolicy: AttendancePolicy = {
  policy_name: "Default Policy",
  policy_description: "",
  leave_cycle: "yearly",
  salary_payment_cycle: "monthly",
  salary_date_day: 1,
  payment_cycle_start: undefined,
  payment_cycle_end: undefined,

  grace_period_minutes: 10,
  max_late_marks_per_month: 3,
  late_mark_penalty: "none",
  standard_work_hours: 480,
  allow_early_login: true,
  early_login_minutes: 30,
  dont_allow_checkin_after_minutes: 15,
  late_logout_redeem_minutes: 120,
  redeem_nextday_allowed: true,
  redeem_carry_forward_days: 1,
  auto_convert_to_compoff: true,
  min_extra_work_for_compoff_minutes: 240,
  compoff_requires_approval: true,

  // New defaults
  allow_full_day_if_late_checkin: false,
  half_day_threshold_percent: 50,
  late_threshold_for_halfday_minutes: 48,

  total_annual_leaves: 18,
  max_leave_per_month: 2,
  max_carry_forward_leaves: 12,
  monthly_carry_forward_allowed: false,
  leave_breakdown: [
    { type: "Paid Leave", allocation: 18 },
  ],
};

export default function AttendanceRulesManager() {
  // Permissions
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  // Helper function to convert minutes to hours for display
  const formatMinutesToHours = (minutes: number): string => {
    if (minutes === 0) return "0 hours";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} minutes`;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  };

  const [policies, setPolicies] = React.useState<AttendancePolicy[]>([]);
  const [policy, setPolicy] = React.useState<AttendancePolicy>(defaultPolicy);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [saving, setSaving] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [success, setSuccess] = React.useState<string>("");
  const [showModal, setShowModal] = React.useState<boolean>(false);
  const [step, setStep] = React.useState<number>(1);
  const [errors, setErrors] = React.useState<Partial<Record<keyof AttendancePolicy, string>>>({});
  const [showViewModal, setShowViewModal] = React.useState<boolean>(false);
  const [viewPolicy, setViewPolicy] = React.useState<AttendancePolicy | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState<boolean>(false);
  const [policyToDelete, setPolicyToDelete] = React.useState<AttendancePolicy | null>(null);

  // Filters & pagination (RolesManager-style)
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [cycleFilter, setCycleFilter] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  // Action loading states
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);

  const fetchPolicies = async () => {
    if (role === "Employee" && !hasPerm("POLICY_VIEW")) { 
      setLoading(false); 
      return; 
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const params: Record<string, string> = {};
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (cycleFilter) params.cycle = cycleFilter;
      params.page = String(currentPage);
      params.pageSize = String(pageSize);
      const data = await apiClient<any>("/attendance/policies", { method: "GET", params });
      if (Array.isArray(data)) {
        // Legacy response
        setPolicies(data as AttendancePolicy[]);
        setTotalItems((data as AttendancePolicy[]).length || 0);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        const list = Array.isArray(data.policies) ? data.policies : [];
        setPolicies(list);
        setTotalItems(Number(data.total || list.length || 0));
        setTotalPages(Number(data.pages || 0));
        if (typeof data.page === "number") setCurrentPage(data.page);
        if (typeof data.pageSize === "number") setPageSize(data.pageSize);
      }
      // no auto-select; table shows list
    } catch (e: any) {
      setError(e?.message || "Failed to load policies");
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
    fetchPolicies();
  }, []);

  // Re-fetch for pagination changes
  React.useEffect(() => {
    if (!role || (role === "Employee" && !hasPerm("POLICY_VIEW"))) return;
    fetchPolicies();
  }, [currentPage, pageSize, searchTerm, statusFilter, cycleFilter]);

  const setField = (key: keyof AttendancePolicy, value: any) => {
    setPolicy((prev: AttendancePolicy) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const validateStep1 = () => {
    const errs: Partial<Record<keyof AttendancePolicy, string>> = {};
    if (!policy.policy_name?.trim()) errs.policy_name = "Required";
    if (!policy.policy_description?.trim()) errs.policy_description = "Required";
    if (!policy.leave_cycle) errs.leave_cycle = "Required";
    if (!policy.salary_payment_cycle) errs.salary_payment_cycle = "Required";
    const day = Number(policy.salary_date_day);
    if (!Number.isFinite(day) || day < 1 || day > 31) errs.salary_date_day = "Enter a day between 1 and 31";
    // For weekly/biweekly cycles, require start and end days (1–31)
    if (policy.salary_payment_cycle && ["weekly","biweekly"].includes(policy.salary_payment_cycle)) {
      const s = Number(policy.payment_cycle_start);
      const e = Number(policy.payment_cycle_end);
      if (!Number.isFinite(s) || s < 1 || s > 31) errs.payment_cycle_start = "Enter a day between 1 and 31";
      if (!Number.isFinite(e) || e < 1 || e > 31) errs.payment_cycle_end = "Enter a day between 1 and 31";
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };
  const validateStep2 = () => {
    const errs: Partial<Record<keyof AttendancePolicy, string>> = {};
    if (policy.leave_cycle === "monthly") {
      if (!(policy.max_leave_per_month > 0)) errs.max_leave_per_month = "Enter a positive number";
      if (policy.monthly_carry_forward_allowed) {
        if (policy.max_carry_forward_leaves === undefined || policy.max_carry_forward_leaves < 0) {
          errs.max_carry_forward_leaves = "Enter 0 or more";
        } else if (policy.max_carry_forward_leaves > policy.max_leave_per_month) {
          errs.max_carry_forward_leaves = "Cannot exceed leaves per month";
        }
      }
    } else {
      if (!(policy.total_annual_leaves > 0)) errs.total_annual_leaves = "Enter a positive number";
      if (!(policy.max_leave_per_month > 0)) errs.max_leave_per_month = "Enter a positive number";
      // yearly carry forward is a yes/no: we map to max_carry_forward_leaves > 0
      if (policy.max_carry_forward_leaves === undefined || policy.max_carry_forward_leaves < 0) {
        errs.max_carry_forward_leaves = "Internal carry-forward must be 0 or more";
      }
    }
    const expected = policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves;
    const actual = (policy.leave_breakdown || []).reduce((a, b) => a + (Number(b.allocation) || 0), 0);
    if (!(policy.leave_breakdown || []).length) {
      errs.leave_breakdown = "Add at least one leave type";
    } else if (expected !== actual) {
      errs.leave_breakdown = `Breakdown total (${actual}) must equal expected (${expected})`;
    }
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };
  const validateStep3 = () => {
    const errs: Partial<Record<keyof AttendancePolicy, string>> = {};
    if (!(policy.standard_work_hours > 0)) errs.standard_work_hours = "Enter a positive number";
    if (policy.grace_period_minutes < 0) errs.grace_period_minutes = "Enter 0 or more";
    if (policy.max_late_marks_per_month < 0) errs.max_late_marks_per_month = "Enter 0 or more";
    if (policy.late_logout_redeem_minutes < 0) errs.late_logout_redeem_minutes = "Enter 0 or more";
    if (policy.redeem_carry_forward_days < 0) errs.redeem_carry_forward_days = "Enter 0 or more";
    if (policy.min_extra_work_for_compoff_minutes < 0) errs.min_extra_work_for_compoff_minutes = "Enter 0 or more";
    if (policy.allow_early_login && policy.early_login_minutes < 0) errs.early_login_minutes = "Enter 0 or more";
    if (policy.dont_allow_checkin_after_minutes < 0) errs.dont_allow_checkin_after_minutes = "Enter 0 or more";
    if (policy.half_day_threshold_percent < 1 || policy.half_day_threshold_percent > 99) errs.half_day_threshold_percent = "Enter a percentage between 1 and 99";
    if (policy.late_threshold_for_halfday_minutes < 0) errs.late_threshold_for_halfday_minutes = "Enter 0 or more";
    setErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };
  

  const openCreate = () => {
    if (role === "Employee" && !hasPerm("POLICY_ADD")) return;
    setSelectedId(null);
    setPolicy(defaultPolicy);
    setShowModal(true);
    setStep(1);
    setErrors({});
  };

  const openEdit = (p: AttendancePolicy) => {
    if (role === "Employee" && !hasPerm("POLICY_EDIT")) return;
    setSelectedId(p.id ?? null);
    const fromApi: any = p as any;
    const breakdown = Array.isArray((fromApi as any).leave_breakdown)
      ? (fromApi as any).leave_breakdown
      : (() => { try { return JSON.parse((fromApi as any).leave_breakdown_json || "[]"); } catch { return []; } })();
    setPolicy({ ...defaultPolicy, ...p, leave_breakdown: (breakdown || []).length ? breakdown : defaultPolicy.leave_breakdown });
    setShowModal(true);
    setStep(1);
    setErrors({});
  };

  const openView = (p: AttendancePolicy) => {
    if (role === "Employee" && !hasPerm("POLICY_VIEW")) return;
    const fromApi: any = p as any;
    const breakdown = Array.isArray((fromApi as any).leave_breakdown)
      ? (fromApi as any).leave_breakdown
      : (() => { try { return JSON.parse((fromApi as any).leave_breakdown_json || "[]"); } catch { return []; } })();
    const hydrated = { ...defaultPolicy, ...p, leave_breakdown: (breakdown || []).length ? breakdown : defaultPolicy.leave_breakdown };
    setViewPolicy(hydrated);
    setShowViewModal(true);
  };

  const confirmDeleteStart = (p: AttendancePolicy) => {
    if (role === "Employee" && !hasPerm("POLICY_DELETE")) return;
    setPolicyToDelete(p);
    setShowConfirmDelete(true);
  };

  const handleDelete = async (p: AttendancePolicy) => {
    if (!p.id) return;
    try {
      await apiClient(`/attendance/policies/${p.id}`, { method: "DELETE" });
      await fetchPolicies();
    } catch (e: any) {
      setError(e?.message || "Failed to delete policy");
    }
  };

  const performDelete = async () => {
    if (!policyToDelete?.id) {
      setShowConfirmDelete(false);
      return;
    }
    try {
      await apiClient(`/attendance/policies/${policyToDelete.id}`, { method: "DELETE" });
      await fetchPolicies();
      setShowConfirmDelete(false);
      setPolicyToDelete(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete policy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    setErrors({});
    const ok1 = validateStep1();
    const ok2 = validateStep2();
    const ok3 = validateStep3();
    if (!ok1 || !ok2 || !ok3) {
      setSaving(false);
      return;
    }
    try {
      const path = selectedId ? `/attendance/policies/${selectedId}` : `/attendance/policies`;
      const method = selectedId ? "PUT" : "POST";
      const res = await apiClient<AttendancePolicy>(path, { method, body: policy });
      await fetchPolicies();
      setSuccess("Policy saved");
      setShowModal(false);
    } catch (e: any) {
      setError(e?.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  // Loading State
  if (loading && policies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Policies</h1>
            <p className="text-gray-600 mt-1">Manage attendance and leave policies across departments</p>
          </div>
          {(role !== "Employee" || hasPerm("POLICY_ADD")) && (
            <button className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Policy</span>
            </button>
          )}
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
  if (role === "Employee" && !hasPerm("POLICY_VIEW")) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Policies</h1>
            <p className="text-gray-600 mt-1">Manage attendance and leave policies across departments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view attendance policies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Policies</h1>
          <p className="text-gray-600 mt-1">Manage attendance and leave policies across departments</p>
        </div>
        {(role !== "Employee" || hasPerm("POLICY_ADD")) && (
          <button 
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Policy</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="">All Cycles</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <button
              onClick={() => fetchPolicies()}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Active filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          {searchTerm && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Search: {searchTerm}
              <button 
                onClick={() => setSearchTerm("")}
                className="ml-1 hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {cycleFilter && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Cycle: {cycleFilter}
              <button 
                onClick={() => setCycleFilter("")}
                className="ml-1 hover:text-green-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {statusFilter !== "all" && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Status: {statusFilter}
              <button 
                onClick={() => setStatusFilter("all")}
                className="ml-1 hover:text-purple-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      </div>

      {error && <div className="mt-3 text-red-600">{error}</div>}
      {success && <div className="mt-3 text-green-600">{success}</div>}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Leaves</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {policies.map((policy) => (
                <tr key={policy.id ?? policy.policy_name} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">{policy.policy_name}</span>
                      <span className="text-sm text-gray-500">{policy.policy_description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {policy.leave_cycle}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {policy.max_leave_per_month ?? "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {policy.standard_work_hours ?? "-"} min • Grace {policy.grace_period_minutes ?? "-"} min
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {(role !== "Employee" || hasPerm("POLICY_VIEW")) && (
                        <button
                          onClick={() => openView(policy)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View policy"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {(role !== "Employee" || hasPerm("POLICY_EDIT")) && (
                        <button
                          onClick={() => openEdit(policy)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit policy"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {(role !== "Employee" || hasPerm("POLICY_DELETE")) && (
                        <button
                          onClick={() => confirmDeleteStart(policy)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete policy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {policies.length === 0 && !loading && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No policies found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded bg-white shadow-lg my-6">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-blue-600">{selectedId ? "Edit Policy" : "Add Policy"}</h2>
              <button className="text-black hover:opacity-80" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="p-4 space-y-6 text-black" onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded ${step === 1 ? "bg-black text-white" : "bg-gray-100 text-black"}`}>1. Details</span>
                <span className={`px-2 py-1 rounded ${step === 2 ? "bg-black text-white" : "bg-gray-100 text-black"}`}>2. Leave Policy</span>
                <span className={`px-2 py-1 rounded ${step === 3 ? "bg-black text-white" : "bg-gray-100 text-black"}`}>3. Work Hours & Rules</span>
              </div>

              {step === 1 && (
                <div className="border rounded p-4">
                  <h2 className="text-lg font-semibold">Policy Details</h2>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Policy Name</label>
                      <input type="text" required className={`flex-1 rounded border px-3 py-2 ${errors.policy_name ? "border-red-500" : ""}`} value={policy.policy_name} onChange={(e) => setField("policy_name", e.target.value)} />
                    </div>
                    {errors.policy_name && <p className="ml-64 mt-1 text-xs text-red-600">{errors.policy_name}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">A short, recognizable name for this policy.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Description</label>
                      <input type="text" required className={`flex-1 rounded border px-3 py-2 ${errors.policy_description ? "border-red-500" : ""}`} value={policy.policy_description} onChange={(e) => setField("policy_description", e.target.value)} />
                    </div>
                    {errors.policy_description && <p className="ml-64 mt-1 text-xs text-red-600">{errors.policy_description}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Optional notes describing the policy’s scope or intent.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Leave Cycle</label>
                      <select required className={`flex-1 rounded border px-3 py-2 ${errors.leave_cycle ? "border-red-500" : ""}`} value={policy.leave_cycle} onChange={(e) => setField("leave_cycle", e.target.value as AttendancePolicy["leave_cycle"]) }>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    {errors.leave_cycle && <p className="ml-64 mt-1 text-xs text-red-600">{errors.leave_cycle}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Choose whether leave allowances reset monthly or annually.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Payment Cycle</label>
                      <select required className={`flex-1 rounded border px-3 py-2 ${errors.salary_payment_cycle ? "border-red-500" : ""}`} value={policy.salary_payment_cycle} onChange={(e) => setField("salary_payment_cycle", e.target.value as AttendancePolicy["salary_payment_cycle"]) }>
                        <option value="monthly">Monthly</option>
                        <option value="biweekly">Biweekly</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>
                    {errors.salary_payment_cycle && <p className="ml-64 mt-1 text-xs text-red-600">{errors.salary_payment_cycle}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Select how salaries are paid (e.g., monthly).</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Salary Date (Day of Month)</label>
                      <input type="number" required className={`flex-1 rounded border px-3 py-2 ${errors.salary_date_day ? "border-red-500" : ""}`} min={1} max={31} value={policy.salary_date_day} onChange={(e) => setField("salary_date_day", Number(e.target.value))} />
                    </div>
                    {errors.salary_date_day && <p className="ml-64 mt-1 text-xs text-red-600">{errors.salary_date_day}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Enter a day between 1 and 31.</p>

                    {/* Payment cycle days (used for weekly/biweekly; optional for monthly) */}
                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Payment Cycle Start</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        className={`flex-1 rounded border px-3 py-2 ${errors.payment_cycle_start ? "border-red-500" : ""}`}
                        value={policy.payment_cycle_start ?? ""}
                        onChange={(e) => setField("payment_cycle_start", e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </div>
                    {errors.payment_cycle_start && <p className="ml-64 mt-1 text-xs text-red-600">{errors.payment_cycle_start}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">For weekly/biweekly cycles, enter the cycle start day (1–31).</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Payment Cycle End</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        className={`flex-1 rounded border px-3 py-2 ${errors.payment_cycle_end ? "border-red-500" : ""}`}
                        value={policy.payment_cycle_end ?? ""}
                        onChange={(e) => setField("payment_cycle_end", e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </div>
                    {errors.payment_cycle_end && <p className="ml-64 mt-1 text-xs text-red-600">{errors.payment_cycle_end}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Enter the cycle end day (1–31). Required for weekly/biweekly.</p>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="border rounded p-4">
                  <h2 className="text-lg font-semibold">Leave Policy</h2>
                  <div className="mt-3 space-y-3">
                    {policy.leave_cycle === "monthly" && (
                      <>
                        <div className="flex items-center gap-3">
                          <label className="w-64 text-sm font-medium">Leaves per month</label>
                          <input type="number" required className={`flex-1 rounded border px-3 py-2 ${errors.max_leave_per_month ? "border-red-500" : ""}`} min={1} value={policy.max_leave_per_month} onChange={(e) => setField("max_leave_per_month", Number(e.target.value))} />
                        </div>
                        {errors.max_leave_per_month && <p className="ml-64 mt-1 text-xs text-red-600">{errors.max_leave_per_month}</p>}
                        <p className="ml-64 mt-1 text-xs text-gray-500">Maximum leave days allowed in a single month.</p>

                        <div className="flex items-center gap-3">
                          <label className="w-64 text-sm font-medium">Carry forward unavailed?</label>
                          <select className="flex-1 rounded border px-3 py-2" value={policy.monthly_carry_forward_allowed ? "true" : "false"} onChange={(e) => {
                            const yes = e.target.value === "true";
                            setField("monthly_carry_forward_allowed", yes);
                            if (!yes) setField("max_carry_forward_leaves", 0);
                          }}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        </div>
                        <p className="ml-64 mt-1 text-xs text-gray-500">Allow unused monthly leaves to carry forward within the year.</p>

                        {policy.monthly_carry_forward_allowed && (
                          <>
                            <div className="flex items-center gap-3">
                              <label className="w-64 text-sm font-medium">Carry-forward limit (per month)</label>
                              <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.max_carry_forward_leaves ? "border-red-500" : ""}`} min={0} value={policy.max_carry_forward_leaves} onChange={(e) => setField("max_carry_forward_leaves", Number(e.target.value))} />
                            </div>
                            {errors.max_carry_forward_leaves && <p className="ml-64 mt-1 text-xs text-red-600">{errors.max_carry_forward_leaves}</p>}
                            <p className="ml-64 mt-1 text-xs text-gray-500">Cannot exceed the monthly leave allowance.</p>
                          </>
                        )}
                      </>
                    )}

                    {policy.leave_cycle === "yearly" && (
                      <>
                        <div className="flex items-center gap-3">
                          <label className="w-64 text-sm font-medium">Total Annual Leaves</label>
                          <input type="number" required className={`flex-1 rounded border px-3 py-2 ${errors.total_annual_leaves ? "border-red-500" : ""}`} min={1} value={policy.total_annual_leaves} onChange={(e) => setField("total_annual_leaves", Number(e.target.value))} />
                        </div>
                        {errors.total_annual_leaves && <p className="ml-64 mt-1 text-xs text-red-600">{errors.total_annual_leaves}</p>}
                        <p className="ml-64 mt-1 text-xs text-gray-500">Total leave days available over the entire year.</p>

                        <div className="flex items-center gap-3">
                          <label className="w-64 text-sm font-medium">Max Leaves / Month that can be availed</label>
                          <input type="number" required className={`flex-1 rounded border px-3 py-2 ${errors.max_leave_per_month ? "border-red-500" : ""}`} min={1} value={policy.max_leave_per_month} onChange={(e) => setField("max_leave_per_month", Number(e.target.value))} />
                        </div>
                        {errors.max_leave_per_month && <p className="ml-64 mt-1 text-xs text-red-600">{errors.max_leave_per_month}</p>}
                        <p className="ml-64 mt-1 text-xs text-gray-500">Monthly cap on leaves taken, within the annual total.</p>

                        <div className="flex items-center gap-3">
                          <label className="w-64 text-sm font-medium">Carry forward unavailed annual leaves?</label>
                          <select className="flex-1 rounded border px-3 py-2" value={(policy.max_carry_forward_leaves ?? 0) > 0 ? "true" : "false"} onChange={(e) => {
                            const yes = e.target.value === "true";
                            setField("max_carry_forward_leaves", yes ? Math.max(1, policy.max_carry_forward_leaves || 12) : 0);
                          }}>
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                          </select>
                        </div>
                        <p className="ml-64 mt-1 text-xs text-gray-500">Enable or disable carrying unused annual leaves to next year.</p>
                      </>
                    )}

                    <div className="border rounded p-4 mt-2">
                      <h3 className="text-md font-semibold">Leave Types Breakdown</h3>
                      <p className="mt-1 text-xs text-gray-500">Sum of type allocations must equal total leaves for the selected cycle.</p>
                      <div className="mt-3 space-y-2">
                        {(policy.leave_breakdown || []).map((row, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <label className="w-64 text-sm font-medium">Type #{idx + 1}</label>
                            <input type="text" className="flex-1 rounded border px-3 py-2" value={row.type} onChange={(e) => {
                              const next = [...(policy.leave_breakdown || [])];
                              next[idx] = { ...row, type: e.target.value };
                              setField("leave_breakdown", next);
                            }} />
                            <input type="number" className="w-32 rounded border px-3 py-2" min={0} value={row.allocation} onChange={(e) => {
                              const next = [...(policy.leave_breakdown || [])];
                              next[idx] = { ...row, allocation: Number(e.target.value) };
                              setField("leave_breakdown", next);
                            }} />
                            <button type="button" className="p-2 rounded hover:bg-gray-100" onClick={() => {
                              const next = [...(policy.leave_breakdown || [])];
                              if (next.length > 1) {
                                next.splice(idx, 1);
                                setField("leave_breakdown", next);
                              }
                            }} title="Remove">✕</button>
                          </div>
                        ))}
                        <div>
                          <button type="button" className="px-3 py-1 rounded border" onClick={() => {
                            const expected = policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves;
                            const next = [...(policy.leave_breakdown || [])];
                            next.push({ type: "", allocation: Math.max(0, expected - next.reduce((a,b)=>a+(Number(b.allocation)||0),0)) });
                            setField("leave_breakdown", next);
                          }}>Add Type</button>
                        </div>
                        {(() => {
                          const expected = policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves;
                          const actual = (policy.leave_breakdown || []).reduce((a, b) => a + (Number(b.allocation) || 0), 0);
                          return (
                            <p className="text-xs mt-1">
                              Expected Total: <span className="font-semibold">{expected}</span> • Breakdown Total: <span className="font-semibold">{actual}</span>
                            </p>
                          );
                        })()}
                        {errors.leave_breakdown && <p className="mt-1 text-xs text-red-600">{errors.leave_breakdown}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="border rounded p-4">
                  <h2 className="text-lg font-semibold">Work Hours, Late Rules & Compoff</h2>
                  <div className="mt-3 space-y-3">
                    <h3 className="text-sm font-semibold">Work Hours & Redeem</h3>
                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Standard Work Hours (minutes)</label>
                      <input type="number" required className={`flex-1 rounded border px-3 py-2 ${errors.standard_work_hours ? "border-red-500" : ""}`} min={1} value={policy.standard_work_hours} onChange={(e) => setField("standard_work_hours", Number(e.target.value))} />
                    </div>
                    {errors.standard_work_hours && <p className="ml-64 mt-1 text-xs text-red-600">{errors.standard_work_hours}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Typical daily work time (e.g., 480 minutes = 8 hours). ({formatMinutesToHours(policy.standard_work_hours)})</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Late Logout Redeem Minutes</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.late_logout_redeem_minutes ? "border-red-500" : ""}`} min={0} value={policy.late_logout_redeem_minutes} onChange={(e) => setField("late_logout_redeem_minutes", Number(e.target.value))} />
                    </div>
                    {errors.late_logout_redeem_minutes && <p className="ml-64 mt-1 text-xs text-red-600">{errors.late_logout_redeem_minutes}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Extra minutes worked late that can redeem future lateness. ({formatMinutesToHours(policy.late_logout_redeem_minutes)})</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Redeem Next-day Allowed</label>
                      <select className="flex-1 rounded border px-3 py-2" value={policy.redeem_nextday_allowed ? "true" : "false"} onChange={(e) => setField("redeem_nextday_allowed", e.target.value === "true") }>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <p className="ml-64 mt-1 text-xs text-gray-500">Whether late logout can offset next day’s lateness.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Redeem Carry-forward Days</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.redeem_carry_forward_days ? "border-red-500" : ""}`} min={0} value={policy.redeem_carry_forward_days} onChange={(e) => setField("redeem_carry_forward_days", Number(e.target.value))} />
                    </div>
                    {errors.redeem_carry_forward_days && <p className="ml-64 mt-1 text-xs text-red-600">{errors.redeem_carry_forward_days}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Number of days late logout credit can be carried forward.</p>

                    <h3 className="text-sm font-semibold mt-4">Check-in Window</h3>
                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Allow Early Login</label>
                      <select className="flex-1 rounded border px-3 py-2" value={policy.allow_early_login ? "true" : "false"} onChange={(e) => {
                        const yes = e.target.value === "true";
                        setField("allow_early_login", yes);
                        if (!yes) setField("early_login_minutes", 0);
                      }}>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <p className="ml-64 mt-1 text-xs text-gray-500">Enable if employees may login before shift start.</p>

                    {policy.allow_early_login && (
                      <>
                        <div className="flex items-center gap-3">
                          <label className="w-64 text-sm font-medium">Minutes Before Start (early login)</label>
                          <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.early_login_minutes ? "border-red-500" : ""}`} min={0} value={policy.early_login_minutes} onChange={(e) => setField("early_login_minutes", Number(e.target.value))} />
                        </div>
                        {errors.early_login_minutes && <p className="ml-64 mt-1 text-xs text-red-600">{errors.early_login_minutes}</p>}
                        <p className="ml-64 mt-1 text-xs text-gray-500">How many minutes before shift start check-in is allowed. ({formatMinutesToHours(policy.early_login_minutes)})</p>
                      </>
                    )}

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Don’t Allow Check-in After (minutes)</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.dont_allow_checkin_after_minutes ? "border-red-500" : ""}`} min={0} value={policy.dont_allow_checkin_after_minutes} onChange={(e) => setField("dont_allow_checkin_after_minutes", Number(e.target.value))} />
                    </div>
                    {errors.dont_allow_checkin_after_minutes && <p className="ml-64 mt-1 text-xs text-red-600">{errors.dont_allow_checkin_after_minutes}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Block check-in after this window from shift start. ({formatMinutesToHours(policy.dont_allow_checkin_after_minutes)})</p>

                    <h3 className="text-sm font-semibold mt-4">Late Mark Rules</h3>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Grace Period (minutes)</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.grace_period_minutes ? "border-red-500" : ""}`} min={0} value={policy.grace_period_minutes} onChange={(e) => setField("grace_period_minutes", Number(e.target.value))} />
                    </div>
                    {errors.grace_period_minutes && <p className="ml-64 mt-1 text-xs text-red-600">{errors.grace_period_minutes}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Window before a late mark is recorded. ({formatMinutesToHours(policy.grace_period_minutes)})</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Max Late Marks / Month</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.max_late_marks_per_month ? "border-red-500" : ""}`} min={0} value={policy.max_late_marks_per_month} onChange={(e) => setField("max_late_marks_per_month", Number(e.target.value))} />
                    </div>
                    {errors.max_late_marks_per_month && <p className="ml-64 mt-1 text-xs text-red-600">{errors.max_late_marks_per_month}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">After this count, penalties apply.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Late Mark Penalty</label>
                      <select className="flex-1 rounded border px-3 py-2" value={policy.late_mark_penalty} onChange={(e) => setField("late_mark_penalty", e.target.value)} >
                        <option value="none">None</option>
                        <option value="half_day">Half-day</option>
                        <option value="full_day">Full-day</option>
                      </select>
                    </div>
                    <p className="ml-64 mt-1 text-xs text-gray-500">Penalty applied after exceeding max late marks.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Late Threshold for Half-day (Percentage)</label>
                      <input 
                        type="number" 
                        className={`flex-1 rounded border px-3 py-2 ${errors.late_threshold_for_halfday_minutes ? "border-red-500" : ""}`} 
                        min={0} 
                        value={policy.late_threshold_for_halfday_minutes} 
                        onChange={(e) => setField("late_threshold_for_halfday_minutes", Number(e.target.value))} 
                      />
                    </div>
                    {errors.late_threshold_for_halfday_minutes && <p className="ml-64 mt-1 text-xs text-red-600">{errors.late_threshold_for_halfday_minutes}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">
                    
                      <span className="text-blue-600">Example: For 8-hour workday, 10% = 48 minutes. If user checks in after 48 minutes, it will be considered half-day.</span>
                    </p>

                    <h3 className="text-sm font-semibold mt-4">Late Check-in Handling</h3>
                    {/* Hidden field - keeping default value as false */}
                    <input type="hidden" value="false" onChange={(e) => setField("allow_full_day_if_late_checkin", false)} />

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Minimum Threshold (%) for Half-day</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.half_day_threshold_percent ? "border-red-500" : ""}`} min={1} max={99} value={policy.half_day_threshold_percent} onChange={(e) => setField("half_day_threshold_percent", Number(e.target.value))} />
                    </div>
                    {errors.half_day_threshold_percent && <p className="ml-64 mt-1 text-xs text-red-600">{errors.half_day_threshold_percent}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Day becomes half-day if worked hours fall below this percentage of standard hours.</p>

                    <h3 className="text-sm font-semibold mt-4">Comp-off Rules</h3>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Auto Convert to Compoff</label>
                      <select className="flex-1 rounded border px-3 py-2" value={policy.auto_convert_to_compoff ? "true" : "false"} onChange={(e) => setField("auto_convert_to_compoff", e.target.value === "true") }>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <p className="ml-64 mt-1 text-xs text-gray-500">Automatically grant comp-off when extra work meets threshold.</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Min Extra Work for Compoff (minutes)</label>
                      <input type="number" className={`flex-1 rounded border px-3 py-2 ${errors.min_extra_work_for_compoff_minutes ? "border-red-500" : ""}`} min={0} value={policy.min_extra_work_for_compoff_minutes} onChange={(e) => setField("min_extra_work_for_compoff_minutes", Number(e.target.value))} />
                    </div>
                    {errors.min_extra_work_for_compoff_minutes && <p className="ml-64 mt-1 text-xs text-red-600">{errors.min_extra_work_for_compoff_minutes}</p>}
                    <p className="ml-64 mt-1 text-xs text-gray-500">Minimum extra minutes required to earn a comp-off day. ({formatMinutesToHours(policy.min_extra_work_for_compoff_minutes)})</p>

                    <div className="flex items-center gap-3">
                      <label className="w-64 text-sm font-medium">Compoff Requires Approval</label>
                      <select className="flex-1 rounded border px-3 py-2" value={policy.compoff_requires_approval ? "true" : "false"} onChange={(e) => setField("compoff_requires_approval", e.target.value === "true") }>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </div>
                    <p className="ml-64 mt-1 text-xs text-gray-500">If enabled, comp-off issuance needs manager approval.</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button type="button" className="px-4 py-2 rounded border text-black" onClick={() => setShowModal(false)}>Cancel</button>
                {step > 1 && (
                  <button type="button" className="px-4 py-2 rounded border text-black" onClick={() => setStep(step - 1)}>Back</button>
                )}
                {step === 1 && (
                  <button type="button" className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={() => { if (validateStep1()) setStep(2); }}>Next</button>
                )}
                {step === 2 && (
                  <button type="button" className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800" onClick={() => { if (validateStep2()) setStep(3); }}>Next</button>
                )}
                {step === 3 && (
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800">
                    {saving ? "Saving..." : selectedId ? "Save Changes" : "Create Policy"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4">
          <div className="skeleton h-6 w-full rounded" />
        </div>
      )}

      {showViewModal && viewPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowViewModal(false); setViewPolicy(null); }} />
          <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded bg-white shadow-lg my-6">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold text-black">Policy Details</h2>
              <button className="text-black hover:opacity-80" onClick={() => { setShowViewModal(false); setViewPolicy(null); }}>✕</button>
            </div>
            <div className="p-4 space-y-6 text-black">
              <div className="border rounded p-4">
                <h3 className="text-md font-semibold">Overview</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Name</label><div className="flex-1">{viewPolicy.policy_name}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Description</label><div className="flex-1">{viewPolicy.policy_description || '-'}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Cycle</label><div className="flex-1">{viewPolicy.leave_cycle}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Payment Cycle</label><div className="flex-1">{viewPolicy.salary_payment_cycle || '-'}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Salary Date (day)</label><div className="flex-1">{viewPolicy.salary_date_day ?? '-'}</div></div>
                </div>
              </div>
              <div className="border rounded p-4">
                <h3 className="text-md font-semibold">Leave Policy</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Max Leaves / Month</label><div className="flex-1">{viewPolicy.max_leave_per_month}</div></div>
                  {viewPolicy.leave_cycle === 'yearly' && (
                    <>
                      <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Annual Leaves</label><div className="flex-1">{viewPolicy.total_annual_leaves}</div></div>
                      <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Max Carry Forward</label><div className="flex-1">{viewPolicy.max_carry_forward_leaves}</div></div>
                      <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Monthly Carry Forward Allowed</label><div className="flex-1">{viewPolicy.monthly_carry_forward_allowed ? 'Yes' : 'No'}</div></div>
                    </>
                  )}
                  {(Array.isArray((viewPolicy as any).leave_breakdown) && (viewPolicy as any).leave_breakdown.length > 0) && (
                    <div className="mt-3">
                      <div className="text-sm font-medium">Breakdown</div>
                      <ul className="mt-1 list-disc ml-8 text-sm">
                        {((viewPolicy as any).leave_breakdown as any[]).map((b, i) => (
                          <li key={i}>{b.type || 'Type'} — {b.allocation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div className="border rounded p-4">
                <h3 className="text-md font-semibold">Work Hours & Compoff</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Standard Work Hours (min)</label><div className="flex-1">{viewPolicy.standard_work_hours}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Grace Period (min)</label><div className="flex-1">{viewPolicy.grace_period_minutes}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Late Marks / Month</label><div className="flex-1">{viewPolicy.max_late_marks_per_month}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Late Logout Redeem (min)</label><div className="flex-1">{viewPolicy.late_logout_redeem_minutes}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Redeem Next-day Allowed</label><div className="flex-1">{viewPolicy.redeem_nextday_allowed ? 'Yes' : 'No'}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Redeem Carry-forward Days</label><div className="flex-1">{viewPolicy.redeem_carry_forward_days}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Allow Full-day if Late Check-in</label><div className="flex-1">{viewPolicy.allow_full_day_if_late_checkin ? 'Yes' : 'No'}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Minimum Threshold (%) for Half-day</label><div className="flex-1">{viewPolicy.half_day_threshold_percent}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Allow Early Login</label><div className="flex-1">{viewPolicy.allow_early_login ? 'Yes' : 'No'}</div></div>
                  {viewPolicy.allow_early_login && (
                    <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Early Login Minutes</label><div className="flex-1">{viewPolicy.early_login_minutes}</div></div>
                  )}
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Block Check-in After (min)</label><div className="flex-1">{viewPolicy.dont_allow_checkin_after_minutes}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Auto Convert to Compoff</label><div className="flex-1">{viewPolicy.auto_convert_to_compoff ? 'Yes' : 'No'}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Min Extra Work for Compoff (min)</label><div className="flex-1">{viewPolicy.min_extra_work_for_compoff_minutes}</div></div>
                  <div className="flex items-center gap-3"><label className="w-64 text-sm font-medium">Compoff Requires Approval</label><div className="flex-1">{viewPolicy.compoff_requires_approval ? 'Yes' : 'No'}</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && policyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowConfirmDelete(false)} />
          <div className="relative w-full max-w-md rounded bg-white shadow-lg">
            <div className="border-b p-4">
              <h3 className="text-lg font-semibold text-black">Delete Policy</h3>
            </div>
            <div className="p-4 text-black">
              <p>Are you sure you want to delete policy "{policyToDelete.policy_name}"?</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button className="px-3 py-2 rounded border" onClick={() => setShowConfirmDelete(false)}>Cancel</button>
              <button className="px-3 py-2 rounded bg-black text-white" onClick={performDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

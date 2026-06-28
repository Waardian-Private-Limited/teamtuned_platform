"use client";

import React from "react";
import {
  Eye,
  Pencil,
  Power,
  Trash2,
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
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  ChevronRight as ChevronRightIcon,
  Building2
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";

import { useAuth } from "@/context/AuthContext";
export type AttendancePolicy = {
  id?: number;
  policy_name: string;
  policy_description: string;
  leave_cycle: "monthly" | "yearly";
  status?: "active" | "inactive";

  // Payroll fields
  salary_payment_cycle?: "monthly" | "biweekly" | "weekly";
  salary_date_day?: number;
  slip_day?: number;
  payment_cycle_start?: number;
  payment_cycle_end?: number;

  // Attendance rules
  grace_period_type: "minutes" | "specific_time";
  grace_period_minutes: number;
  grace_period_specific_time_late?: string;
  grace_period_specific_time_early?: string;
  apply_grace_on_checkin?: boolean;
  apply_grace_on_checkout?: boolean;
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
  compoff_halfday_hrs: number;
  compoff_fullday_hrs: number;
  compoff_requires_approval: boolean;
  regularization_allowed_days: number;
  regularization_cutoff_time: string;
  allow_regularization: boolean;
  regularizations_limit_per_month: number;

  // Late check-in rules
  allow_full_day_if_late_checkin: boolean;
  half_day_threshold_percent: number;
  full_day_threshold_percent: number;
  late_threshold_for_halfday_minutes: number;
  use_time_thresholds: boolean;
  halfday_late_threshold_time: string;
  fullday_early_threshold_time: string;

  // Leave policy
  total_annual_leaves: number;
  max_leave_per_month: number;
  max_carry_forward_leaves: number;
  monthly_carry_forward_allowed: boolean;
  leave_breakdown: { type: string; allocation: number }[];

  // Leave reset dates
  leave_reset_day?: number;
  leave_reset_month?: number | null;

  // New leave policy fields
  yearly_credit_type?: "all_at_once" | "monthly";
  limit_max_leave_per_month?: boolean;
  carry_forward_all?: boolean;

  // Night OT policy
  allow_night_ot?: boolean;
  night_shift_min_percentage?: number;
  night_shift_full_credit_percentage?: number;
  night_ot_compoff_conversion?: boolean;
  night_ot_type?: "hours" | "time";
  night_ot_half_day_time?: string;
  night_ot_full_day_time?: string;
  auto_adjust_night_ot_next_day?: boolean;


  // Display settings
  show_grace_minutes?: boolean;
  show_late_min?: boolean;
  show_ot_minutes?: boolean;
  adjust_leave_compoff?: boolean;
  max_sessions_allowed: number;
};

const defaultPolicy: AttendancePolicy = {
  policy_name: "",
  policy_description: "",
  leave_cycle: "yearly",
  salary_payment_cycle: "monthly",
  salary_date_day: 1,
  slip_day: undefined,
  payment_cycle_start: undefined,
  payment_cycle_end: undefined,

  grace_period_type: "minutes",
  grace_period_minutes: 10,
  grace_period_specific_time_late: "09:30:00",
  grace_period_specific_time_early: "18:00:00",
  apply_grace_on_checkin: true,
  apply_grace_on_checkout: true,
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
  compoff_halfday_hrs: 4,
  compoff_fullday_hrs: 6,
  compoff_requires_approval: true,
  regularization_allowed_days: 0,
  regularization_cutoff_time: "13:00:00",
  allow_regularization: true,
  regularizations_limit_per_month: 10,

  allow_full_day_if_late_checkin: false,
  half_day_threshold_percent: 50,
  full_day_threshold_percent: 75,
  late_threshold_for_halfday_minutes: 48,
  use_time_thresholds: false,
  halfday_late_threshold_time: "11:00:00",
  fullday_early_threshold_time: "16:00:00",

  total_annual_leaves: 18,
  max_leave_per_month: 2,
  max_carry_forward_leaves: 12,
  monthly_carry_forward_allowed: false,
  leave_breakdown: [
    { type: "Paid Leave", allocation: 18 },
  ],

  leave_reset_day: 1,
  leave_reset_month: 1,

  yearly_credit_type: "all_at_once",
  limit_max_leave_per_month: true,
  carry_forward_all: false,

  allow_night_ot: false,
  night_shift_min_percentage: 50,
  night_shift_full_credit_percentage: 100,
  night_ot_compoff_conversion: false,
  night_ot_type: "hours",
  night_ot_half_day_time: "00:30:00",
  night_ot_full_day_time: "02:00:00",
  auto_adjust_night_ot_next_day: false,


  show_grace_minutes: true,
  show_late_min: true,
  show_ot_minutes: true,
  adjust_leave_compoff: true,
  max_sessions_allowed: 1,
};

export default function AttendanceRulesManager() {
  const { role, permissions, user, employee } = useAuth();
  const [policies, setPolicies] = React.useState<AttendancePolicy[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string>("");
  const [success, setSuccess] = React.useState<string>("");
  const [successTimer, setSuccessTimer] = React.useState<number>(0);

  // Filters & UI State
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [cycleFilter, setCycleFilter] = React.useState<string>("");
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
  const [showDeleteModal, setShowDeleteModal] = React.useState<boolean>(false);

  // Form state
  const [saving, setSaving] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [policy, setPolicy] = React.useState<AttendancePolicy>(defaultPolicy);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [policyToDelete, setPolicyToDelete] = React.useState<AttendancePolicy | null>(null);
  const [wizardStep, setWizardStep] = React.useState<number>(1);
  const [formErrors, setFormErrors] = React.useState<Partial<Record<keyof AttendancePolicy, string>>>({});


  // Permissions
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  const formatMinutesToHours = (minutes: number): string => {
    if (minutes === 0) return "0 hours";
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) return `${remainingMinutes} minutes`;
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  };

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

  // // const { role, permissions, user, employee } = useAuth();



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
    } catch (e: any) {
      setError(e?.message || "Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPolicies();
  }, [role, permissions]);

  // Re-fetch for pagination changes
  React.useEffect(() => {
    if (!role || (role === "Employee" && !hasPerm("POLICY_VIEW"))) return;
    fetchPolicies();
  }, [currentPage, pageSize]);

  // Debounced search
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (!role || (role === "Employee" && !hasPerm("POLICY_VIEW"))) return;
      setCurrentPage(1);
      fetchPolicies();
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchTerm, statusFilter, cycleFilter]);

  // Auto-dismiss success messages after 15 seconds with countdown
  React.useEffect(() => {
    if (success) {
      setSuccessTimer(15);
      const countdown = setInterval(() => {
        setSuccessTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setSuccess("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdown);
    } else {
      setSuccessTimer(0);
    }
  }, [success]);

  const applyFilters = () => {
    setCurrentPage(1);
    fetchPolicies();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCycleFilter("");
    setCurrentPage(1);
    fetchPolicies();
  };

  const setField = (key: keyof AttendancePolicy, value: any) => {
    setPolicy((prev: AttendancePolicy) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const validateStep1 = () => {
    const errs: Partial<Record<keyof AttendancePolicy, string>> = {};
    if (!policy.policy_name?.trim()) errs.policy_name = "Policy name is required";
    if (!policy.policy_description?.trim()) errs.policy_description = "Description is required";
    if (!policy.salary_payment_cycle) errs.salary_payment_cycle = "Payment cycle is required";

    const day = Number(policy.salary_date_day);
    if (!Number.isFinite(day) || day < 1 || day > 31) errs.salary_date_day = "Enter a day between 1 and 31";

    if (policy.salary_payment_cycle && ["weekly", "biweekly"].includes(policy.salary_payment_cycle)) {
      const s = Number(policy.payment_cycle_start);
      const e = Number(policy.payment_cycle_end);
      if (!Number.isFinite(s) || s < 1 || s > 31) errs.payment_cycle_start = "Enter a day between 1 and 31";
      if (!Number.isFinite(e) || e < 1 || e > 31) errs.payment_cycle_end = "Enter a day between 1 and 31";
    }

    setFormErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Partial<Record<keyof AttendancePolicy, string>> = {};
    if (!policy.leave_cycle) errs.leave_cycle = "Leave cycle is required";
    if (policy.leave_cycle === "monthly") {
      if (!(policy.max_leave_per_month > 0)) errs.max_leave_per_month = "Enter a positive number";
      if (policy.monthly_carry_forward_allowed) {
        if (!policy.carry_forward_all) {
          if (policy.max_carry_forward_leaves === undefined || policy.max_carry_forward_leaves < 0) {
            errs.max_carry_forward_leaves = "Enter 0 or more";
          } else if (policy.max_carry_forward_leaves > policy.max_leave_per_month) {
            errs.max_carry_forward_leaves = "Cannot exceed leaves per month";
          }
        }
      }
    } else {
      if (!(policy.total_annual_leaves > 0)) errs.total_annual_leaves = "Enter a positive number";
      if (policy.limit_max_leave_per_month !== false) {
        if (!(policy.max_leave_per_month > 0)) errs.max_leave_per_month = "Enter a positive number";
      }
      if (!policy.carry_forward_all) {
        if (policy.max_carry_forward_leaves === undefined || policy.max_carry_forward_leaves < 0) {
          errs.max_carry_forward_leaves = "Internal carry-forward must be 0 or more";
        }
      }
    }

    const expected = policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves;
    const actual = (policy.leave_breakdown || []).reduce((a, b) => a + (Number(b.allocation) || 0), 0);
    if (!(policy.leave_breakdown || []).length) {
      errs.leave_breakdown = "Add at least one leave type";
    } else if (expected !== actual) {
      errs.leave_breakdown = `Breakdown total (${actual}) must equal expected (${expected})`;
    }

    setFormErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Partial<Record<keyof AttendancePolicy, string>> = {};
    if (!(policy.standard_work_hours > 0)) errs.standard_work_hours = "Enter a positive number";
    
    if (policy.grace_period_type === "minutes") {
      if (policy.grace_period_minutes < 0) errs.grace_period_minutes = "Enter 0 or more";
    } else {
      if (!policy.grace_period_specific_time_late) errs.grace_period_specific_time_late = "Late time is required";
      if (!policy.grace_period_specific_time_early) errs.grace_period_specific_time_early = "Early time is required";
    }

    if (policy.max_late_marks_per_month < 0) errs.max_late_marks_per_month = "Enter 0 or more";
    if (policy.late_logout_redeem_minutes < 0) errs.late_logout_redeem_minutes = "Enter 0 or more";
    if (policy.redeem_carry_forward_days < 0) errs.redeem_carry_forward_days = "Enter 0 or more";
    if (policy.min_extra_work_for_compoff_minutes < 0) errs.min_extra_work_for_compoff_minutes = "Enter 0 or more";
    if (policy.compoff_halfday_hrs < 0) errs.compoff_halfday_hrs = "Enter 0 or more";
    if (policy.compoff_fullday_hrs < 0) errs.compoff_fullday_hrs = "Enter 0 or more";
    if (policy.allow_early_login && policy.early_login_minutes < 0) errs.early_login_minutes = "Enter 0 or more";
    if (policy.dont_allow_checkin_after_minutes < 0) errs.dont_allow_checkin_after_minutes = "Enter 0 or more";
    if (policy.half_day_threshold_percent < 1 || policy.half_day_threshold_percent > 99) errs.half_day_threshold_percent = "Enter a percentage between 1 and 99";
    if (policy.full_day_threshold_percent < 1 || policy.full_day_threshold_percent > 100) errs.full_day_threshold_percent = "Enter a percentage between 1 and 100";
    if (policy.late_threshold_for_halfday_minutes < 0) errs.late_threshold_for_halfday_minutes = "Enter 0 or more";
    if (policy.regularization_allowed_days < 0 || policy.regularization_allowed_days > 31) errs.regularization_allowed_days = "Enter between 0 and 31";
    if (policy.regularizations_limit_per_month < 0) errs.regularizations_limit_per_month = "Enter 0 or more";
    if (policy.max_sessions_allowed < 1) errs.max_sessions_allowed = "Enter 1 or more";

    setFormErrors((prev) => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setPolicy(defaultPolicy);
    setSelectedId(null);
    setWizardStep(1);
    setFormErrors({});
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (policyItem: AttendancePolicy) => {
    setSelectedId(policyItem.id ?? null);
    const fromApi: any = policyItem;
    const breakdown = Array.isArray((fromApi as any).leave_breakdown)
      ? (fromApi as any).leave_breakdown
      : (() => { try { return JSON.parse((fromApi as any).leave_breakdown_json || "[]"); } catch { return []; } })();

    setPolicy({
      ...defaultPolicy,
      ...policyItem,
      leave_breakdown: (breakdown || []).length ? breakdown : defaultPolicy.leave_breakdown
    });
    setShowEditModal(true);
    setWizardStep(1);
  };

  const openView = (policyItem: AttendancePolicy) => {
    const fromApi: any = policyItem;
    const breakdown = Array.isArray((fromApi as any).leave_breakdown)
      ? (fromApi as any).leave_breakdown
      : (() => { try { return JSON.parse((fromApi as any).leave_breakdown_json || "[]"); } catch { return []; } })();

    setPolicy({
      ...defaultPolicy,
      ...policyItem,
      leave_breakdown: (breakdown || []).length ? breakdown : defaultPolicy.leave_breakdown
    });
    setShowViewModal(true);
  };

  const confirmDelete = (policyItem: AttendancePolicy) => {
    setPolicyToDelete(policyItem);
    setShowDeleteModal(true);
  };

  const toggleStatus = async (policyItem: AttendancePolicy) => {
    const next = policyItem.status === "inactive" ? "active" : "inactive";
    try {
      setActionLoading(`status-${policyItem.id}`);
      await apiClient(`/attendance/policies/${policyItem.id}/status`, {
        method: "PATCH",
        body: { status: next }
      });

      const updated: AttendancePolicy = {
        ...policyItem,
        status: next as "active" | "inactive"
      };

      setPolicies((prev) => prev.map((p) => (p.id === policyItem.id ? updated : p)));
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const performDelete = async () => {
    if (!policyToDelete?.id) return;

    setActionLoading(`delete-${policyToDelete.id}`);
    try {
      await apiClient(`/attendance/policies/${policyToDelete.id}`, { method: "DELETE" });
      setPolicies((prev) => prev.filter((p) => p.id !== policyToDelete.id));
      setShowDeleteModal(false);
      setPolicyToDelete(null);
    } catch (e: any) {
      setError(e?.message || "Failed to delete policy");
    } finally {
      setActionLoading(null);
    }
  };

  const goNext = () => {
    if (wizardStep === 1 && validateStep1()) setWizardStep(2);
    else if (wizardStep === 2 && validateStep2()) setWizardStep(3);
  };

  const goBack = () => {
    setWizardStep(wizardStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ok1 = validateStep1();
    const ok2 = validateStep2();
    const ok3 = validateStep3();

    if (!ok1 || !ok2 || !ok3) {
      if (!ok1) setWizardStep(1);
      else if (!ok2) setWizardStep(2);
      else if (!ok3) setWizardStep(3);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const path = selectedId ? `/attendance/policies/${selectedId}` : `/attendance/policies`;
      const method = selectedId ? "PUT" : "POST";

      await apiClient(path, { method, body: policy });

      setSuccess(`Policy ${selectedId ? 'updated' : 'created'} successfully`);
      setShowCreateModal(false);
      setShowEditModal(false);
      resetForm();
      fetchPolicies();
    } catch (e: any) {
      setError(e?.message || `Failed to ${selectedId ? 'update' : 'create'} policy`);
    } finally {
      setSaving(false);
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
      case 'active': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'inactive': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return <AlertCircle className="w-3 h-3 text-gray-500" />;
    }
  };

  // Action Dropdown Component
  const ActionDropdown = ({ policy: policyItem }: { policy: AttendancePolicy }) => {
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
          disabled={actionLoading === `status-${policyItem.id}` || actionLoading === `delete-${policyItem.id}`}
        >
          {actionLoading === `status-${policyItem.id}` || actionLoading === `delete-${policyItem.id}` ? (
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
                {(role !== "Employee" || hasPerm("POLICY_VIEW")) && (
                  <button
                    onClick={() => { openView(policyItem); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Details</span>
                  </button>
                )}

                {(role !== "Employee" || hasPerm("POLICY_EDIT")) && (
                  <button
                    onClick={() => { openEdit(policyItem); setIsOpen(false); }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Edit Policy</span>
                  </button>
                )}

                <div className="border-t border-gray-100 my-1" />

                {(role !== "Employee" || hasPerm("POLICY_EDIT")) && (
                  <button
                    onClick={() => {
                      toggleStatus(policyItem);
                      setIsOpen(false);
                    }}
                    className={`flex items-center space-x-2 w-full px-4 py-2 text-sm ${policyItem.status === "inactive"
                      ? "text-green-700 hover:bg-green-50"
                      : "text-red-700 hover:bg-red-50"
                      }`}
                  >
                    <Power className="w-4 h-4" />
                    <span>{policyItem.status === "inactive" ? "Activate" : "Deactivate"}</span>
                  </button>
                )}

                {(role !== "Employee" || hasPerm("POLICY_DELETE")) && (
                  <button
                    onClick={() => {
                      confirmDelete(policyItem);
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
  if (loading && policies.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance Policies</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage attendance and leave policies</p>
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
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
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (role === "Employee" && !hasPerm("POLICY_VIEW")) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Attendance Policies</h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage attendance and leave policies</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view attendance policies.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render Modals */}
      {/* View Policy Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Policy Details</h3>
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
                    <h4 className="text-sm font-medium text-gray-500">Policy Name</h4>
                    <p className="text-lg font-medium mt-1">{policy.policy_name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Leave Cycle</h4>
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {policy.leave_cycle}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500">Description</h4>
                  <p className="mt-1 text-gray-900">
                    {policy.policy_description || 'No description provided'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Standard Work Hours</h4>
                    <p className="mt-1 text-gray-900">
                      {policy.standard_work_hours} minutes ({formatMinutesToHours(policy.standard_work_hours)})
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Max Sessions Allowed</h4>
                    <p className="mt-1 text-gray-900">
                      {policy.max_sessions_allowed || 1}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Grace Period</h4>
                    {policy.grace_period_type === "specific_time" ? (
                      <p className="mt-1 text-gray-900">
                        Late after: {policy.grace_period_specific_time_late} <br />
                        Early before: {policy.grace_period_specific_time_early}
                      </p>
                    ) : (
                      <p className="mt-1 text-gray-900">
                        {policy.grace_period_minutes} minutes
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Time Thresholds</h4>
                    <p className="mt-1 text-gray-900">
                      {policy.use_time_thresholds ? (
                        <>
                          Enabled <br />
                          HD if Late &gt; {policy.halfday_late_threshold_time} <br />
                          HD if Early &lt; {policy.fullday_early_threshold_time}
                        </>
                      ) : "Disabled (Using Percentages)"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Max Late Marks / Month</h4>
                    <p className="mt-1 text-gray-900">{policy.max_late_marks_per_month}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Leave Allocation</h4>
                    <div className="mt-1 text-gray-900">
                      {policy.leave_cycle === "monthly"
                        ? `${policy.max_leave_per_month} days per month`
                        : `${policy.total_annual_leaves} days annually${policy.limit_max_leave_per_month !== false ? `, ${policy.max_leave_per_month} max per month` : ""}`
                      }
                      {policy.leave_cycle === "yearly" && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          Credit Type: {policy.yearly_credit_type === "monthly" ? "Credit monthly (divided by 12)" : "Credit all at once"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Carry Forward</h4>
                    <p className="mt-1 text-gray-900">
                      {policy.carry_forward_all
                        ? "All remaining balances carried forward"
                        : (policy.max_carry_forward_leaves > 0
                          ? `${policy.max_carry_forward_leaves} days allowed`
                          : 'Not allowed')
                      }
                    </p>
                  </div>
                </div>

                {policy.leave_breakdown && policy.leave_breakdown.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Leave Breakdown</h4>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {policy.leave_breakdown.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">{item.type}</span>
                            <span className="text-sm text-gray-600">{item.allocation} days</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEdit(policy);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Edit Policy
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
      )}

      {/* Create/Edit Policy Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedId ? 'Edit Policy' : 'Add New Policy'}
                </h3>
                <div className="text-sm text-gray-500">Step {wizardStep} of 3</div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Policy Details */}
                {wizardStep === 1 && (
                  <>
                    <div className="border-b pb-4 mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Policy Details</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Policy Name<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.policy_name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="e.g., Standard Office Policy"
                          value={policy.policy_name}
                          onChange={(e) => setField("policy_name", e.target.value)}
                        />
                        {formErrors.policy_name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.policy_name}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">A short, recognizable name for this policy.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.policy_description ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Brief description of the policy"
                          value={policy.policy_description}
                          onChange={(e) => setField("policy_description", e.target.value)}
                        />
                        {formErrors.policy_description && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.policy_description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Optional notes describing the policy's scope.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Cycle<span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.salary_payment_cycle ? 'border-red-500' : 'border-gray-300'
                            }`}
                          value={policy.salary_payment_cycle}
                          onChange={(e) => setField("salary_payment_cycle", e.target.value as AttendancePolicy["salary_payment_cycle"])}
                        >
                          <option value="monthly">Monthly</option>
                          <option value="biweekly">Biweekly</option>
                          <option value="weekly">Weekly</option>
                        </select>
                        {formErrors.salary_payment_cycle && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.salary_payment_cycle}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Select how salaries are paid.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Salary Date (Day of Month)
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.salary_date_day ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={1}
                          max={31}
                          value={policy.salary_date_day ?? ''}
                          onChange={(e) => setField("salary_date_day", e.target.value ? Number(e.target.value) : undefined)}
                        />
                        {formErrors.salary_date_day && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.salary_date_day}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Day when salary is paid (1-31).</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Slip Available Day (Optional)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min={1}
                          max={31}
                          value={policy.slip_day || ''}
                          onChange={(e) => setField("slip_day", e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="e.g., 5"
                        />
                        <p className="mt-1 text-xs text-gray-500">Day when salary slip becomes available (1-31). Leave empty if same as salary date.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cycle Start Day
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.payment_cycle_start ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={1}
                          max={31}
                          value={policy.payment_cycle_start || ''}
                          onChange={(e) => setField("payment_cycle_start", e.target.value ? Number(e.target.value) : undefined)}
                        />
                        {formErrors.payment_cycle_start && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.payment_cycle_start}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">For weekly/biweekly cycles (1-31).</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cycle End Day
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.payment_cycle_end ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={1}
                          max={31}
                          value={policy.payment_cycle_end || ''}
                          onChange={(e) => setField("payment_cycle_end", e.target.value ? Number(e.target.value) : undefined)}
                        />
                        {formErrors.payment_cycle_end && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.payment_cycle_end}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">For weekly/biweekly cycles (1-31).</p>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 2: Leave Policy */}
                {wizardStep === 2 && (
                  <>
                    <div className="border-b pb-4 mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Leave Policy</h4>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Leave Cycle<span className="text-red-500 ml-1">*</span>
                          </label>
                          <select
                            className={`w-full px-3 py-2 border bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.leave_cycle ? 'border-red-500' : 'border-gray-300'
                              }`}
                            value={policy.leave_cycle}
                            onChange={(e) => setField("leave_cycle", e.target.value as AttendancePolicy["leave_cycle"])}
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                          {formErrors.leave_cycle && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.leave_cycle}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">Choose whether leave allowances reset monthly or annually.</p>
                        </div>

                        {policy.leave_cycle === "monthly" && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Reset Day of Month
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={policy.leave_reset_day ?? 1}
                              onChange={(e) => setField("leave_reset_day", Number(e.target.value))}
                            >
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>
                                  {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              Leave balances will reset on the <strong>
                                {policy.leave_reset_day ?? 1}
                                {(policy.leave_reset_day ?? 1) === 1 ? 'st' :
                                  (policy.leave_reset_day ?? 1) === 2 ? 'nd' :
                                    (policy.leave_reset_day ?? 1) === 3 ? 'rd' : 'th'}
                              </strong> of every month.
                            </p>
                          </div>
                        )}

                        {policy.leave_cycle === "yearly" && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reset Month
                              </label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={policy.leave_reset_month ?? 1}
                                onChange={(e) => setField("leave_reset_month", Number(e.target.value))}
                              >
                                <option value="1">January</option>
                                <option value="2">February</option>
                                <option value="3">March</option>
                                <option value="4">April</option>
                                <option value="5">May</option>
                                <option value="6">June</option>
                                <option value="7">July</option>
                                <option value="8">August</option>
                                <option value="9">September</option>
                                <option value="10">October</option>
                                <option value="11">November</option>
                                <option value="12">December</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reset Day
                              </label>
                              <select
                                className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={policy.leave_reset_day ?? 1}
                                onChange={(e) => setField("leave_reset_day", Number(e.target.value))}
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>
                                    {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500">
                                Leave balances will reset on <strong>
                                  {['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][policy.leave_reset_month ?? 1]}
                                  {' '}{policy.leave_reset_day ?? 1}
                                  {(policy.leave_reset_day ?? 1) === 1 ? 'st' :
                                    (policy.leave_reset_day ?? 1) === 2 ? 'nd' :
                                      (policy.leave_reset_day ?? 1) === 3 ? 'rd' : 'th'}
                                </strong> every year.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {policy.leave_cycle === "monthly" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Leaves per Month<span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.max_leave_per_month ? 'border-red-500' : 'border-gray-300'
                                }`}
                              min={1}
                              value={policy.max_leave_per_month}
                              onChange={(e) => setField("max_leave_per_month", Number(e.target.value))}
                            />
                            {formErrors.max_leave_per_month && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.max_leave_per_month}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Maximum leave days allowed in a single month.</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Monthly Carry Forward Allowed
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={policy.monthly_carry_forward_allowed ? "true" : "false"}
                              onChange={(e) => {
                                const yes = e.target.value === "true";
                                setField("monthly_carry_forward_allowed", yes);
                                if (!yes) {
                                  setField("max_carry_forward_leaves", 0);
                                  setField("carry_forward_all", false);
                                }
                              }}
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Allow unused monthly leaves to carry forward within the year.</p>
                          </div>
                        </div>

                        {policy.monthly_carry_forward_allowed && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="carry_forward_all"
                                checked={policy.carry_forward_all || false}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setField("carry_forward_all", checked);
                                  if (checked) {
                                    setField("max_carry_forward_leaves", 0);
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor="carry_forward_all" className="text-sm font-medium text-gray-700">
                                Carry forward all remaining balances
                              </label>
                            </div>

                            {!policy.carry_forward_all && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Carry-forward Limit (per month)
                                </label>
                                <input
                                  type="number"
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.max_carry_forward_leaves ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  min={0}
                                  value={policy.max_carry_forward_leaves}
                                  onChange={(e) => setField("max_carry_forward_leaves", Number(e.target.value))}
                                />
                                {formErrors.max_carry_forward_leaves && (
                                  <p className="mt-1 text-sm text-red-600">{formErrors.max_carry_forward_leaves}</p>
                                )}
                                <p className="mt-1 text-xs text-gray-500">Cannot exceed the monthly leave allowance.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {policy.leave_cycle === "yearly" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Total Annual Leaves<span className="text-red-500 ml-1">*</span>
                            </label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.total_annual_leaves ? 'border-red-500' : 'border-gray-300'
                                }`}
                              min={1}
                              value={policy.total_annual_leaves}
                              onChange={(e) => setField("total_annual_leaves", Number(e.target.value))}
                            />
                            {formErrors.total_annual_leaves && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.total_annual_leaves}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Total leave days available over the entire year.</p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Annual Leaves Credit Type
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={policy.yearly_credit_type || "all_at_once"}
                              onChange={(e) => setField("yearly_credit_type", e.target.value)}
                            >
                              <option value="all_at_once">Credit all at once</option>
                              <option value="monthly">Credit monthly (divided by 12)</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">How annual leaves are credited to employees.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="limit_max_leave_per_month"
                              checked={policy.limit_max_leave_per_month !== false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setField("limit_max_leave_per_month", checked);
                                if (!checked) {
                                  setField("max_leave_per_month", 0);
                                } else {
                                  setField("max_leave_per_month", 2);
                                }
                              }}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="limit_max_leave_per_month" className="text-sm font-medium text-gray-700">
                              Limit max leaves per month
                            </label>
                          </div>

                          {policy.limit_max_leave_per_month !== false && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Leaves per Month<span className="text-red-500 ml-1">*</span>
                              </label>
                              <input
                                type="number"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.max_leave_per_month ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                min={1}
                                value={policy.max_leave_per_month}
                                onChange={(e) => setField("max_leave_per_month", Number(e.target.value))}
                              />
                              {formErrors.max_leave_per_month && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.max_leave_per_month}</p>
                              )}
                              <p className="mt-1 text-xs text-gray-500">Monthly cap on leaves taken, within the annual total.</p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Annual Carry Forward Allowed
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={(policy.max_carry_forward_leaves ?? 0) > 0 || policy.carry_forward_all ? "true" : "false"}
                              onChange={(e) => {
                                const yes = e.target.value === "true";
                                if (!yes) {
                                  setField("max_carry_forward_leaves", 0);
                                  setField("carry_forward_all", false);
                                } else {
                                  setField("max_carry_forward_leaves", policy.max_carry_forward_leaves || 12);
                                }
                              }}
                            >
                              <option value="false">No</option>
                              <option value="true">Yes</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">Enable or disable carrying unused annual leaves to next year.</p>
                          </div>

                          {((policy.max_carry_forward_leaves ?? 0) > 0 || policy.carry_forward_all) && (
                            <div className="flex flex-col justify-end">
                              <div className="flex items-center space-x-2 mb-2">
                                <input
                                  type="checkbox"
                                  id="carry_forward_all_yearly"
                                  checked={policy.carry_forward_all || false}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setField("carry_forward_all", checked);
                                    if (checked) {
                                      setField("max_carry_forward_leaves", 0);
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="carry_forward_all_yearly" className="text-sm font-medium text-gray-700">
                                  Carry forward all remaining balances
                                </label>
                              </div>

                              {!policy.carry_forward_all && (
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Carry-forward Limit (yearly)
                                  </label>
                                  <input
                                    type="number"
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.max_carry_forward_leaves ? 'border-red-500' : 'border-gray-300'
                                      }`}
                                    min={1}
                                    value={policy.max_carry_forward_leaves}
                                    onChange={(e) => setField("max_carry_forward_leaves", Number(e.target.value))}
                                  />
                                  {formErrors.max_carry_forward_leaves && (
                                    <p className="mt-1 text-sm text-red-600">{formErrors.max_carry_forward_leaves}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <div className="border-t pt-6 mt-6">
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Leave Types Breakdown</h4>
                      <p className="text-sm text-gray-600 mb-4">Sum of type allocations must equal total leaves for the selected cycle.</p>

                      <div className="space-y-3">
                        {(policy.leave_breakdown || []).map((row, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <input
                              type="text"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Leave type (e.g., Sick Leave)"
                              value={row.type}
                              onChange={(e) => {
                                const next = [...(policy.leave_breakdown || [])];
                                next[idx] = { ...row, type: e.target.value };
                                setField("leave_breakdown", next);
                              }}
                            />
                            <input
                              type="number"
                              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              min={0}
                              placeholder="Days"
                              value={row.allocation}
                              onChange={(e) => {
                                const next = [...(policy.leave_breakdown || [])];
                                next[idx] = { ...row, allocation: Number(e.target.value) };
                                setField("leave_breakdown", next);
                              }}
                            />
                            {(policy.leave_breakdown || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(policy.leave_breakdown || [])];
                                  next.splice(idx, 1);
                                  setField("leave_breakdown", next);
                                }}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            const expected = policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves;
                            const next = [...(policy.leave_breakdown || [])];
                            const allocated = next.reduce((a, b) => a + (Number(b.allocation) || 0), 0);
                            next.push({
                              type: "",
                              allocation: Math.max(0, expected - allocated)
                            });
                            setField("leave_breakdown", next);
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          Add Leave Type
                        </button>

                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-medium">Expected Total: </span>
                            <span className="text-blue-600">
                              {policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves} days
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">Breakdown Total: </span>
                            <span className={`${(policy.leave_breakdown || []).reduce((a, b) => a + (Number(b.allocation) || 0), 0) ===
                              (policy.leave_cycle === "monthly" ? policy.max_leave_per_month : policy.total_annual_leaves)
                              ? 'text-green-600'
                              : 'text-red-600'
                              }`}>
                              {(policy.leave_breakdown || []).reduce((a, b) => a + (Number(b.allocation) || 0), 0)} days
                            </span>
                          </div>
                        </div>

                        {formErrors.leave_breakdown && (
                          <p className="text-sm text-red-600">{formErrors.leave_breakdown}</p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Step 3: Work Hours & Rules */}
                {wizardStep === 3 && (
                  <>
                    <div className="border-b pb-4 mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Work Hours & Rules</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Standard Work Hours (minutes)<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.standard_work_hours ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={1}
                          value={policy.standard_work_hours}
                          onChange={(e) => setField("standard_work_hours", Number(e.target.value))}
                        />
                        {formErrors.standard_work_hours && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.standard_work_hours}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Typical daily work time ({formatMinutesToHours(policy.standard_work_hours)})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Sessions Allowed<span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.max_sessions_allowed ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={1}
                          value={policy.max_sessions_allowed}
                          onChange={(e) => setField("max_sessions_allowed", Number(e.target.value))}
                        />
                        {formErrors.max_sessions_allowed && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.max_sessions_allowed}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Number of check-ins/outs allowed per day (Default: 1)
                        </p>
                      </div>

                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Grace Period Type
                        </label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              checked={policy.grace_period_type === "minutes"}
                              onChange={() => setField("grace_period_type", "minutes")}
                            />
                            <span className="ml-2 text-sm text-gray-700">Minutes</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              checked={policy.grace_period_type === "specific_time"}
                              onChange={() => setField("grace_period_type", "specific_time")}
                            />
                            <span className="ml-2 text-sm text-gray-700">Specific Time</span>
                          </label>
                        </div>
                        
                        {policy.grace_period_type === "minutes" ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Grace Period (minutes)
                            </label>
                            <input
                              type="number"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.grace_period_minutes ? 'border-red-500' : 'border-gray-300'
                                }`}
                              min={0}
                              value={policy.grace_period_minutes}
                              onChange={(e) => setField("grace_period_minutes", Number(e.target.value))}
                            />
                            {formErrors.grace_period_minutes && (
                              <p className="mt-1 text-sm text-red-600">{formErrors.grace_period_minutes}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">
                              Window before a late mark is recorded ({formatMinutesToHours(policy.grace_period_minutes)})
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Late Mark After Time
                              </label>
                              <input
                                type="time"
                                step="1"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.grace_period_specific_time_late ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                value={policy.grace_period_specific_time_late || ""}
                                onChange={(e) => setField("grace_period_specific_time_late", e.target.value)}
                              />
                              {formErrors.grace_period_specific_time_late && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.grace_period_specific_time_late}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Early Leave Before Time
                              </label>
                              <input
                                type="time"
                                step="1"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.grace_period_specific_time_early ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                value={policy.grace_period_specific_time_early || ""}
                                onChange={(e) => setField("grace_period_specific_time_early", e.target.value)}
                              />
                              {formErrors.grace_period_specific_time_early && (
                                <p className="mt-1 text-sm text-red-600">{formErrors.grace_period_specific_time_early}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="apply_grace_on_checkin"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={policy.apply_grace_on_checkin !== false}
                            onChange={(e) => setField("apply_grace_on_checkin", e.target.checked)}
                          />
                          <label htmlFor="apply_grace_on_checkin" className="text-sm font-medium text-gray-700">
                            Apply Grace on Check-in
                          </label>
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="apply_grace_on_checkout"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={policy.apply_grace_on_checkout !== false}
                            onChange={(e) => setField("apply_grace_on_checkout", e.target.checked)}
                          />
                          <label htmlFor="apply_grace_on_checkout" className="text-sm font-medium text-gray-700">
                            Apply Grace on Check-out
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Late Marks / Month
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.max_late_marks_per_month ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.max_late_marks_per_month}
                          onChange={(e) => setField("max_late_marks_per_month", Number(e.target.value))}
                        />
                        {formErrors.max_late_marks_per_month && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.max_late_marks_per_month}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">After this count, penalties apply.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Late Mark Penalty
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.late_mark_penalty}
                          onChange={(e) => setField("late_mark_penalty", e.target.value as AttendancePolicy["late_mark_penalty"])}
                        >
                          <option value="none">None</option>
                          <option value="half_day">Half-day</option>
                          <option value="full_day">Full-day</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Penalty applied after exceeding max late marks.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Late Logout Redeem Minutes
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.late_logout_redeem_minutes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.late_logout_redeem_minutes}
                          onChange={(e) => setField("late_logout_redeem_minutes", Number(e.target.value))}
                        />
                        {formErrors.late_logout_redeem_minutes && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.late_logout_redeem_minutes}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Extra minutes worked late that can redeem future lateness ({formatMinutesToHours(policy.late_logout_redeem_minutes)})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Redeem Next-day Allowed
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.redeem_nextday_allowed ? "true" : "false"}
                          onChange={(e) => setField("redeem_nextday_allowed", e.target.value === "true")}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Whether late logout can offset next day's lateness.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Redeem Carry-forward Days
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.redeem_carry_forward_days ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.redeem_carry_forward_days}
                          onChange={(e) => setField("redeem_carry_forward_days", Number(e.target.value))}
                        />
                        {formErrors.redeem_carry_forward_days && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.redeem_carry_forward_days}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Number of days late logout credit can be carried forward.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Half Day Threshold (%)
                          <span className="text-xs text-gray-500 ml-2">Minimum % of shift to mark half day</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.half_day_threshold_percent ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="50"
                          value={policy.half_day_threshold_percent}
                          onChange={(e) => setField("half_day_threshold_percent", Number(e.target.value))}
                        />
                        {formErrors.half_day_threshold_percent && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.half_day_threshold_percent}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Day Threshold (%)
                          <span className="text-xs text-gray-500 ml-2">Minimum % of shift to mark full day</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.full_day_threshold_percent ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="75"
                          value={policy.full_day_threshold_percent}
                          onChange={(e) => setField("full_day_threshold_percent", Number(e.target.value))}
                        />
                        {formErrors.full_day_threshold_percent && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.full_day_threshold_percent}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Day becomes half-day if worked hours fall below this percentage of standard hours.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Allow Early Login
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.allow_early_login ? "true" : "false"}
                          onChange={(e) => {
                            const yes = e.target.value === "true";
                            setField("allow_early_login", yes);
                            if (!yes) setField("early_login_minutes", 0);
                          }}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Enable if employees may login before shift start.</p>
                      </div>

                      {policy.allow_early_login && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Minutes Before Start (early login)
                          </label>
                          <input
                            type="number"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.early_login_minutes ? 'border-red-500' : 'border-gray-300'
                              }`}
                            min={0}
                            value={policy.early_login_minutes}
                            onChange={(e) => setField("early_login_minutes", Number(e.target.value))}
                          />
                          {formErrors.early_login_minutes && (
                            <p className="mt-1 text-sm text-red-600">{formErrors.early_login_minutes}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            How many minutes before shift start check-in is allowed ({formatMinutesToHours(policy.early_login_minutes)})
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Block Check-in After (minutes)
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.dont_allow_checkin_after_minutes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.dont_allow_checkin_after_minutes}
                          onChange={(e) => setField("dont_allow_checkin_after_minutes", Number(e.target.value))}
                        />
                        {formErrors.dont_allow_checkin_after_minutes && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.dont_allow_checkin_after_minutes}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Block check-in after this window from shift start ({formatMinutesToHours(policy.dont_allow_checkin_after_minutes)})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Late Threshold for Half-day (minutes)
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.late_threshold_for_halfday_minutes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.late_threshold_for_halfday_minutes}
                          onChange={(e) => setField("late_threshold_for_halfday_minutes", Number(e.target.value))}
                        />
                        {formErrors.late_threshold_for_halfday_minutes && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.late_threshold_for_halfday_minutes}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Example: For 8-hour workday, 10% = 48 minutes. If user checks in after 48 minutes, it will be considered half-day.
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <Clock className="w-5 h-5 text-blue-600" />
                        <h5 className="font-semibold text-blue-900">Absolute Time Thresholds</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center space-x-3 md:col-span-2">
                          <input
                            type="checkbox"
                            id="use_time_thresholds"
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={policy.use_time_thresholds}
                            onChange={(e) => setField("use_time_thresholds", e.target.checked)}
                          />
                          <label htmlFor="use_time_thresholds" className="text-sm font-medium text-gray-700">
                            Use Absolute Time Thresholds (Override Percentages)
                          </label>
                        </div>

                        {policy.use_time_thresholds && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Half-Day if Check-in After
                              </label>
                              <input
                                type="time"
                                step="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={policy.halfday_late_threshold_time}
                                onChange={(e) => setField("halfday_late_threshold_time", e.target.value)}
                              />
                              <p className="mt-1 text-xs text-gray-500">Punches after this time automatically become Half-Day. No late mark will be applied.</p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Half-Day if Check-out Before
                              </label>
                              <input
                                type="time"
                                step="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={policy.fullday_early_threshold_time}
                                onChange={(e) => setField("fullday_early_threshold_time", e.target.value)}
                              />
                              <p className="mt-1 text-xs text-gray-500">Punches out before this time automatically become Half-Day.</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auto Convert to Compoff
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.auto_convert_to_compoff ? "true" : "false"}
                          onChange={(e) => setField("auto_convert_to_compoff", e.target.value === "true")}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Automatically grant comp-off when extra work meets threshold.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Min Extra Work for Compoff (minutes)
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.min_extra_work_for_compoff_minutes ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.min_extra_work_for_compoff_minutes}
                          onChange={(e) => setField("min_extra_work_for_compoff_minutes", Number(e.target.value))}
                        />
                        {formErrors.min_extra_work_for_compoff_minutes && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.min_extra_work_for_compoff_minutes}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Minimum extra minutes required to earn a comp-off day ({formatMinutesToHours(policy.min_extra_work_for_compoff_minutes)})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comp-Off Half Day Work (hours)
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.compoff_halfday_hrs ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.compoff_halfday_hrs}
                          onChange={(e) => setField("compoff_halfday_hrs", Number(e.target.value))}
                        />
                        {formErrors.compoff_halfday_hrs && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.compoff_halfday_hrs}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Hours required on WO/Holiday (or Night OT if Hours-wise) for 0.5 comp-off credit
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comp-Off Full Day Work (hours)
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.compoff_fullday_hrs ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          value={policy.compoff_fullday_hrs}
                          onChange={(e) => setField("compoff_fullday_hrs", Number(e.target.value))}
                        />
                        {formErrors.compoff_fullday_hrs && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.compoff_fullday_hrs}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Hours required on WO/Holiday (or Night OT if Hours-wise) for 1.0 comp-off credit
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Compoff Requires Approval
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.compoff_requires_approval ? "true" : "false"}
                          onChange={(e) => setField("compoff_requires_approval", e.target.value === "true")}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">If enabled, comp-off issuance needs manager approval.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Regularization Allowed Days
                        </label>
                        <input
                          type="number"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.regularization_allowed_days ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min={0}
                          max={31}
                          value={policy.regularization_allowed_days}
                          onChange={(e) => setField("regularization_allowed_days", Number(e.target.value))}
                        />
                        {formErrors.regularization_allowed_days && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.regularization_allowed_days}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Number of days back users can regularize (0-31). 0 means no restriction or immediate only.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Regularization Cutoff Time
                        </label>
                        <input
                          type="time"
                          step="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.regularization_cutoff_time}
                          onChange={(e) => setField("regularization_cutoff_time", e.target.value)}
                        />
                        <p className="mt-1 text-xs text-gray-500">Cutoff time on the last allowed day.</p>
                      </div>

                      <div className="flex flex-col">
                        <label className="flex items-center space-x-2 mb-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={policy.allow_regularization}
                            onChange={(e) => setField("allow_regularization", e.target.checked)}
                          />
                          <span className="text-sm font-medium text-gray-700">Allow Regularization</span>
                        </label>
                        <p className="text-xs text-gray-500">General toggle to enable/disable regularization requests.</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Max Regularizations Per Month
                        </label>
                        <input
                          type="number"
                          disabled={!policy.allow_regularization}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.regularizations_limit_per_month ? 'border-red-500' : 'border-gray-300'}`}
                          min={0}
                          value={policy.regularizations_limit_per_month}
                          onChange={(e) => setField("regularizations_limit_per_month", Number(e.target.value))}
                        />
                        {formErrors.regularizations_limit_per_month && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.regularizations_limit_per_month}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Limit of requests an employee can submit per month.</p>
                      </div>

                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Auto-adjust Leaves & Comp Offs
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={policy.adjust_leave_compoff !== false ? "true" : "false"}
                          onChange={(e) => setField("adjust_leave_compoff", e.target.value === "true")}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          If enabled, system will automatically deduct Paid Leaves and Comp Offs for absent days during payroll.
                        </p>
                      </div>
                    </div>

                      {/* Night OT Configuration */}
                    <div className="border-t pt-6 mt-6">
                      <h5 className="text-md font-semibold text-gray-900 mb-4">Night OT Configuration</h5>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Allow Night OT
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            value={policy.allow_night_ot ? "true" : "false"}
                            onChange={(e) => setField("allow_night_ot", e.target.value === "true")}
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Enable Night OT for day shift employees (excludes night shift workers)
                          </p>
                        </div>

                        {policy.allow_night_ot && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Calculation Method
                            </label>
                            <select
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                              value={policy.night_ot_type || "hours"}
                              onChange={(e) => setField("night_ot_type", e.target.value as "hours" | "time")}
                            >
                              <option value="hours">Hours Wise (Thresholds)</option>
                              <option value="time">Time Wise (After Midnight)</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                              Choose how credit is calculated for Night OT
                            </p>
                          </div>
                        )}
                      </div>

                      {policy.allow_night_ot && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {policy.night_ot_type === "hours" ? (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Min Night OT Duration %
                                  </label>
                                  <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    min={1}
                                    max={100}
                                    value={policy.night_shift_min_percentage || 50}
                                    onChange={(e) => setField("night_shift_min_percentage", Number(e.target.value))}
                                  />
                                  <p className="mt-1 text-xs text-gray-500">
                                    Minimum % of standard hours required to qualify for ANY credit. (Half-day if &gt;= {policy.compoff_halfday_hrs}h, Full-day if &gt;= {policy.compoff_fullday_hrs}h)
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Half Day Credit After
                                  </label>
                                  <input
                                    type="time"
                                    step="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={policy.night_ot_half_day_time || "00:30:00"}
                                    onChange={(e) => setField("night_ot_half_day_time", e.target.value)}
                                  />
                                  <p className="mt-1 text-xs text-gray-500">
                                    Punch-out after this time grants 0.5 comp-off
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Day Credit After
                                  </label>
                                  <input
                                    type="time"
                                    step="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={policy.night_ot_full_day_time || "02:00:00"}
                                    onChange={(e) => setField("night_ot_full_day_time", e.target.value)}
                                  />
                                  <p className="mt-1 text-xs text-gray-500">
                                    Punch-out after this time grants 1.0 comp-off
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="night_ot_compoff"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={policy.night_ot_compoff_conversion || false}
                                onChange={(e) => setField("night_ot_compoff_conversion", e.target.checked)}
                              />
                              <label htmlFor="night_ot_compoff" className="text-sm font-medium text-gray-700">
                                Convert to Comp-Off Automatically
                              </label>
                            </div>
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id="auto_adjust_night_ot_next_day"
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                checked={policy.auto_adjust_night_ot_next_day || false}
                                onChange={(e) => setField("auto_adjust_night_ot_next_day", e.target.checked)}
                              />
                              <label htmlFor="auto_adjust_night_ot_next_day" className="text-sm font-medium text-gray-700">
                                Auto Adjust Night OT Against Next Day Absence
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Display Settings */}
                      <h5 className="text-md font-semibold text-gray-900 mb-4">Employee App Display Settings</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Show Grace Minutes
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={policy.show_grace_minutes !== false ? "true" : "false"}
                            onChange={(e) => setField("show_grace_minutes", e.target.value === "true")}
                          >
                            <option value="true">Show</option>
                            <option value="false">Hide</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">Show/Hide grace usage in app</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Show Late Minutes
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={policy.show_late_min !== false ? "true" : "false"}
                            onChange={(e) => setField("show_late_min", e.target.value === "true")}
                          >
                            <option value="true">Show</option>
                            <option value="false">Hide</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">Show/Hide late minutes in app</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Show OT Minutes
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={policy.show_ot_minutes !== false ? "true" : "false"}
                            onChange={(e) => setField("show_ot_minutes", e.target.value === "true")}
                          >
                            <option value="true">Show</option>
                            <option value="false">Hide</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">Show/Hide overtime in app</p>
                      </div>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between space-x-3">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                {wizardStep < 3 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={saving}
                      className={`px-4 py-2 rounded-lg transition-colors ${!saving
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        }`}
                    >
                      {saving ? 'Saving...' : selectedId ? 'Save Changes' : 'Create Policy'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && policyToDelete && (
        <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Delete Policy</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPolicyToDelete(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete policy "<strong>{policyToDelete.policy_name}</strong>"?
                This action cannot be undone.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPolicyToDelete(null);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={actionLoading === `delete-${policyToDelete.id}`}
                className={`px-4 py-2 rounded-lg transition-colors ${!actionLoading
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
              >
                {actionLoading ? 'Deleting...' : 'Delete Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Attendance Policies</h1>
            <p className="text-sm text-gray-600 mt-0.5">{totalItems} policies found</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (filtersExpanded) {
                  clearFilters();
                }
                setFiltersExpanded(!filtersExpanded);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {(role !== "Employee" || hasPerm("POLICY_ADD")) && (
              <button
                onClick={openCreate}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Policy</span>
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
                  placeholder="Search policies..."
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
                value={cycleFilter}
                onChange={(e) => setCycleFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Cycles</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
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

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>{success}</span>
              {successTimer > 0 && (
                <span className="ml-2 text-xs text-green-600">
                  (Auto-closing in {successTimer}s)
                </span>
              )}
            </div>
            <button
              onClick={() => setSuccess("")}
              className="text-green-700 hover:text-green-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Policies Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] relative">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaves</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {policies.map((policyItem) => (
                <tr key={policyItem.id ?? policyItem.policy_name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{policyItem.policy_name}</div>
                      {policyItem.policy_description && (
                        <div className="text-xs text-gray-500 truncate max-w-xs">{policyItem.policy_description}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {policyItem.leave_cycle}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {policyItem.leave_cycle === 'monthly'
                        ? `${policyItem.max_leave_per_month}/month`
                        : `${policyItem.total_annual_leaves}/year${policyItem.limit_max_leave_per_month !== false ? ` (${policyItem.max_leave_per_month}/mo max)` : ""}`
                      }
                    </div>
                    <div className="text-xs text-gray-500">
                      {policyItem.carry_forward_all
                        ? 'All balance carried forward'
                        : (policyItem.max_carry_forward_leaves > 0
                          ? `${policyItem.max_carry_forward_leaves} carry forward`
                          : 'No carry forward')
                      }
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">
                      {policyItem.standard_work_hours} min
                    </div>
                    <div className="text-xs text-gray-500">
                      {policyItem.grace_period_minutes} min grace
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1.5">
                      {getStatusIcon(policyItem.status || 'active')}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(policyItem.status || 'active')} capitalize`}>
                        {policyItem.status || 'active'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ActionDropdown policy={policyItem} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {policies.length === 0 && !loading && (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No policies found</h3>
            <p className="text-xs text-gray-500 mb-3">No policies match your current filters.</p>
            {(role !== "Employee" || hasPerm("POLICY_ADD")) && (
              <button
                onClick={openCreate}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm mx-auto"
              >
                <Plus className="w-3 h-3" />
                <span>Add First Policy</span>
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
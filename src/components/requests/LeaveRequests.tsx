"use client";

import React, { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Calendar,
  Clock,
  Building,
  Mail,
  Phone,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Check,
  Eye,
  ThumbsUp,
  ThumbsDown,
  FileText,
  Settings,
  MapPin,
  Plus,
  ChevronDown,
  ChevronUp,
  Users
} from "lucide-react";


type LeaveItem = Record<string, any>;

type Props = {
  defaultHQ?: boolean;
  showHQToggle?: boolean;
  externalControl?: boolean;
  hqMode?: boolean;
  selectedSiteId?: number | null;
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

// Countdown hook for timeline
function useCountdown(levelStartedAt: string | null, timelineHours: number | null, timelineDueAt?: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ hours: number, minutes: number, seconds: number, expired: boolean } | null>(null);

  useEffect(() => {
    // If we have a direct due date, use it
    if (timelineDueAt) {
      const calculateTimeLeft = () => {
        try {
          const dateStr = timelineDueAt.includes('Z') ? timelineDueAt : timelineDueAt + 'Z';
          const deadline = new Date(dateStr).getTime();

          if (isNaN(deadline)) {
            return { hours: 0, minutes: 0, seconds: 0, expired: true };
          }

          const now = Date.now();
          const diff = deadline - now;

          if (diff <= 0) {
            return { hours: 0, minutes: 0, seconds: 0, expired: true };
          }

          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          return { hours, minutes, seconds, expired: false };
        } catch (error) {
          console.error('Error calculating countdown:', error);
          return { hours: 0, minutes: 0, seconds: 0, expired: true };
        }
      };

      setTimeLeft(calculateTimeLeft());
      const interval = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(interval);
    }

    // Fallback: calculate from level_started_at + timeline_hours
    if (!levelStartedAt || !timelineHours || timelineHours <= 0) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      try {
        // Parse the UTC timestamp and keep it in UTC
        const dateStr = levelStartedAt.includes('Z') ? levelStartedAt : levelStartedAt + 'Z';
        const start = new Date(dateStr).getTime();

        // Validate the parsed date
        if (isNaN(start)) {
          return { hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        const deadline = start + (timelineHours * 60 * 60 * 1000);
        const now = Date.now(); // Current time in UTC milliseconds

        const diff = deadline - now;

        if (diff <= 0) {
          return { hours: 0, minutes: 0, seconds: 0, expired: true };
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return { hours, minutes, seconds, expired: false };
      } catch (error) {
        console.error('Error calculating countdown:', error);
        return { hours: 0, minutes: 0, seconds: 0, expired: true };
      }
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [levelStartedAt, timelineHours, timelineDueAt]);

  return timeLeft;
}

export default function LeaveRequests({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
  const { role, permissions, user, employee } = useAuth();
  // Permissions
  const isEmployee = (role || "").toLowerCase() === "employee";
  const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const hasAnyLeaveAccess = !isEmployee || ["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"].some((c) => hasPerm(c));
  const canHRMode = !isEmployee || hasPerm("HR_MODE");
  const canAddLeave = isOrgAdmin || hasPerm("LEAVE_ADD");

  // State
  const [hqMode, setHqMode] = useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(extSiteId ?? null);
  const [status, setStatus] = useState<string>("All");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [items, setItems] = useState<LeaveItem[]>([]);
  const [stats, setStats] = useState<{ pending_overall: number; month_approved: number; month_rejected: number; month_total: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [total, setTotal] = useState<number>(0);

  // UI State
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"approve" | "reject">("approve");
  const [modalReason, setModalReason] = useState<string>("");
  const [activeItem, setActiveItem] = useState<LeaveItem | null>(null);
  const [rejectOption, setRejectOption] = useState<"reject_final" | "proceed_next">("reject_final");

  // Details view modal state
  const [viewOpen, setViewOpen] = useState<boolean>(false);
  const [viewLoading, setViewLoading] = useState<boolean>(false);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewData, setViewData] = useState<Record<string, any> | null>(null);

  // Add Leave modal state
  const [addLeaveOpen, setAddLeaveOpen] = useState<boolean>(false);

  const [employees, setEmployees] = useState<Array<Record<string, any>>>([]);
  const [leaveTypes, setLeaveTypes] = useState<Array<Record<string, any>>>([]);
  const [addLeaveForm, setAddLeaveForm] = useState({
    employee_ids: [] as string[],  // Changed from employee_id to support multi-select
    leave_type: "",
    start_date: "",
    end_date: "",
    session: "Full Day",
    reason: "",
  });

  // Employee selector optimization states
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState("");
  const [employeePage, setEmployeePage] = useState(1);
  const [employeePageSize] = useState(20);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeesTotal, setEmployeesTotal] = useState(0);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<Array<Record<string, any>>>([]);
  const [leaveBalances, setLeaveBalances] = useState<Record<string, number>>({});

  // Tab control
  const [activeTab, setActiveTab] = useState<"requests" | "balances">("requests");

  // Balance management states
  const [balSearch, setBalSearch] = useState("");
  const [balDept, setBalDept] = useState("");
  const [balEmployees, setBalEmployees] = useState<Array<Record<string, any>>>([]);
  const [balEmployeesTotal, setBalEmployeesTotal] = useState(0);
  const [balEmployeesLoading, setBalEmployeesLoading] = useState(false);
  const [balPage, setBalPage] = useState(1);
  const [balSelectedEmployee, setBalSelectedEmployee] = useState<Record<string, any> | null>(null);
  const [balSelectedEmployeeBalances, setBalSelectedEmployeeBalances] = useState<Array<Record<string, any>>>([]);
  const [balBalancesLoading, setBalBalancesLoading] = useState(false);

  // Balance adjustment modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [balActivePeriodLabel, setBalActivePeriodLabel] = useState("");
  const [adjustForm, setAdjustForm] = useState({
    id: undefined as number | undefined,
    employee_id: 0,
    leave_type: "",
    total_allocated: 0,
    used: 0,
    carry_forward: 0,
    period_year: new Date().getFullYear(),
    period_month: null as number | null,
  });

  // Edit Leave Request state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    start_date: "",
    end_date: "",
    session: "Full Day",
    reason: ""
  });

  // Stats animation
  const pendingCount = useCountUp(stats?.pending_overall || 0);
  const approvedCount = useCountUp(stats?.month_approved || 0);
  const rejectedCount = useCountUp(stats?.month_rejected || 0);
  const totalCount = useCountUp(stats?.month_total || 0);

  const visibleItems = items;
  const totalEntries = total;
  const pageStart = (page - 1) * pageSize;
  const pageSlice = items;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Auto-select first site for non-HR/non-OrgAdmin users on first load
  useEffect(() => {
    if (inchargeSites.length > 0 && !canHRMode && !isOrgAdmin && selectedSiteId === null) {
      const firstSiteId = inchargeSites[0]?.id;
      if (firstSiteId) {
        setSelectedSiteId(typeof firstSiteId === "number" ? firstSiteId : parseInt(String(firstSiteId)) || null);
      }
    }
  }, [inchargeSites, canHRMode, isOrgAdmin, selectedSiteId]);

  // Fetch session and permissions
  useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole((session.role || null) as string | null);
          // setPermissions(session.employee?.permissions || []);
          if ((session.role || '').toLowerCase() === 'orgadmin') {
            setHqMode(true);
          }
        }
      } catch { }

      try {
        const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
        const list = Array.isArray(res?.sites) ? res!.sites! : [];
        setInchargeSites(list as any[]);
        if (list.length > 0 && selectedSiteId == null) {
          const sid = list[0]?.id;
          setSelectedSiteId(typeof sid === "number" ? sid : parseInt(String(sid)) || null);
        }
      } catch (e) { }

      if (canHRMode) {
        try {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        } catch { }
      }
    })();
  }, []);

  // Fetch all sites when HR capability becomes available
  useEffect(() => {
    (async () => {
      if (!canHRMode || allSites.length > 0) return;
      try {
        const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
        setAllSites(list as any[]);
      } catch { }
    })();
  }, [canHRMode]);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (status && status !== "All") params["status"] = status;
      const effHq = isOrgAdmin || (((externalControl ? (extHq ?? hqMode) : hqMode)) && canHRMode);
      const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;

      if (!effHq && (!effSite || Number(effSite) <= 0)) {
        setItems([]);
        throw new Error("Select a site or enable HR mode to view leave requests");
      }
      if (effHq) {
        params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
      } else if (effSite) {
        params["site_id"] = String(effSite);
      }
      if (fromDate) params["start"] = fromDate;
      if (toDate) params["end"] = toDate;
      if (search) params["search"] = search;

      params["page"] = String(page);
      params["limit"] = String(pageSize);

      const res = await apiClient<any>("/leaves/requests", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res) ? res : (res?.items || res?.rows || res?.requests || res?.data || []);
      const totalCount = res?.total || (Array.isArray(res) ? res.length : 0);

      setItems(list.map((e: any) => ({ ...(e || {}) })));
      setTotal(totalCount);
    } catch (e: any) {
      setError(e?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [status, hqMode, selectedSiteId, fromDate, toDate, search, page, pageSize, externalControl, extHq, extSiteId, isOrgAdmin, canHRMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchList();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchList]);

  useEffect(() => {
    (async () => {
      try {
        setStatsLoading(true);
        const params: Record<string, string> = {};
        const effHq = externalControl ? extHq : hqMode;
        const effSite = externalControl ? extSiteId : selectedSiteId;
        if (effHq) params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
        if (fromDate) params["start"] = fromDate;
        if (toDate) params["end"] = toDate;
        const res = await apiClient<any>("/leaves/requests/stats", { method: "GET", params, withAuth: true });
        const data = (res?.data ?? res) as any;
        setStats({
          pending_overall: Number(data?.pending_overall || 0),
          month_approved: Number(data?.month_approved || 0),
          month_rejected: Number(data?.month_rejected || 0),
          month_total: Number(data?.month_total || 0),
        });
      } catch (_) {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [status, externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId, fromDate, toDate]);

  // Fetch employees when search/filter/page changes (with debounce for search)
  useEffect(() => {
    if (!addLeaveOpen) return;

    const timer = setTimeout(() => {
      fetchEmployeesForLeave();
    }, employeeSearch ? 500 : 0); // 500ms debounce for search, immediate for filter/page

    return () => clearTimeout(timer);
  }, [employeeSearch, employeeDepartmentFilter, employeePage, addLeaveOpen]);

  const fetchBalEmployees = async () => {
    try {
      setBalEmployeesLoading(true);
      const params: Record<string, string> = {
        page: String(balPage),
        limit: "10",
      };

      if (balSearch) params.search = balSearch;
      if (balDept) params.department = balDept;

      const res = await apiClient<any>("/organization/employees", {
        method: "GET",
        withAuth: true,
        params
      });

      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setBalEmployees(list);
      setBalEmployeesTotal(res?.total || list.length);
    } catch (e) {
      console.error("Failed to fetch balance tab employees", e);
      setBalEmployees([]);
    } finally {
      setBalEmployeesLoading(false);
    }
  };

  const fetchEmployeeBalancesDetail = async (empId: number) => {
    try {
      setBalBalancesLoading(true);
      const res = await apiClient<any>("/leaves/balances", {
        method: "GET",
        // No period_year/period_month — backend defaults to the current active period:
        // monthly cycle → current month; yearly cycle → period_month IS NULL
        params: { employee_id: String(empId) },
        withAuth: true
      });
      const list = Array.isArray(res) ? res : (res?.balances || res?.data || []);
      const pol = res?.policy || null;
      const now = new Date();
      setBalActivePeriodLabel(
        pol?.leave_cycle === "monthly"
          ? `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][now.getMonth()]} ${now.getFullYear()}`
          : `FY ${now.getFullYear()}`
      );
      setBalSelectedEmployeeBalances(list);
    } catch (e) {
      console.error("Failed to fetch employee balances detail", e);
      setBalSelectedEmployeeBalances([]);
    } finally {
      setBalBalancesLoading(false);
    }
  };

  const handleAdjustSubmit = async () => {
    if (!adjustForm.employee_id || !adjustForm.leave_type) {
      showNotification("Missing employee or leave type", "error");
      return;
    }
    try {
      setActionLoading("adjust_balance");
      await apiClient("/leaves/balances/adjust", {
        method: "POST",
        body: adjustForm,
        withAuth: true
      });
      showNotification("Leave balance adjusted successfully", "success");
      setAdjustModalOpen(false);
      if (balSelectedEmployee) {
        fetchEmployeeBalancesDetail(balSelectedEmployee.id);
      }
    } catch (e: any) {
      showNotification(e?.message || "Failed to adjust leave balance", "error");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (activeTab !== "balances") return;
    const timer = setTimeout(() => {
      fetchBalEmployees();
    }, balSearch ? 500 : 0);
    return () => clearTimeout(timer);
  }, [balSearch, balDept, balPage, activeTab]);

  useEffect(() => {
    if (activeTab === "balances" && departments.length === 0) {
      (async () => {
        try {
          const res = await apiClient<any>("/organization/departments", { method: "GET", withAuth: true });
          const depts = Array.isArray(res?.data) ? res.data.map((d: any) => d.name || d) : [];
          setDepartments(depts);
        } catch (e) {
          console.error("Failed to fetch departments", e);
        }
      })();
    }
    if (activeTab === "balances" && leaveTypes.length === 0) {
      (async () => {
        try {
          const res = await apiClient<any>("/leaves/types", { method: "GET", withAuth: true });
          const types = Array.isArray(res?.types) ? res.types : [];
          setLeaveTypes(types.length > 0 ? types : [
            { id: 1, name: "Casual Leave" },
            { id: 2, name: "Sick Leave" },
            { id: 3, name: "Earned Leave" }
          ]);
        } catch (e) {
          setLeaveTypes([
            { id: 1, name: "Casual Leave" },
            { id: 2, name: "Sick Leave" },
            { id: 3, name: "Earned Leave" }
          ]);
        }
      })();
    }
  }, [activeTab]);

  // Helper function to check if current user can approve the current level
  const canUserApproveLevel = (item: LeaveItem, timeline?: any[]) => {
    if (!timeline || timeline.length === 0) return false;

    // Find the current pending level
    const currentLevel = timeline.find(t => t.is_current && t.status === 'pending');
    if (!currentLevel) return false;

    const currentEmployeeId = employee?.id;
    if (!currentEmployeeId) return false;

    // Check if user is in the approver list for this level
    if (currentLevel.approver_type === 'employee' && currentLevel.approver_employee_ids) {
      const approverIds = currentLevel.approver_employee_ids.split(',').map((id: string) => parseInt(id.trim()));
      return approverIds.includes(currentEmployeeId);
    }

    // For role-based, we'd need to check if user has that role
    // This would require additional data from the backend
    return false;
  };


  const approve = async (id: number, remarks: string = "") => {
    try {
      setActionLoading(`approve_${id}`);
      await apiClient(`/leaves/requests/${id}`, {
        method: "PATCH",
        body: {
          status: "approved",
          remarks
        },
        withAuth: true
      });

      // Refetch data to get accurate status
      await fetchList();

      showNotification('Leave request approved successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
      showNotification(e?.message || "Failed to approve leave request", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id: number, reason: string, option: "reject_final" | "proceed_next" = "reject_final") => {
    try {
      setActionLoading(`reject_${id}`);
      await apiClient(`/leaves/requests/${id}`, {
        method: "PATCH",
        body: {
          status: "rejected",
          reject_reason: reason,
          remarks: reason
        },
        withAuth: true
      });

      // Refetch data to get accurate status
      await fetchList();

      showNotification('Leave request rejected successfully', 'success');
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
      showNotification(e?.message || "Failed to reject leave request", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openModal = (item: LeaveItem, mode: "approve" | "reject") => {
    setActiveItem(item);
    setModalMode(mode);
    setModalReason("");
    setRejectOption("reject_final"); // Reset to default
    setModalOpen(true);
  };

  const openDetailsView = async (item: LeaveItem) => {
    setActiveItem(item);
    setViewOpen(true);
    setViewLoading(true);
    setViewError(null);
    setViewData(null);
    try {
      const empId = Number(item.employee_id || item.employeeId || item.employee_id_pk || item.emp_id);
      if (!empId || Number.isNaN(empId)) throw new Error("Invalid employee id");

      const [empRes, timelineRes] = await Promise.allSettled([
        apiClient<any>(`/organization/employees/${empId}`, { method: "GET", withAuth: true }),
        apiClient<any>(`/leaves/requests/${item.id}/timeline`, { method: "GET", withAuth: true })
      ]);

      const data: Record<string, any> = {};

      if (empRes.status === 'fulfilled' && empRes.value) {
        Object.assign(data, empRes.value.data ?? empRes.value);
      }

      if (timelineRes.status === 'fulfilled' && timelineRes.value) {
        data.timeline = timelineRes.value.timeline || [];
      } else {
        data.timeline = [];
      }

      setViewData(data);
    } catch (e: any) {
      setViewError(e?.message || "Failed to load details");
    } finally {
      setViewLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setActionLoading(`delete_${id}`);
      await apiClient(`/leaves/applications/${id}`, {
        method: "DELETE",
        withAuth: true
      });
      showNotification("Leave request deleted successfully", "success");
      fetchList();
    } catch (e: any) {
      showNotification(e?.message || "Failed to delete leave request", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSubmit = async () => {
    if (!activeItem) return;
    try {
      setActionLoading("edit_leave");
      await apiClient(`/leaves/applications/${activeItem.id}/update`, {
        method: "POST",
        body: editForm,
        withAuth: true
      });
      showNotification("Leave request updated successfully", "success");
      setEditModalOpen(false);
      fetchList();
    } catch (e: any) {
      showNotification(e?.message || "Failed to update leave request", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setActiveItem(null);
    setModalReason("");
  };

  const confirmModal = async () => {
    if (!activeItem) return;
    const id = Number(activeItem.id);

    try {
      if (modalMode === "approve") {
        setActionLoading(`approve_${id}`);
        await approve(id, modalReason.trim());
      } else {
        const reason = modalReason.trim();
        if (!reason) return;
        setActionLoading(`reject_${id}`);
        await reject(id, reason, rejectOption);
      }
      closeModal();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // Add Leave functions - Optimized for 500+ users
  const fetchEmployeesForLeave = async () => {
    try {
      setEmployeesLoading(true);
      const params: Record<string, string> = {
        page: String(employeePage),
        limit: String(employeePageSize),
      };

      if (employeeSearch) params.search = employeeSearch;
      if (employeeDepartmentFilter) params.department = employeeDepartmentFilter;

      const res = await apiClient<any>("/organization/employees", {
        method: "GET",
        withAuth: true,
        params
      });

      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      setEmployees(list);
      setEmployeesTotal(res?.total || list.length);
    } catch (e) {
      console.error("Failed to fetch employees", e);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const openAddLeaveModal = async () => {
    setAddLeaveOpen(true);
    setEmployeePage(1);
    setEmployeeSearch("");
    setEmployeeDepartmentFilter("");

    // Fetch initial employees
    if (employees.length === 0) {
      await fetchEmployeesForLeave();
    }

    // Fetch departments for filter
    if (departments.length === 0) {
      try {
        const res = await apiClient<any>("/organization/departments", { method: "GET", withAuth: true });
        const depts = Array.isArray(res?.data) ? res.data.map((d: any) => d.name || d) : [];
        setDepartments(depts);
      } catch (e) {
        console.error("Failed to fetch departments", e);
      }
    }

    // Fetch leave types dynamically
    if (leaveTypes.length === 0) {
      try {
        const res = await apiClient<any>("/leaves/types", { method: "GET", withAuth: true });
        const types = Array.isArray(res?.types) ? res.types : [];
        setLeaveTypes(types.length > 0 ? types : [
          { id: 1, name: "Casual Leave" },
          { id: 2, name: "Sick Leave" },
          { id: 3, name: "Earned Leave" }
        ]);
      } catch (e) {
        setLeaveTypes([
          { id: 1, name: "Casual Leave" },
          { id: 2, name: "Sick Leave" },
          { id: 3, name: "Earned Leave" }
        ]);
      }
    }
  };

  const closeAddLeaveModal = () => {
    setAddLeaveOpen(false);
    setAddLeaveForm({
      employee_ids: [],
      leave_type: "",
      start_date: "",
      end_date: "",
      session: "Full Day",
      reason: "",
    });
    setSelectedEmployees([]);
    setLeaveBalances({});
    setEmployeeSearch("");
    setEmployeeDepartmentFilter("");
    setEmployeePage(1);
  };


  // Fetch leave balances for selected employees
  const fetchLeaveBalances = async (employeeIds: string[], leaveType: string) => {
    try {
      const res = await apiClient<any>("/leaves/balance", {
        method: "POST",
        body: { employee_ids: employeeIds, leave_type: leaveType },
        withAuth: true
      });

      const balances: Record<string, number> = {};
      res.balances?.forEach((b: any) => {
        balances[`${b.employee_id}_${b.leave_type}`] = b.balance || 0;
      });
      setLeaveBalances(balances);
    } catch (e) {
      console.error("Failed to fetch leave balances", e);
    }
  };

  const submitAddLeave = async () => {
    try {
      if (addLeaveForm.employee_ids.length === 0 || !addLeaveForm.leave_type || !addLeaveForm.start_date || !addLeaveForm.end_date) {
        showNotification("Please fill all required fields", "error");
        return;
      }

      // Note: Balance check is now done in button disabled state, so we can proceed directly

      setActionLoading("add_leave");

      // Submit for each employee
      const promises = addLeaveForm.employee_ids.map(empId =>
        apiClient("/leaves/apply", {
          method: "POST",
          body: {
            employee_id: Number(empId),
            leave_type: addLeaveForm.leave_type,
            start_date: addLeaveForm.start_date,
            end_date: addLeaveForm.end_date,
            session: addLeaveForm.session,
            reason: addLeaveForm.reason,
            auto_approve: true,
            is_comp_off: addLeaveForm.leave_type === 'Comp-off',
            admin_granted: addLeaveForm.leave_type === 'Comp-off',
          },
          withAuth: true,
        })
      );

      await Promise.all(promises);
      showNotification(`Leave added and approved successfully for ${addLeaveForm.employee_ids.length} employee(s)`, "success");
      closeAddLeaveModal();
      fetchList();
    } catch (e: any) {
      showNotification(e?.message || "Failed to add leave", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerScheduler = async () => {
    try {
      setActionLoading("trigger_scheduler");
      const res = await apiClient<any>("/leaves/trigger-scheduler", { method: "POST", withAuth: true });
      showNotification(res?.message || "Scheduler triggered successfully", "success");
    } catch (e: any) {
      showNotification(e?.message || "Failed to trigger scheduler", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const calculateDuration = (start: string, end: string, session: string = 'Full Day'): number => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const days = Math.max(0, diff);

    // If single day and Morning/Afternoon session, return 0.5
    if (days === 1 && (session === 'Morning' || session === 'Afternoon')) {
      return 0.5;
    }

    return days;
  };

  const createNotificationContainer = () => {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    const container = document.getElementById('notification-container') || createNotificationContainer();
    const notification = document.createElement('div');
    notification.className = `p-4 mb-3 rounded-lg shadow-lg flex items-center space-x-3 ${type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`;

    const icon = document.createElement('div');
    icon.className = `p-2 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`;
    icon.innerHTML = type === 'success'
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-600"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';

    const content = document.createElement('div');
    content.className = 'flex-1';
    content.innerHTML = `<p class="${type === 'success' ? 'text-green-800' : 'text-red-800'} font-medium">${message}</p>`;

    notification.appendChild(icon);
    notification.appendChild(content);
    container.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
      }, 500);
    }, 5000);
  };

  function parseDateFlexible(v: any): Date | null {
    if (!v) return null;
    const s = String(v);
    const iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    const m = s.match(/^\s*(\d{4})-(\d{2})-(\d{2})\s*$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      const dt = new Date(y, mo, d);
      if (!isNaN(dt.getTime())) return dt;
    }
    return null;
  }

  function formatDateHuman(v: any): string {
    const dt = parseDateFlexible(v);
    if (!dt) return String(v || "");
    return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-700 bg-green-50 border border-green-200';
      case 'rejected': return 'text-red-700 bg-red-50 border border-red-200';
      case 'pending': return 'text-orange-700 bg-orange-50 border border-orange-200';
      default: return 'text-gray-700 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'rejected': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'pending': return <Clock className="w-3 h-3 text-orange-500" />;
      default: return <Clock className="w-3 h-3 text-gray-500" />;
    }
  };

  // Timeline Countdown Component
  const TimelineCountdown = ({ item }: { item: LeaveItem }) => {
    // Use timeline_due_at if available, otherwise calculate from level_started_at + timeline_hours
    const countdown = useCountdown(item.level_started_at, item.timeline_hours, item.timeline_due_at);

    if (!item.is_timeline_required || !countdown || !item.timeline_hours) return null;

    const isUrgent = countdown.hours === 0 && countdown.minutes < 30;
    const isExpired = countdown.expired;

    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-semibold text-sm ${isExpired
        ? 'bg-red-100 text-red-700 border border-red-300'
        : isUrgent
          ? 'bg-orange-100 text-orange-700 border border-orange-300'
          : 'bg-blue-100 text-blue-700 border border-blue-300'
        }`}>
        <Clock className="w-4 h-4 flex-shrink-0" />
        {isExpired ? (
          <span>⚠️ Expired</span>
        ) : (
          <span className="font-mono">
            {countdown.hours.toString().padStart(2, '0')}:{countdown.minutes.toString().padStart(2, '0')}:{countdown.seconds.toString().padStart(2, '0')}
          </span>
        )}
      </div>
    );
  };

  // Action Dropdown Component
  const ActionDropdown = ({ item }: { item: LeaveItem }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [placeUp, setPlaceUp] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const statusLower = String(item.status || "Pending").toLowerCase();

    useEffect(() => {
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

    useEffect(() => {
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
          disabled={actionLoading?.includes(`approve_${item.id}`) || actionLoading?.includes(`reject_${item.id}`)}
        >
          {actionLoading?.includes(`approve_${item.id}`) || actionLoading?.includes(`reject_${item.id}`) ? (
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
                <button
                  onClick={() => {
                    openDetailsView(item);
                    setIsOpen(false);
                  }}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Details</span>
                </button>

                {/* Only show approve/reject if backend says user can approve OR if OrgAdmin wants to override a Rejection */}
                {((statusLower === "pending" && item.can_approve === true) || (isOrgAdmin && statusLower === "rejected")) && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        openModal(item, "approve");
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-green-700 hover:bg-green-50"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => {
                        openModal(item, "reject");
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                {(isOrgAdmin || hasPerm("LEAVE_EDIT")) && (<>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setEditModalOpen(true);
                      setActiveItem(item);
                      setEditForm({
                        start_date: item.start_date?.slice(0, 10) || "",
                        end_date: item.end_date?.slice(0, 10) || "",
                        session: item.session || "Full Day",
                        reason: item.reason || ""
                      });
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Edit Dates</span>
                  </button>
                </>
                )}

                {isOrgAdmin && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to PERMANENTLY delete this leave request? This will revert any deducted balances.")) {
                          handleDelete(item.id);
                        }
                        setIsOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Modal Components - Memoized to prevent re-creation and focus loss
  const ApproveRejectModal = React.useMemo(() => {
    if (!modalOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                {modalMode === "approve" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 pb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Leave Request Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Employee:</span>
                    <p className="font-medium">{String(activeItem.employee_name || activeItem.employee || "Employee")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Leave Type:</span>
                    <p className="font-medium">{String(activeItem.type || activeItem.leave_type || "Leave")}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">{Number(activeItem.duration_days || activeItem.days || 0).toFixed(1)} days</p>
                    {activeItem.session && activeItem.session !== 'Full Day' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                        {activeItem.session}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <p className="font-medium">
                      {formatDateHuman(activeItem.start_date || activeItem.from)} - {formatDateHuman(activeItem.end_date || activeItem.to)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Approval Timeline for workflow-based leaves */}
              {activeItem?.workflow_id && activeItem?.approval_timeline && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Approval Workflow</h4>
                  <div className="space-y-3">
                    {activeItem.approval_timeline.map((level: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {level.action === 'approved' ? (
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                          ) : level.action === 'rejected' ? (
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                              <X className="w-4 h-4 text-red-600" />
                            </div>
                          ) : level.action === 'cancelled' ? (
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                              <X className="w-4 h-4 text-gray-600" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <Clock className="w-4 h-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              Level {level.level_number}: {level.approver_names || level.role_name || 'Pending'}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${level.action === 'approved' ? 'bg-green-100 text-green-800' :
                              level.action === 'rejected' ? 'bg-red-100 text-red-800' :
                                level.action === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                  'bg-blue-100 text-blue-800'
                              }`}>
                              {level.action === 'pending' ? 'Pending' : level.action.charAt(0).toUpperCase() + level.action.slice(1)}
                            </span>
                          </div>
                          {level.remarks && (
                            <p className="text-xs text-gray-500 mt-1">Remarks: {level.remarks}</p>
                          )}
                          {level.action_taken_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(level.action_taken_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachment Display */}
              {activeItem?.attachment_url && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Attachment</h4>
                  <a
                    href={activeItem.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    View Attachment
                  </a>
                </div>
              )}

              {modalMode === "reject" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this leave request..."
                    />
                  </div>
                </div>
              )}

              {modalMode === "approve" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (Optional)</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      value={modalReason}
                      onChange={(e) => setModalReason(e.target.value)}
                      placeholder="Add any comments or notes for this approval (optional)..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={closeModal}
              disabled={actionLoading === `approve_${activeItem?.id}` || actionLoading === `reject_${activeItem?.id}`}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={confirmModal}
              disabled={(modalMode === "reject" && !modalReason.trim()) || actionLoading === `approve_${activeItem?.id}` || actionLoading === `reject_${activeItem?.id}`}
              className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${modalMode === "approve"
                ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
              {(actionLoading === `approve_${activeItem?.id}` && modalMode === "approve") || (actionLoading === `reject_${activeItem?.id}` && modalMode === "reject") ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{modalMode === "approve" ? "Approving..." : "Rejecting..."}</span>
                </>
              ) : (
                <span>{modalMode === "approve" ? "Approve Leave" : "Reject Leave"}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }, [modalOpen, activeItem, modalMode, modalReason, rejectOption]);

  const EditLeaveModal = React.useMemo(() => {
    if (!editModalOpen || !activeItem) return null;

    const duration = calculateDuration(editForm.start_date, editForm.end_date, editForm.session);

    return (
      <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Edit Leave dates
            </h3>
            <button
              onClick={() => setEditModalOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
              <select
                value={editForm.session}
                onChange={(e) => setEditForm(prev => ({ ...prev, session: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Full Day">Full Day</option>
                <option value="Morning">Morning (Half Day)</option>
                <option value="Afternoon">Afternoon (Half Day)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
              <textarea
                value={editForm.reason}
                onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm text-blue-700 font-medium">Updated Duration:</span>
              <span className="text-lg font-bold text-blue-700">{duration} days</span>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={actionLoading === "edit_leave"}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading === "edit_leave" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }, [editModalOpen, activeItem, editForm, actionLoading]);

  const DetailsViewModal = () => {
    if (!viewOpen || !activeItem) return null;

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Employee Details</h3>
              <button
                onClick={() => setViewOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {viewLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : viewError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{viewError}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Name</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.name || activeItem?.employee_name || "—")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Employee ID</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.id || activeItem?.employee_id || "—")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Department</h4>
                    <p className="text-lg font-semibold text-gray-900">
                      {String(viewData?.department_name ?? viewData?.department ?? "—")}
                    </p>
                  </div>
                </div>

                {activeItem && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Leave Request Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Leave Type:</span>
                          <p className="font-medium">{String(activeItem.type || activeItem.leave_type || "—")}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Duration:</span>
                          <p className="font-medium">{Number(activeItem.duration_days || activeItem.days || 0).toFixed(1)} days</p>
                          {activeItem.session && activeItem.session !== 'Full Day' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                              {activeItem.session}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Start Date:</span>
                          <p className="font-medium">{formatDateHuman(activeItem.start_date || activeItem.from)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">End Date:</span>
                          <p className="font-medium">{formatDateHuman(activeItem.end_date || activeItem.to)}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Status:</span>
                          <p className="font-medium">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activeItem.status?.toLowerCase() === 'approved' ? 'bg-green-100 text-green-800' :
                              activeItem.status?.toLowerCase() === 'rejected' ? 'bg-red-100 text-red-800' :
                                activeItem.status?.toLowerCase() === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                  'bg-yellow-100 text-yellow-800'
                              }`}>
                              {String(activeItem.status || 'Pending')}
                            </span>
                          </p>
                        </div>
                      </div>

                      {activeItem.reason && (
                        <div className="mt-3">
                          <span className="text-sm text-gray-600">Reason:</span>
                          <p className="text-sm mt-1">{String(activeItem.reason)}</p>
                        </div>
                      )}

                      {/* Workflow/Timeline Section */}
                      {activeItem.workflow_id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-700 mb-2 block">Workflow Status:</span>
                          {activeItem.workflow_status === 'in_progress' ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-blue-900 mb-1">
                                    Current Level: {activeItem.current_level || 1}
                                  </div>
                                  <div className="text-sm text-blue-700 mb-2">
                                    Approvers: {activeItem.current_approver_names || 'Pending assignment'}
                                  </div>
                                  {activeItem.is_timeline_required && activeItem.timeline_due_at && (
                                    <div className="text-xs text-blue-600 bg-blue-100 rounded px-2 py-1 inline-block">
                                      ⏰ Due: {new Date(activeItem.timeline_due_at).toLocaleDateString()} at {new Date(activeItem.timeline_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {activeItem.is_timeline_required && (
                                <div className="mt-2">
                                  <TimelineCountdown item={activeItem} />
                                </div>
                              )}
                            </div>
                          ) : activeItem.workflow_status === 'approved' ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <span className="text-sm text-green-700 font-medium">✓ Workflow Completed - All levels approved</span>
                            </div>
                          ) : activeItem.workflow_status === 'rejected' ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <span className="text-sm text-red-700 font-medium">✗ Workflow Rejected</span>
                            </div>
                          ) : activeItem.workflow_status === 'cancelled' ? (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <span className="text-sm text-gray-700 font-medium">Workflow Cancelled</span>
                            </div>
                          ) : activeItem.workflow_status === 'expired' ? (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <span className="text-sm text-orange-700 font-medium">⏱ Timeline Expired</span>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <span className="text-sm text-gray-600">Status: {activeItem.workflow_status || 'Pending'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Attachment Display in Details View */}
                {activeItem?.attachment_url && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachment</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <img
                        src={activeItem.attachment_url}
                        alt="Leave attachment"
                        className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(activeItem.attachment_url, '_blank')}
                        onError={(e) => {
                          // If image fails to load, show a link instead
                          e.currentTarget.style.display = 'none';
                          const link = document.createElement('a');
                          link.href = activeItem.attachment_url || '';
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          link.className = 'inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline';
                          link.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>View Attachment';
                          e.currentTarget.parentElement?.appendChild(link);
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Approval Timeline */}
                {viewData?.timeline && Array.isArray(viewData.timeline) && viewData.timeline.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Approval Timeline</h4>
                    <div className="space-y-3">
                      {viewData.timeline.map((step: any, idx: number) => {
                        const stepStatus = (step.status || 'pending').toLowerCase();
                        const isApproved = stepStatus === 'approved';
                        const isRejected = stepStatus === 'rejected';
                        const isExpired = stepStatus === 'timeline_expired' || stepStatus === 'auto_escalated';
                        const isPending = stepStatus === 'pending';
                        const isCurrent = step.is_current;

                        // Determine card styling based on status
                        let cardBg = 'bg-white';
                        let borderColor = 'border-gray-200';
                        let statusBadge = 'bg-gray-100 text-gray-700';
                        let statusIcon = '⏳';

                        if (isApproved) {
                          cardBg = 'bg-green-50';
                          borderColor = 'border-green-200';
                          statusBadge = 'bg-green-100 text-green-700';
                          statusIcon = '✓';
                        } else if (isRejected) {
                          cardBg = 'bg-red-50';
                          borderColor = 'border-red-200';
                          statusBadge = 'bg-red-100 text-red-700';
                          statusIcon = '✗';
                        } else if (isExpired) {
                          cardBg = 'bg-orange-50';
                          borderColor = 'border-orange-200';
                          statusBadge = 'bg-orange-100 text-orange-700';
                          statusIcon = '⏱';
                        } else if (isCurrent) {
                          cardBg = 'bg-blue-50';
                          borderColor = 'border-blue-300';
                          statusBadge = 'bg-blue-100 text-blue-700';
                          statusIcon = '🔵';
                        }

                        return (
                          <div key={idx} className={`${cardBg} border ${borderColor} rounded-lg p-4`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${isCurrent ? 'bg-blue-500 animate-pulse' : isApproved ? 'bg-green-500' : isRejected ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                                <div>
                                  <div className="font-semibold text-gray-900">
                                    Level {step.level} {step.level_name ? `- ${step.level_name}` : ''}
                                  </div>
                                  {step.is_final && (
                                    <span className="text-xs text-purple-600 font-medium">Final Level</span>
                                  )}
                                </div>
                              </div>
                              <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${statusBadge}`}>
                                <span>{statusIcon}</span>
                                <span className="capitalize">{stepStatus.replace(/_/g, ' ')}</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Approver(s)</div>
                                <div className="text-sm font-medium text-gray-900">
                                  {step.approver_name || 'Pending Assignment'}
                                </div>
                                {step.approver_type === 'role' && (
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Role-based approval
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="text-xs text-gray-500 mb-1">
                                  {step.action_taken_at ? 'Action Taken' : step.timeline_started_at ? 'Started' : 'Status'}
                                </div>
                                {step.action_taken_at ? (
                                  <div className="text-sm text-gray-900">
                                    {new Date(step.action_taken_at).toLocaleDateString()} at {new Date(step.action_taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                ) : step.timeline_started_at ? (
                                  <div>
                                    <div className="text-sm text-gray-900">
                                      {new Date(step.timeline_started_at).toLocaleDateString()} at {new Date(step.timeline_started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {step.timeline_due_at && isPending && (
                                      <div className="mt-1 bg-blue-100 border border-blue-300 rounded px-2 py-1 inline-block">
                                        <div className="text-xs text-blue-700 font-semibold">
                                          ⏰ Due: {new Date(step.timeline_due_at).toLocaleDateString()} at {new Date(step.timeline_due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">Not started</div>
                                )}
                              </div>
                            </div>

                            {step.comments && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="text-xs text-gray-500 mb-1">Remarks</div>
                                <div className="text-sm text-gray-700 bg-white bg-opacity-50 rounded p-2">
                                  {step.comments}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setViewOpen(false)}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const AddLeaveModal = React.useMemo(() => {
    if (!addLeaveOpen) return null;

    const duration = calculateDuration(addLeaveForm.start_date, addLeaveForm.end_date, addLeaveForm.session);

    return (
      <div className="fixed inset-0 bg-opacity-20 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add Leave</h3>
              <button
                onClick={closeAddLeaveModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employees <span className="text-red-500">*</span>
                </label>

                {/* Search Input */}
                <input
                  type="text"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setEmployeePage(1);
                  }}
                  placeholder="Search by name, email, or phone..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2 text-sm"
                />

                {/* Department Filter */}
                <select
                  value={employeeDepartmentFilter}
                  onChange={(e) => {
                    setEmployeeDepartmentFilter(e.target.value);
                    setEmployeePage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2 text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>

                {/* Employee List with Checkboxes */}
                <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
                  {employeesLoading ? (
                    <div className="p-4 text-center text-sm text-gray-500">Loading employees...</div>
                  ) : employees.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No employees found</div>
                  ) : (
                    employees.map(emp => (
                      <label key={emp.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={addLeaveForm.employee_ids.includes(String(emp.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddLeaveForm(prev => ({
                                ...prev,
                                employee_ids: [...prev.employee_ids, String(emp.id)]
                              }));
                              setSelectedEmployees(prev => [...prev, emp]);
                            } else {
                              setAddLeaveForm(prev => ({
                                ...prev,
                                employee_ids: prev.employee_ids.filter(id => id !== String(emp.id))
                              }));
                              setSelectedEmployees(prev => prev.filter(e => e.id !== emp.id));
                            }
                          }}
                          className="mr-2 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}</div>
                          <div className="text-xs text-gray-500">{emp.department || 'N/A'} • #{emp.employee_id || emp.id}</div>
                        </div>
                      </label>
                    ))
                  )}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                  <span>
                    {selectedEmployees.length} selected • Page {employeePage} of {Math.ceil(employeesTotal / employeePageSize) || 1}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEmployeePage(p => Math.max(1, p - 1))}
                      disabled={employeePage === 1}
                      className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setEmployeePage(p => p + 1)}
                      disabled={employeePage >= Math.ceil(employeesTotal / employeePageSize)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {/* Selected Employees Tags */}
                {selectedEmployees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedEmployees.map(emp => (
                      <span key={emp.id} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}
                        <button
                          onClick={() => {
                            setAddLeaveForm(prev => ({
                              ...prev,
                              employee_ids: prev.employee_ids.filter(id => id !== String(emp.id))
                            }));
                            setSelectedEmployees(prev => prev.filter(e => e.id !== emp.id));
                          }}
                          className="ml-1 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={addLeaveForm.leave_type}
                  onChange={async (e) => {
                    setAddLeaveForm({ ...addLeaveForm, leave_type: e.target.value });

                    // Fetch balance for selected employees if not comp-off
                    if (e.target.value && e.target.value !== 'Comp-off' && addLeaveForm.employee_ids.length > 0) {
                      await fetchLeaveBalances(addLeaveForm.employee_ids, e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Leave Type</option>
                  <option value="Comp-off">Comp-off (No balance required)</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id || type.name} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>

                {/* Balance Warning */}
                {addLeaveForm.leave_type && addLeaveForm.leave_type !== 'Comp-off' && selectedEmployees.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedEmployees.map(emp => {
                      const balance = leaveBalances[`${emp.id}_${addLeaveForm.leave_type}`] || 0;
                      const duration = calculateDuration(addLeaveForm.start_date, addLeaveForm.end_date, addLeaveForm.session);
                      const insufficient = balance < duration;

                      return (
                        <div key={emp.id} className={`text-xs p-2 rounded ${insufficient ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                          <span className="font-medium">{emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim()}:</span> {balance} days available
                          {insufficient && duration > 0 && ` (Need ${duration} days)`}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addLeaveForm.start_date}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={addLeaveForm.end_date}
                    onChange={(e) => setAddLeaveForm({ ...addLeaveForm, end_date: e.target.value })}
                    min={addLeaveForm.start_date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Session Selector - Always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session
                </label>
                <select
                  value={addLeaveForm.session}
                  onChange={(e) => setAddLeaveForm({ ...addLeaveForm, session: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Full Day">Full Day</option>
                  <option value="Morning">Morning Session (Half Day)</option>
                  <option value="Afternoon">Afternoon Session (Half Day)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {duration === 1
                    ? "Select Morning or Afternoon for half-day leave"
                    : "Half-day sessions only apply to single-day leaves"}
                </p>
              </div>

              {duration > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2 text-blue-800">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Duration: {duration === 1 && (addLeaveForm.session === 'Morning' || addLeaveForm.session === 'Afternoon') ? '0.5' : duration} day{duration !== 1 || (addLeaveForm.session !== 'Morning' && addLeaveForm.session !== 'Afternoon') ? 's' : ''}
                      {duration === 1 && (addLeaveForm.session === 'Morning' || addLeaveForm.session === 'Afternoon') && (
                        <span className="ml-2 text-xs">({addLeaveForm.session})</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={addLeaveForm.reason}
                  onChange={(e) => setAddLeaveForm({ ...addLeaveForm, reason: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for leave..."
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={closeAddLeaveModal}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitAddLeave}
              disabled={(() => {
                // Disable if loading
                if (actionLoading === "add_leave") return true;

                // Disable if no employees selected
                if (addLeaveForm.employee_ids.length === 0) return true;

                // Disable if required fields missing
                if (!addLeaveForm.leave_type || !addLeaveForm.start_date || !addLeaveForm.end_date) return true;

                // For non-comp-off leaves, check balance
                if (addLeaveForm.leave_type !== 'Comp-off') {
                  const duration = calculateDuration(addLeaveForm.start_date, addLeaveForm.end_date, addLeaveForm.session);
                  const hasInsufficientBalance = addLeaveForm.employee_ids.some(empId => {
                    const balance = leaveBalances[`${empId}_${addLeaveForm.leave_type}`] || 0;
                    return balance < duration;
                  });

                  if (hasInsufficientBalance) return true;
                }

                return false;
              })()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {actionLoading === "add_leave" ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Add & Approve Leave</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }, [addLeaveOpen, addLeaveForm, employees, leaveTypes, actionLoading, employeeSearch, employeeDepartmentFilter, employeePage, selectedEmployees, leaveBalances, employeesLoading, employeesTotal, departments]);

  const AdjustBalanceModal = React.useMemo(() => {
    if (!adjustModalOpen) return null;
    const isNewRecord = !adjustForm.id;
    const remaining = (Number(adjustForm.total_allocated) + Number(adjustForm.carry_forward)) - Number(adjustForm.used);
    return (
      <div className="fixed inset-0 bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isNewRecord ? "Add Leave Balance" : "Edit Leave Balance"}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {balSelectedEmployee?.name || `${balSelectedEmployee?.first_name || ''} ${balSelectedEmployee?.last_name || ''}`.trim()}
                  {' — '}{adjustForm.leave_type || 'Select type'}
                </p>
              </div>
              <button onClick={() => setAdjustModalOpen(false)} className="p-1.5 rounded-lg hover:bg-white transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Balance Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">Allocated</p>
                <p className="text-2xl font-bold text-blue-800">{Number(adjustForm.total_allocated).toFixed(1)}</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs text-red-600 font-medium uppercase tracking-wider">Used</p>
                <p className="text-2xl font-bold text-red-800">{Number(adjustForm.used).toFixed(1)}</p>
              </div>
              <div className={`text-center p-3 rounded-xl border ${remaining >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${remaining >= 0 ? 'text-green-600' : 'text-orange-600'}`}>Remaining</p>
                <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-800' : 'text-orange-800'}`}>{remaining.toFixed(1)}</p>
              </div>
            </div>

            {/* Leave Type (only for new records) */}
            {isNewRecord && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={adjustForm.leave_type}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, leave_type: e.target.value }))}
                >
                  <option value="">Select leave type</option>
                  {leaveTypes.map((lt: any) => (
                    <option key={lt.id || lt.name} value={lt.name}>{lt.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Period */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Year *</label>
                <input
                  type="number"
                  min={2020} max={2100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={adjustForm.period_year}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, period_year: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Month</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={adjustForm.period_month ?? ""}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, period_month: e.target.value === "" ? null : Number(e.target.value) }))}
                >
                  <option value="">Yearly (null)</option>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Adjustable fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Allocated</label>
                <input
                  type="number" min={0} step={0.5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={adjustForm.total_allocated}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, total_allocated: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Used</label>
                <input
                  type="number" min={0} step={0.5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={adjustForm.used}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, used: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carry Forward</label>
                <input
                  type="number" min={0} step={0.5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={adjustForm.carry_forward}
                  onChange={(e) => setAdjustForm(prev => ({ ...prev, carry_forward: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>

          <div className="p-5 border-t border-gray-100 flex justify-end space-x-3">
            <button
              onClick={() => setAdjustModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjustSubmit}
              disabled={actionLoading === "adjust_balance" || (!adjustForm.leave_type && isNewRecord)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === "adjust_balance" ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  }, [adjustModalOpen, adjustForm, actionLoading, leaveTypes, balSelectedEmployee]);

  // Loading State

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
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
            <div className="grid grid-cols-7 gap-4 px-4 py-3">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="h-3 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="grid grid-cols-7 gap-4 px-4 py-3 animate-pulse">
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
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-6 bg-gray-200 rounded w-10 justify-self-end"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (isEmployee && !hasAnyLeaveAccess) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You do not have permission to view Leave Requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Render modals */}
      {ApproveRejectModal}
      <DetailsViewModal />
      {EditLeaveModal}
      {AddLeaveModal}
      {AdjustBalanceModal}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Leave Requests</h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>


            {/* Refresh Button */}
            <button
              onClick={fetchList}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {!externalControl && showHQToggle && canHRMode && !isOrgAdmin && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  checked={hqMode && canHRMode}
                  onChange={(e) => setHqMode(e.target.checked)}
                  disabled={!canHRMode}
                  className="rounded border-gray-300"
                />
                <span>HR Mode</span>
              </label>
            )}

            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            {!externalControl && (
              <select
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={selectedSiteId == null ? "" : String(selectedSiteId)}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === "") {
                    setSelectedSiteId(null);
                    return;
                  }
                  const val = parseInt(raw, 10);
                  setSelectedSiteId(Number.isNaN(val) ? null : val);
                  setPage(1);
                }}
              >
                {(hqMode && canHRMode) || isOrgAdmin ? (
                  <option value="">All Sites</option>
                ) : (
                  <option value="">Select Site</option>
                )}
                {(((hqMode && canHRMode) || isOrgAdmin) ? allSites : inchargeSites).length === 0 && (
                  <option value="">No sites</option>
                )}
                {(((hqMode && canHRMode) || isOrgAdmin) ? allSites : inchargeSites).map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.name || s.site_name || s.id)}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 text-sm"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {isOrgAdmin && (
              <button
                onClick={handleTriggerScheduler}
                disabled={actionLoading === "trigger_scheduler"}
                className={`px-3 py-1.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-1 text-sm ${actionLoading === "trigger_scheduler" ? "opacity-50 cursor-not-allowed" : ""}`}
                title="Manually trigger leave balance calculation"
              >
                <RefreshCw className={`w-4 h-4 ${actionLoading === "trigger_scheduler" ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Run Scheduler</span>
              </button>
            )}
            {canAddLeave && (
              <button
                onClick={openAddLeaveModal}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Leave</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filters */}
        {filtersExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
              <input
                type="date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                placeholder="From Date"
              />

              <input
                type="date"
                className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                placeholder="To Date"
              />

              <div className="flex items-center space-x-2"></div>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 flex items-center space-x-2">
                <button
                  onClick={fetchList}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex-1"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => {
                    setStatus("All");
                    setFromDate("");
                    setToDate("");
                    if (!externalControl) {
                      setSelectedSiteId(null);
                      setHqMode(defaultHQ);
                    }
                    setPage(1);
                  }}
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
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wider">Pending (Overall)</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">{pendingCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-green-600 uppercase tracking-wider">This Month Approved</p>
              <p className="text-2xl font-bold text-green-900 mt-1">{approvedCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">This Month Rejected</p>
              <p className="text-2xl font-bold text-red-900 mt-1">{rejectedCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-violet-50 rounded-xl p-4 border border-violet-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">This Month Total</p>
              <p className="text-2xl font-bold text-violet-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-5 h-5 text-violet-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {(isOrgAdmin || canAddLeave) && (
        <div className="bg-white rounded-xl border border-gray-200 p-1 flex space-x-1">
          <button
            onClick={() => setActiveTab("requests")}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "requests"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            Leave Requests
          </button>
          <button
            onClick={() => { setActiveTab("balances"); fetchBalEmployees(); }}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "balances"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            Balance Management
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Balance Management Tab */}
      {activeTab === "balances" && (
        <div className="space-y-4">
          {/* Employee Search Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee by name or ID..."
                  value={balSearch}
                  onChange={(e) => { setBalSearch(e.target.value); setBalPage(1); }}
                  className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                {balSearch && (
                  <button onClick={() => setBalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {departments.length > 0 && (
                <select
                  value={balDept}
                  onChange={(e) => { setBalDept(e.target.value); setBalPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map((d, i) => <option key={i} value={d}>{d}</option>)}
                </select>
              )}
              <button
                onClick={() => { setBalSelectedEmployee(null); setBalSelectedEmployeeBalances([]); fetchBalEmployees(); }}
                disabled={balEmployeesLoading}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${balEmployeesLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Employee List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Employees ({balEmployeesTotal})</p>
                </div>
                {balEmployeesLoading ? (
                  <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-1">
                          <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : balEmployees.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No employees found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                    {balEmployees.map((emp) => {
                      const empName = emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || `Emp #${emp.id}`;
                      const isSelected = balSelectedEmployee?.id === emp.id;
                      return (
                        <button
                          key={emp.id}
                          onClick={() => {
                            setBalSelectedEmployee(emp);
                            fetchEmployeeBalancesDetail(emp.id);
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                            }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                            {empName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{empName}</p>
                            <p className="text-xs text-gray-500 truncate">{emp.department || emp.designation || `#${emp.id}`}</p>
                          </div>
                          {isSelected && <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {/* Pagination */}
                {balEmployeesTotal > 10 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      disabled={balPage <= 1}
                      onClick={() => setBalPage(p => Math.max(1, p - 1))}
                      className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                    <span className="text-xs text-gray-500">Page {balPage}</span>
                    <button
                      disabled={balPage * 10 >= balEmployeesTotal}
                      onClick={() => setBalPage(p => p + 1)}
                      className="p-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Balance Detail Panel */}
            <div className="lg:col-span-2">
              {!balSelectedEmployee ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-700 mb-1">Select an Employee</h3>
                  <p className="text-sm text-gray-400">Click on an employee to view and manage their leave balances</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                        {(balSelectedEmployee.name || `${balSelectedEmployee.first_name || ''} ${balSelectedEmployee.last_name || ''}`.trim()).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {balSelectedEmployee.name || `${balSelectedEmployee.first_name || ''} ${balSelectedEmployee.last_name || ''}`.trim()}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500">{balSelectedEmployee.department || balSelectedEmployee.designation || `Employee #${balSelectedEmployee.id}`}</p>
                          {balActivePeriodLabel && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                              Active: {balActivePeriodLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setAdjustForm({
                          id: undefined,
                          employee_id: balSelectedEmployee.id,
                          leave_type: "",
                          total_allocated: 0,
                          used: 0,
                          carry_forward: 0,
                          period_year: new Date().getFullYear(),
                          period_month: null,
                        });
                        setAdjustModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs flex items-center space-x-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Balance</span>
                    </button>
                  </div>

                  {balBalancesLoading ? (
                    <div className="p-6 space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center space-x-4">
                          <div className="h-4 bg-gray-200 rounded w-32"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                          <div className="h-4 bg-gray-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : balSelectedEmployeeBalances.length === 0 ? (
                    <div className="p-10 text-center">
                      <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <h4 className="text-sm font-medium text-gray-700 mb-1">No Balance Records</h4>
                      <p className="text-xs text-gray-400 mb-4">No leave balance records found for this employee for the current active period{balActivePeriodLabel ? ` (${balActivePeriodLabel})` : ''}.</p>
                      <button
                        onClick={() => {
                          setAdjustForm({
                            id: undefined,
                            employee_id: balSelectedEmployee.id,
                            leave_type: "",
                            total_allocated: 0,
                            used: 0,
                            carry_forward: 0,
                            period_year: new Date().getFullYear(),
                            period_month: null,
                          });
                          setAdjustModalOpen(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
                      >
                        Add First Balance
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Type</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wider">Allocated</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-red-600 uppercase tracking-wider">Used</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-amber-600 uppercase tracking-wider">Carry Fwd</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-green-600 uppercase tracking-wider">Remaining</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {balSelectedEmployeeBalances.map((bal, idx) => {
                            const remaining = (Number(bal.total_allocated) + Number(bal.carry_forward || 0)) - Number(bal.used);
                            const utilizationPct = Number(bal.total_allocated) > 0
                              ? Math.min(100, (Number(bal.used) / Number(bal.total_allocated)) * 100)
                              : 0;
                            return (
                              <tr key={bal.id || idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="text-sm font-medium text-gray-900">{bal.leave_type}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-xs text-gray-500">
                                    {bal.period_month ? `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][bal.period_month - 1]} ` : ''}{bal.period_year}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-6 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                    {Number(bal.total_allocated).toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col items-center">
                                    <span className="inline-flex items-center justify-center w-10 h-6 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                      {Number(bal.used).toFixed(1)}
                                    </span>
                                    {Number(bal.total_allocated) > 0 && (
                                      <div className="mt-1 w-12 bg-gray-200 rounded-full h-1">
                                        <div className="bg-red-500 h-1 rounded-full" style={{ width: `${utilizationPct}%` }}></div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-6 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                                    {Number(bal.carry_forward || 0).toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-semibold ${remaining > 0 ? 'bg-green-100 text-green-700' : remaining === 0 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-700'
                                    }`}>
                                    {remaining.toFixed(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <button
                                    onClick={() => {
                                      setAdjustForm({
                                        id: bal.id,
                                        employee_id: balSelectedEmployee.id,
                                        leave_type: bal.leave_type,
                                        total_allocated: Number(bal.total_allocated),
                                        used: Number(bal.used),
                                        carry_forward: Number(bal.carry_forward || 0),
                                        period_year: bal.period_year,
                                        period_month: bal.period_month,
                                      });
                                      setAdjustModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-xs font-medium text-gray-600 transition-colors flex items-center space-x-1 mx-auto"
                                  >
                                    <Settings className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Summary footer */}
                      <div className="border-t border-gray-100 p-4 bg-gray-50">
                        <div className="grid grid-cols-4 gap-4">
                          {['Total Allocated', 'Total Used', 'Total Carry Fwd', 'Total Remaining'].map((label, i) => {
                            const vals = balSelectedEmployeeBalances.map(b => [
                              Number(b.total_allocated),
                              Number(b.used),
                              Number(b.carry_forward || 0),
                              (Number(b.total_allocated) + Number(b.carry_forward || 0)) - Number(b.used)
                            ][i]);
                            const total = vals.reduce((a, b) => a + b, 0);
                            const colors = ['text-blue-700', 'text-red-700', 'text-amber-700', total >= 0 ? 'text-green-700' : 'text-orange-700'];
                            return (
                              <div key={i} className="text-center">
                                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                                <p className={`text-base font-bold ${colors[i]}`}>{total.toFixed(1)}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      {activeTab === "requests" && (<>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-y-auto max-h-[400px] overflow-x-auto relative">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow/Timeline
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageSlice.map((item) => {
                  const name = String(item.employee_name || item.employee || `Employee #${item.employee_id || "-"}`);
                  const type = String(item.type || item.leave_type || "");
                  const statusRaw = String(item.status || "Pending");
                  const statusLower = statusRaw.toLowerCase();
                  const start = formatDateHuman(item.start_date || item.from || "");
                  const end = formatDateHuman(item.end_date || item.to || "");
                  const reason = String(item.reason || item.rejection_reason || item.reject_reason || "");
                  const days = Number(item.duration_days || item.days || 0);

                  return (
                    <tr key={String(item.id)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {name}
                          </div>
                          <div className="text-sm text-gray-500">#{String(item.employee_id || "-")}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{type}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900">{start}</div>
                        <div className="text-xs text-gray-500">to {end}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {days.toFixed(1)} day{days !== 1 ? 's' : ''}
                          </span>
                          {item.session && item.session !== 'Full Day' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              {item.session}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          {getStatusIcon(statusRaw)}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(statusRaw)} capitalize`}>
                            {statusLower}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {item.workflow_id && item.workflow_status === 'in_progress' ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <div className="font-medium text-sm text-blue-900 mb-1">Level {item.current_level || 1}</div>
                            <div className="text-xs text-blue-700 mb-1">
                              {item.current_approver_names || 'Pending assignment'}
                            </div>
                            <TimelineCountdown item={item} />
                          </div>
                        ) : item.workflow_id && item.workflow_status === 'approved' ? (
                          <span className="text-xs text-green-600 font-medium">✓ Workflow Approved</span>
                        ) : item.workflow_id && item.workflow_status === 'rejected' ? (
                          <span className="text-xs text-red-600 font-medium">✗ Workflow Rejected</span>
                        ) : item.workflow_id && item.workflow_status === 'cancelled' ? (
                          <span className="text-xs text-gray-500 font-medium">Workflow Cancelled</span>
                        ) : item.workflow_id && item.workflow_status === 'expired' ? (
                          <span className="text-xs text-orange-600 font-medium">⏱ Timeline Expired</span>
                        ) : item.workflow_id ? (
                          <span className="text-xs text-gray-500">Workflow: {item.workflow_status || 'pending'}</span>
                        ) : (
                          <span className="text-xs text-gray-400">No workflow</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {reason ? (
                          <span className="text-xs text-gray-700 line-clamp-2">{reason}</span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.created_at ? (
                          <div className="text-xs text-gray-700">
                            {String(item.created_at).replace('T', ' ').replace('.000Z', '')}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ActionDropdown item={item} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {visibleItems.length === 0 && !loading && (
            <div className="text-center py-8">
              <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No leave requests found</h3>
              <p className="text-xs text-gray-500 mb-3">No leave requests match your current filters.</p>
              <button
                onClick={() => {
                  setStatus("All");
                  setFromDate("");
                  setToDate("");
                  if (!externalControl) {
                    setSelectedSiteId(null);
                    setHqMode(defaultHQ);
                  }
                  setPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {visibleItems.length > 0 && (
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-2">
            <div className="text-xs text-gray-600">
              Showing <span className="font-medium">{pageStart + 1}</span> to <span className="font-medium">{Math.min(pageStart + pageSize, totalEntries)}</span> of <span className="font-medium">{totalEntries}</span> requests
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

      </>)}


    </div>
  );
}

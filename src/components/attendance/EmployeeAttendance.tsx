"use client";

import React, { useRef } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/apiClient";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import LeavesManagement from "@/components/leaves/LeavesManagement";
import AttendanceDetailsModal from "./AttendanceDetailsModal";
import RedeemHistory from "@/components/redeem/RedeemHistory";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Filter,
  Users,
  Phone,
  Building,
  Clock,
  MapPin,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Leaf,
  Gift,
  User,
  Shield,
  Eye,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  X,
  Mail,
  IdCard,
  UserX,
  Home,
  LogOut,
  ArrowLeft,
  Layers,
  Download,
  Coffee
} from "lucide-react";
import ResetAttendanceModal from "./ResetAttendanceModal";
import BulkOverrideModal from "./BulkOverrideModal";

type EmployeeItem = Record<string, any>;

type Props = {
  defaultHQ?: boolean;
  showHQToggle?: boolean;
  externalControl?: boolean;
  hqMode?: boolean;
  selectedSiteId?: number | null;
};

export default function EmployeeAttendance({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
  const { role, permissions, user, employee } = useAuth();
  const [hqMode, setHqMode] = React.useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = React.useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = React.useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(extSiteId ?? null);
  const [otherLocations, setOtherLocations] = React.useState<any[]>([]);
  const [selectedOtherLocationId, setSelectedOtherLocationId] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<EmployeeItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [successTimer, setSuccessTimer] = React.useState<number>(0);

  // Export modal state
  const [showExportModal, setShowExportModal] = React.useState<boolean>(false);
  const [exporting, setExporting] = React.useState<boolean>(false);
  const [showResetModal, setShowResetModal] = React.useState<boolean>(false);
  const [resetting, setResetting] = React.useState<boolean>(false);
  const [showBulkOverrideModal, setShowBulkOverrideModal] = React.useState<boolean>(false);

  // Detail views
  const [activeView, setActiveView] = React.useState<"list" | "attendance" | "leaves" | "redeems">("list");
  const [activeEmployee, setActiveEmployee] = React.useState<EmployeeItem | null>(null);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = React.useState<EmployeeItem | null>(null);

  // Floating action menu
  const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  const [menuEmployee, setMenuEmployee] = React.useState<EmployeeItem | null>(null);
  const closeMenu = React.useCallback(() => { setMenuOpen(false); setMenuPos(null); setMenuEmployee(null); }, []);

  // Filters & UI State
  const [search, setSearch] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [department, setDepartment] = React.useState<string>("");
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [date, setDate] = React.useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });

  // Session-based permission gating
  const isEmployee = (role || "").toLowerCase() === "employee";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const canHRMode = !isEmployee || hasPerm("HR_MODE");
  const canViewAttendance = !isEmployee || ["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"].some((c) => hasPerm(c));
  const canAddEmployee = !isEmployee || hasPerm("EMPLOYEE_ADD");

  // Pagination
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const [totalPages, setTotalPages] = React.useState<number>(1);
  const [totalItems, setTotalItems] = React.useState<number>(0);
  const [showTerminated, setShowTerminated] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeMenu]);

  // Fetch Departments
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<any>("/organization/departments", { method: "GET", withAuth: true });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.departments) ? res.departments : []);
        setDepartments(list);
      } catch (e) {
        console.error("Failed to fetch departments", e);
      }
    })();
  }, []);

  // Fetch Other Locations
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<any>("/organization/employees/other-locations", { method: "GET", withAuth: true });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setOtherLocations(list);
      } catch (e) {
        console.error("Failed to fetch other locations", e);
      }
    })();
  }, []);

  // Auto-dismiss success messages
  React.useEffect(() => {
    if (success) {
      setSuccessTimer(15);
      const countdown = setInterval(() => {
        setSuccessTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setSuccess(null);
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

  const filteredItems = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    const d = department.trim().toLowerCase();
    return items.filter((it) => {
      const name = String(it.name || `${it.first_name || ""} ${it.last_name || ""}`).toLowerCase();
      const dept = String(it.department_name || it.department || "").toLowerCase();
      const status = String(it.current_status || "").toLowerCase();
      const activeSession = it.attendance?.active_session_type;

      const passSearch = !s || name.includes(s) ||
        String(it.phone || it.phone_number || "").toLowerCase().includes(s) ||
        String(it.email || "").toLowerCase().includes(s) ||
        String(it.employee_id || "").toLowerCase().includes(s);

      const passDept = !d || dept === d;

      let passStatus = statusFilter === "all";

      if (!passStatus) {
        if (statusFilter === "present") {
          passStatus = status === "checked_in" || status === "present" ||
            activeSession === "working" || activeSession === "break" || activeSession === "outside_work";
        } else if (statusFilter === "absent") {
          passStatus = status === "absent";
        } else if (statusFilter === "week_off") {
          passStatus = status === "week_off";
        } else if (statusFilter === "completed") {
          passStatus = status === "checked_out" || status === "completed";
        } else if (statusFilter === "late") {
          const isSpecial = it.attendance?.was_night_ot || it.is_holiday || it.is_weekly_off;
          passStatus = (status.includes("late") || status === "late_checkin") && !isSpecial;
        } else if (statusFilter === "half_day") {
          const isSpecial = it.attendance?.was_night_ot || it.is_holiday || it.is_weekly_off;
          passStatus = status === "half_day" && !isSpecial;
        }
      }

      return passSearch && passDept && passStatus;
    });
  }, [items, search, department, statusFilter]);

  const pagedItems = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  React.useEffect(() => {
    (async () => {
      try {
        // Session fetch removed (using useAuth)
        const session = { authenticated: true, role: role, employee: { permissions } };
        if (session?.authenticated) {
          // setRole((session.role || null) as string | null);
          // setPermissions(session.employee?.permissions || []);
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
      } catch (e) {
        // ignore
      }

      try {
        if (canHRMode) {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        }
      } catch { }
    })();
  }, []);

  React.useEffect(() => {
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
      const effHq = (externalControl ? (extHq ?? hqMode) : hqMode) && canHRMode;
      const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;

      if (selectedOtherLocationId) {
        params["other_location_id"] = String(selectedOtherLocationId);
      } else if (!effHq && (!effSite || Number(effSite) <= 0)) {
        setItems([]);
        throw new Error("Select a site or enable HR mode to view employees");
      }

      if (!selectedOtherLocationId) {
        if (effHq) {
          params["hq"] = "1";
          if (effSite) params["site_id"] = String(effSite);
        } else if (effSite) {
          params["site_id"] = String(effSite);
        }
      }

      if (date) params["date"] = date;
      if (showTerminated) params["include_terminated"] = "1";

      // Filters
      const s = debouncedSearch.trim();
      if (s) params["search"] = s;
      if (department) {
        const dep = departments.find(d => String(d.name) === department);
        if (dep?.id != null) params["department_id"] = String(dep.id);
      }
      if (statusFilter && statusFilter !== "all") params["status"] = statusFilter;

      const res = await apiClient<any>("/attendance/employee-management", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : (res?.data || []));
      setItems(list.map((e: any) => ({ ...(e || {}) })));
      const total = res?.pagination?.totalItems ?? list.length;
      const totalPagesFromApi = res?.pagination?.totalPages ?? Math.ceil(total / pageSize);
      setTotalItems(total);
      setTotalPages(totalPagesFromApi);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e?.message || "Failed to load employee attendance");
    } finally {
      setLoading(false);
    }
  }, [hqMode, selectedSiteId, selectedOtherLocationId, canHRMode, externalControl, extHq, extSiteId, date, debouncedSearch, department, statusFilter, departments]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyFilters = () => {
    setCurrentPage(1);
    fetchList();
  };

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setDepartment("");
    setStatusFilter("all");
    setCurrentPage(1);
    fetchList();
  };

  const formatStatus = (status: string): string => {
    const s = (status || "").toLowerCase().trim();

    if (s.includes("week off (ot)") || s.includes("week_off (ot)")) return "Week Off (OT)";
    if (s.includes("holiday (ot)")) return "Holiday (OT)";

    if (s.includes("checked-out") || s.includes("completed") || s.includes("finished")) {
      return "Completed";
    }
    if (s.includes("checked-in") || s.includes("present") || s.includes("active")) {
      return "Present";
    }
    if (s.includes("absent") || s === "absent") {
      return "Absent";
    }
    if (s.includes("not_started") || s === "not_started") {
      return "Not Started";
    }
    if (s.includes("week_off") || s.includes("weekoff") || s.includes("day_off")) {
      return "Week Off";
    }
    if (s.includes("half_day") || s.includes("halfday") || s.includes("half-day")) {
      return "Half Day";
    }
    if (s.includes("late") || s.includes("late_checkin")) {
      return "Late";
    }
    if (s.includes("early") || s.includes("early_checkout")) {
      return "Early";
    }
    if (s.includes("holiday") || s.includes("public_holiday")) {
      return "Holiday";
    }
    if (s.includes("leave") || s.includes("on_leave")) {
      return "On Leave";
    }
    if (s.includes("work_from_home") || s.includes("wfh")) {
      return "WFH";
    }
    if (s.includes("break_requested") || s.includes("break requested")) {
      return "Break Requested";
    }
    if (s.includes("break_approved") || s.includes("break approved")) {
      return "Break Approved";
    }
    if (s.includes("break_availed") || s.includes("break availed")) {
      return "Break Availed";
    }
    if (s.includes("on_break") || s.includes("break")) {
      return "On Break";
    }
    if (s.includes("outside_work") || s.includes("outside work")) {
      return "Outside Work";
    }

    return s.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || "Unknown";
  };

  const getStatusColor = (status: string) => {
    const formattedStatus = formatStatus(status).toLowerCase();

    if (formattedStatus.includes("completed") || formattedStatus.includes("present")) {
      return {
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      };
    }
    if (formattedStatus.includes("absent")) {
      return {
        text: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-200",
      };
    }
    if (formattedStatus.includes("not started")) {
      return {
        text: "text-slate-700",
        bg: "bg-slate-50",
        border: "border-slate-200",
      };
    }
    if (formattedStatus.includes("week off")) {
      return {
        text: "text-slate-600",
        bg: "bg-slate-50",
        border: "border-slate-200",
      };
    }
    if (formattedStatus.includes("half day")) {
      return {
        text: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
      };
    }
    if (formattedStatus.includes("late")) {
      return {
        text: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
      };
    }
    if (formattedStatus.includes("early")) {
      return {
        text: "text-violet-700",
        bg: "bg-violet-50",
        border: "border-violet-200",
      };
    }
    if (formattedStatus.includes("holiday")) {
      return {
        text: "text-sky-700",
        bg: "bg-sky-50",
        border: "border-sky-200",
      };
    }
    if (formattedStatus.includes("on leave")) {
      return {
        text: "text-indigo-700",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
      };
    }
    if (formattedStatus.includes("wfh")) {
      return {
        text: "text-teal-700",
        bg: "bg-teal-50",
        border: "border-teal-200",
      };
    }
    if (formattedStatus.includes("break requested")) {
      return {
        text: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
    }
    if (formattedStatus.includes("break approved")) {
      return {
        text: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
      };
    }
    if (formattedStatus.includes("break availed")) {
      return {
        text: "text-purple-700",
        bg: "bg-purple-50",
        border: "border-purple-200",
      };
    }
    if (formattedStatus.includes("on break")) {
      return {
        text: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
      };
    }
    if (formattedStatus.includes("outside work")) {
      return {
        text: "text-cyan-700",
        bg: "bg-cyan-50",
        border: "border-cyan-200",
      };
    }
    if (formattedStatus.includes("night ot pending")) {
      return {
        text: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
      };
    }
    if (formattedStatus.includes("night ot approved")) {
      return {
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      };
    }

    return {
      text: "text-slate-700",
      bg: "bg-slate-50",
      border: "border-slate-200",
    };
  };

  const getStatusIcon = (status: string) => {
    const formattedStatus = formatStatus(status).toLowerCase();

    if (formattedStatus.includes("completed")) return <CheckCircle className="w-3 h-3" />;
    if (formattedStatus.includes("present")) return <CheckCircle className="w-3 h-3" />;
    if (formattedStatus.includes("absent")) return <X className="w-3 h-3" />;
    if (formattedStatus.includes("not started")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("week off")) return <Calendar className="w-3 h-3" />;
    if (formattedStatus.includes("half day")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("late")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("early")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("break")) return <Coffee className="w-3 h-3" />;
    if (formattedStatus.includes("night ot")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("holiday")) return <Gift className="w-3 h-3" />;
    if (formattedStatus.includes("on leave")) return <Leaf className="w-3 h-3" />;
    if (formattedStatus.includes("wfh")) return <Home className="w-3 h-3" />;
    if (formattedStatus.includes("break requested")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("break approved")) return <CheckCircle className="w-3 h-3" />;
    if (formattedStatus.includes("break availed")) return <CheckCircle className="w-3 h-3" />;
    if (formattedStatus.includes("on break")) return <Clock className="w-3 h-3" />;
    if (formattedStatus.includes("outside work")) return <MapPin className="w-3 h-3" />;

    return <AlertCircle className="w-3 h-3" />;
  };

  // Action Dropdown Component
  const ActionDropdown = ({ employee }: { employee: EmployeeItem }) => {
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

    const name = String(employee.name || `${employee.first_name || ""} ${employee.last_name || ""}` || `Employee #${employee.id || "-"}`);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          ref={triggerRef}
          onClick={() => setIsOpen((o) => !o)}
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-slate-600" />
        </button>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
            <div className={`fixed ${placeUp ? 'bottom-auto' : 'top-auto'} w-52 bg-white rounded-lg shadow-lg border border-slate-200 z-[101]`}
              style={{
                left: triggerRef.current ? `${triggerRef.current.getBoundingClientRect().right - 208}px` : '0',
                top: placeUp ? 'auto' : triggerRef.current ? `${triggerRef.current.getBoundingClientRect().bottom + 4}px` : '0',
                bottom: placeUp && triggerRef.current ? `${window.innerHeight - triggerRef.current.getBoundingClientRect().top + 4}px` : 'auto'
              }}
            >
              <div className="py-1.5">
                <button
                  onClick={() => { setActiveEmployee(employee); setActiveView("attendance"); setIsOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>View Attendance</span>
                </button>
                <button
                  onClick={() => { setActiveEmployee(employee); setActiveView("redeems"); setIsOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Gift className="w-4 h-4 text-slate-500" />
                  <span>View Redeems</span>
                </button>
                <div className="border-t border-slate-100 my-1.5" />
                <button
                  onClick={() => {
                    setSelectedEmployeeForDetails(employee);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>Today's Attendance</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render detail view when active
  if (activeView !== "list" && activeEmployee) {
    const idVal = (() => {
      const id = (activeEmployee as any).id;
      if (typeof id === "number") return id;
      const parsed = parseInt(String(id));
      return Number.isNaN(parsed) ? 0 : parsed;
    })();

    const nameLabel = String(activeEmployee.name || `${activeEmployee.first_name || ""} ${activeEmployee.last_name || ""}` || `#${idVal}`);
    const viewIcons = {
      attendance: Calendar,
      leaves: Leaf,
      redeems: Gift
    };
    const ViewIcon = viewIcons[activeView];

    return (
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Header */}
        {activeView !== "attendance" && (
          <div className="bg-white border-b border-slate-200 pb-3 px-6 pt-4 shrink-0 z-10">
            <div className="max-w-7xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { setActiveView("list"); setActiveEmployee(null); }}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-slate-900">{nameLabel}</h1>
                      <div className="flex items-center gap-2 mt-0.5">
                        <ViewIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs text-slate-600">
                          {activeView === "leaves" ? "Leave Management" : "Redeem History"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          <div className="h-full max-w-7xl mx-auto w-full">
            {activeView === "attendance" && (
              <AttendanceCalendar
                employeeId={idVal}
                employeeName={nameLabel}
                onBack={() => { setActiveView("list"); setActiveEmployee(null); }}
              />
            )}
            {activeView === "leaves" && (
              <div className="h-full overflow-y-auto p-6">
                <LeavesManagement employeeId={idVal} employeeName={nameLabel} />
              </div>
            )}
            {activeView === "redeems" && (
              <div className="h-full">
                <RedeemHistory employeeId={idVal} employeeName={nameLabel} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header Skeleton */}
          <div className="space-y-3">
            <div className="h-6 bg-slate-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-slate-200 rounded w-96 animate-pulse"></div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
            <div className="grid grid-cols-12 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="col-span-2">
                  <div className="h-10 bg-slate-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-6 gap-4 px-5 py-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-3 bg-slate-200 rounded w-20 animate-pulse"></div>
                ))}
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 px-5 py-3.5 animate-pulse">
                  <div className="space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-32"></div>
                    <div className="h-2.5 bg-slate-100 rounded w-24"></div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded w-28"></div>
                  <div className="h-4 bg-slate-100 rounded w-20"></div>
                  <div className="h-4 bg-slate-100 rounded w-24"></div>
                  <div className="h-4 bg-slate-100 rounded w-28"></div>
                  <div className="h-5 bg-slate-100 rounded w-8 justify-self-end"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Permission Denied
  if (isEmployee && !canViewAttendance) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="bg-white border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Employee Attendance Management</h1>
              <p className="text-xs text-slate-500 mt-1">Track and manage employee attendance records</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Shield className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <h3 className="font-medium text-slate-900 mb-2">Access Denied</h3>
            <p className="text-sm text-slate-500">You do not have permission to view employee attendance.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-9rem)] bg-white flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 p-0">
        <div className="flex flex-col h-full gap-0">
          {/* Filters Section */}
          <div className="bg-white border-b border-slate-200 p-1 flex-shrink-0 z-20">
            <div className="grid grid-cols-12 gap-1">
              {/* HR Mode Toggle */}
              {!externalControl && showHQToggle && canHRMode && (
                <div className="col-span-12 sm:col-span-6 md:col-span-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={hqMode && canHRMode}
                      onChange={(e) => setHqMode(e.target.checked)}
                      disabled={!canHRMode}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">HR Mode</span>
                  </label>
                </div>
              )}

              {/* Show Terminated Toggle */}
              {!externalControl && canHRMode && (
                <div className="col-span-12 sm:col-span-6 md:col-span-2">
                  <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={showTerminated}
                      onChange={(e) => setShowTerminated(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">Show Terminated</span>
                  </label>
                </div>
              )}

              {/* Site Selection */}
              {!externalControl && (
                <div className="col-span-12 sm:col-span-6 md:col-span-2">
                  <div className="relative">
                    <Layers className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={selectedOtherLocationId ? `other_${selectedOtherLocationId}` : (selectedSiteId == null ? "" : `site_${selectedSiteId}`)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setSelectedSiteId(null);
                          setSelectedOtherLocationId(null);
                          return;
                        }
                        if (raw.startsWith("other_")) {
                          const val = parseInt(raw.replace("other_", ""), 10);
                          setSelectedOtherLocationId(Number.isNaN(val) ? null : val);
                          setSelectedSiteId(null);
                        } else {
                          const val = parseInt(raw.replace("site_", ""), 10);
                          setSelectedSiteId(Number.isNaN(val) ? null : val);
                          setSelectedOtherLocationId(null);
                        }
                      }}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                    >
                      {hqMode && canHRMode ? (
                        <option value="">All Sites & Locations</option>
                      ) : (
                        <option value="">Select Location</option>
                      )}

                      <optgroup label="Primary Sites">
                        {(canHRMode ? allSites : inchargeSites).map((s) => (
                          <option key={`site_${s.id}`} value={`site_${s.id}`}>
                            {String(s.name || s.site_name || s.id)}
                          </option>
                        ))}
                      </optgroup>

                      {otherLocations.length > 0 && (
                        <optgroup label="Other Locations">
                          {otherLocations.map((loc) => (
                            <option key={`other_${loc.id}`} value={`other_${loc.id}`}>
                              📍 {String(loc.location_name || loc.name || loc.id)}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Date Picker */}
              <div className="col-span-12 sm:col-span-6 md:col-span-2">
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Department Filter */}
              <div className="col-span-12 sm:col-span-6 md:col-span-2">
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Status Filter */}
              <div className="col-span-12 sm:col-span-6 md:col-span-2">
                <div className="relative">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="present">Present</option>
                    <option value="completed">Completed</option>
                    <option value="absent">Absent</option>
                    <option value="week_off">Week Off</option>
                    <option value="half_day">Half Day</option>
                    <option value="late">Late</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Search */}
              <div className="col-span-12 md:col-span-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={search}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearch(value);

                      // Clear existing timeout
                      if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                      }

                      // Set new timeout for 500ms
                      searchTimeoutRef.current = setTimeout(() => {
                        setDebouncedSearch(value);
                      }, 500);
                    }}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-gray-900 font-medium placeholder:text-slate-400 placeholder:font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2 mt-3 pt-0 border-slate-100">
              <button
                onClick={applyFilters}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                onClick={fetchList}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>

              {(role?.toLowerCase() === 'orgadmin' || role?.toLowerCase() === 'hr') && (
                <button
                  onClick={() => setShowBulkOverrideModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bulk Override</span>
                </button>
              )}

              {role?.toLowerCase() === 'orgadmin' && (
                <button
                  onClick={() => setShowResetModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reset Attendance</span>
                </button>
              )}

              {/* Results Count */}
              <div className="ml-auto text-xs text-slate-500">
                Showing <span className="font-medium text-slate-700">{filteredItems.length}</span> of <span className="font-medium text-slate-700">{totalItems}</span> employees
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm text-emerald-700">{success}</p>
                  {successTimer > 0 && (
                    <span className="text-xs text-emerald-600">
                      ({successTimer}s)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSuccess(null)}
                  className="text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Table Section */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col flex-1 min-h-0 relative">
            {/* Fixed Header */}
            <div className="bg-slate-50 border-b border-slate-200 flex-shrink-0 z-10">
              <div className="grid grid-cols-6 gap-4 px-5 py-3">
                <div className="col-span-2 text-xs font-medium text-slate-600 uppercase tracking-wide">Employee</div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Department</div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Status</div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Site</div>
                <div className="text-xs font-medium text-slate-600 uppercase tracking-wide text-right">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {pagedItems.length === 0 && !loading ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-slate-900 mb-1">No employees found</h3>
                  <p className="text-xs text-slate-500 mb-4">Try adjusting your filters or search criteria</p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                </div>
              ) : (
                pagedItems.map((employee) => {
                  // Determine clean status - prioritize attendance status over current_status
                  let status = 'Not Started';
                  const attendance = employee.attendance;
                  const currentStatus = (employee.current_status || '').toLowerCase();

                  // Check for leave or week-off first
                  if (currentStatus.includes('leave') || currentStatus.includes('on_leave')) {
                    status = 'On Leave';
                  } else if (currentStatus.includes('week_off') || currentStatus.includes('weekoff')) {
                    status = 'Week Off';
                  } else if (attendance) {
                    // Has attendance record
                    const attStatus = (attendance.status || '').toLowerCase();
                    const sessionType = attendance.active_session_type;

                    if (attStatus === 'completed') {
                      status = 'Completed';
                    } else if (attendance.was_night_ot) {
                      if (attendance.night_ot_status === 'Pending') {
                        status = 'Night OT Pending';
                      } else if (attendance.night_ot_status === 'Approved') {
                        status = 'Night OT Approved';
                      } else {
                        status = formatStatus(currentStatus);
                      }
                    } else if (sessionType === 'break') {
                      status = 'On Break';
                    } else if (sessionType === 'outside_work') {
                      status = 'Outside Work';
                    } else if (attStatus === 'present' || sessionType === 'working') {
                      status = 'Present';
                    } else if (attStatus === 'absent') {
                      status = 'Absent';
                    } else {
                      status = formatStatus(currentStatus);
                    }
                  } else if (currentStatus) {
                    status = formatStatus(currentStatus);
                  }

                  const statusColor = getStatusColor(status);
                  const StatusIcon = getStatusIcon(status);
                  const redeemBadge = (employee.badges || []).find((b: any) => b.type === 'redeem');

                  // Get timeline badge (Full-Day / Half-Day)
                  const timeline = attendance?.status_timeline || attendance?.timeline;
                  const showTimeline = timeline && (status === 'Present' || status === 'Completed');

                  return (
                    <div key={employee.id} className="grid grid-cols-6 gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center">
                      {/* Employee Info */}
                      <div className="col-span-2 flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {employee.attendance?.punch_in_image_url ? (
                            <img
                              src={employee.attendance.punch_in_image_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : employee.profile_image_url ? (
                            <img
                              src={employee.profile_image_url}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                              <User className="w-5 h-5 text-slate-400" />
                            </div>
                          )}
                          {redeemBadge && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center shadow-sm" title={redeemBadge.label}>
                              <Gift className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {employee.first_name} {employee.last_name}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                            {employee.attendance?.punch_in_time ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-700">
                                    {new Date(employee.attendance.punch_in_time).toLocaleTimeString('en-IN', {
                                      hour: '2-digit', minute: '2-digit', hour12: true
                                    })}
                                  </span>
                                </div>
                                {employee.attendance.punch_out_time && (
                                  <div className="flex items-center gap-1.5">
                                    <LogOut className="w-3 h-3 text-rose-500" />
                                    <span className="text-rose-600">
                                      {new Date(employee.attendance.punch_out_time).toLocaleTimeString('en-IN', {
                                        hour: '2-digit', minute: '2-digit', hour12: true
                                      })}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-slate-500">#{employee.employee_id}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Department */}
                      <div className="text-sm text-slate-700 truncate">
                        {employee.department_name || "-"}
                      </div>

                      {/* Status & Badges - Clean Horizontal Layout */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Main Status Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${statusColor.bg} ${statusColor.text} border ${statusColor.border}`}>
                          {StatusIcon}
                          <span>{status}</span>
                        </span>

                        {/* Post-Night OT Context Badge */}
                        {employee.attendance?.was_post_night_ot && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
                            <Clock className="w-3 h-3" />
                            <span>Post Night OT</span>
                          </span>
                        )}

                        {/* Timeline Badge (Full-Day/Half-Day) */}
                        {showTimeline && timeline && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${timeline === 'Full-Day' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            timeline === 'Half-Day' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                            <Clock className="w-3 h-3" />
                            {timeline}
                          </span>
                        )}

                        {/* Verification Issue Badge */}
                        {(employee.attendance?.verification_status === 'Pending' ||
                          employee.attendance?.verification_in_id ||
                          employee.attendance?.verification_out_id) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3" />
                              Verification Issue
                            </span>
                          )}

                        {/* Session Badges (Break, Outside Work, etc.) - Only show most relevant */}
                        {employee.badges?.slice(0, 2).map((badge: any, idx: number) => {
                          // Skip redeem badges (shown separately)
                          if (badge.type === 'redeem') return null;

                          // Determine badge styling based on type
                          let badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                          let BadgeIcon = Clock;

                          if (badge.type === 'on_break' || badge.type === 'break') {
                            badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
                            BadgeIcon = Clock;
                          } else if (badge.type === 'outside_work') {
                            badgeClass = 'bg-cyan-50 text-cyan-700 border-cyan-200';
                            BadgeIcon = MapPin;
                          } else if (badge.type === 'late') {
                            badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                            BadgeIcon = Clock;
                          } else if (badge.type === 'overtime') {
                            badgeClass = 'bg-purple-50 text-purple-700 border-purple-200';
                            BadgeIcon = Clock;
                          } else if (badge.type === 'on_leave') {
                            badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                            BadgeIcon = Leaf;
                          } else if (badge.type === 'week_off') {
                            badgeClass = 'bg-slate-50 text-slate-700 border-slate-200';
                            BadgeIcon = Calendar;
                          }

                          return (
                            <span key={`${badge.type}-${idx}`} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${badgeClass}`}>
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </span>
                          );
                        })}

                        {/* Night OT Badge */}
                        {employee.attendance?.was_night_ot && (
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${employee.attendance?.night_ot_status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            employee.attendance?.night_ot_status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                            <Clock className="w-3 h-3" />
                            {employee.attendance?.night_ot_duration_minutes ? `Night OT: ${Math.floor(employee.attendance.night_ot_duration_minutes / 60)}h ${employee.attendance.night_ot_duration_minutes % 60}m` : 'Night OT: Active'}
                          </span>
                        )}
                      </div>

                      {/* Site */}
                      <div className="text-sm text-slate-700 truncate">
                        {employee.attendance?.punch_in_other_location_name || employee.attendance?.punch_in_site_name || "-"}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end">
                        <ActionDropdown employee={employee} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {totalItems > 0 && (
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex-shrink-0 z-20">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-600">
                    Showing <span className="font-medium text-slate-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-medium text-slate-900">{Math.min(currentPage * pageSize, filteredItems.length)}</span> of{" "}
                    <span className="font-medium text-slate-900">{filteredItems.length}</span> results
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Rows per page */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-slate-200 rounded-md text-xs text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    {/* Page navigation */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 border border-slate-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>

                      <div className="flex items-center gap-1">
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
                                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${currentPage === 1
                                  ? "bg-blue-600 text-white"
                                  : "border border-slate-200 text-slate-700 hover:bg-white"
                                  }`}
                              >
                                1
                              </button>
                            );
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis1" className="px-1 text-slate-400 text-xs">
                                  ...
                                </span>
                              );
                            }
                          }
                          for (let page = startPage; page <= endPage; page++) {
                            pages.push(
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${currentPage === page
                                  ? "bg-blue-600 text-white"
                                  : "border border-slate-200 text-slate-700 hover:bg-white"
                                  }`}
                              >
                                {page}
                              </button>
                            );
                          }
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis2" className="px-1 text-slate-400 text-xs">
                                  ...
                                </span>
                              );
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => setCurrentPage(totalPages)}
                                className={`px-3 py-1.5 rounded-md text-xs transition-colors ${currentPage === totalPages
                                  ? "bg-blue-600 text-white"
                                  : "border border-slate-200 text-slate-700 hover:bg-white"
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
                        className="p-1.5 border border-slate-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div >

      {/* Details Modal */}
      {
        selectedEmployeeForDetails && (
          <AttendanceDetailsModal
            record={{
              ...selectedEmployeeForDetails,
              ...(selectedEmployeeForDetails.attendance || {}),
              // Map IDs - set AFTER spreads to prevent overwriting
              attendance_id: selectedEmployeeForDetails.attendance?.id,
              // Map images from backend format (url) to modal format
              punch_in_image: selectedEmployeeForDetails.attendance?.punch_in_image_url || selectedEmployeeForDetails.attendance?.punch_in_image,
              punch_out_image: selectedEmployeeForDetails.attendance?.punch_out_image_url || selectedEmployeeForDetails.attendance?.punch_out_image,
              // Map status
              status: selectedEmployeeForDetails.attendance?.status ||
                (selectedEmployeeForDetails.current_status === 'checked_in' || selectedEmployeeForDetails.current_status === 'checked_out' ? 'Present' :
                  selectedEmployeeForDetails.current_status === 'absent' ? 'Absent' :
                    selectedEmployeeForDetails.current_status === 'week_off' ? 'Week Off' :
                      selectedEmployeeForDetails.current_status === 'holiday' ? 'Holiday' :
                        selectedEmployeeForDetails.current_status),
              attendance_date: date || selectedEmployeeForDetails.attendance_date, // Ensure date from filter is used
              sessions: selectedEmployeeForDetails.attendance?.sessions || selectedEmployeeForDetails.sessions || [],
              // CRITICAL: Set employee_id LAST to ensure it's not overwritten by spreads
              employee_id: selectedEmployeeForDetails.employee_id || selectedEmployeeForDetails.id,
            }}
            onClose={() => setSelectedEmployeeForDetails(null)}
          />
        )
      }

      {/* Export Modal */}
      {showExportModal && (
        <AttendanceExportModal
          current={{
            siteId: selectedSiteId,
            date: date,
            status: statusFilter,
            department: department
          }}
          siteOptions={canHRMode ? allSites : inchargeSites}
          departments={departments}
          notify={showNotification}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showResetModal && (
        <ResetAttendanceModal
          currentSiteId={selectedSiteId}
          siteOptions={canHRMode ? allSites : inchargeSites}
          onClose={() => setShowResetModal(false)}
          onSuccess={() => {
            setShowResetModal(false);
            fetchList();
            setSuccess("Attendance reset and re-calculated successfully.");
          }}
        />
      )}

      {showBulkOverrideModal && (
        <BulkOverrideModal
          currentSiteId={selectedSiteId}
          siteOptions={canHRMode ? allSites : inchargeSites}
          onClose={() => setShowBulkOverrideModal(false)}
          onSuccess={(msg) => {
            setShowBulkOverrideModal(false);
            fetchList();
            setSuccess(msg);
          }}
        />
      )}
    </div >
  );
}

// Notification helper function
function showNotification(message: string, type: 'success' | 'error') {
  const notificationContainer = document.getElementById('notification-container') || createNotificationContainer();
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
  notificationContainer.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 500);
  }, 5000);
}

function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notification-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  document.body.appendChild(container);
  return container;
}

// Attendance Export Modal Component
function AttendanceExportModal({
  current,
  siteOptions,
  departments,
  notify,
  onClose
}: {
  current: { siteId: number | null; date: string; status: string; department: string; };
  siteOptions: Array<Record<string, any>>;
  departments: any[];
  notify: (message: string, type: 'success' | 'error') => void;
  onClose: () => void;
}) {
  const [emailsInput, setEmailsInput] = React.useState<string>("");
  const [local, setLocal] = React.useState({ ...current });
  const [exportFormat, setExportFormat] = React.useState<'excel' | 'pdf'>('excel');
  const [exportType, setExportType] = React.useState<'day' | 'month'>('day');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [includeTerminated, setIncludeTerminated] = React.useState<boolean>(false);

  const [exportTarget, setExportTarget] = React.useState<'all' | 'specific'>('all');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<number[]>([]);
  const [allEmployees, setAllEmployees] = React.useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = React.useState<boolean>(false);
  const [employeeSearch, setEmployeeSearch] = React.useState<string>("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = React.useState<boolean>(false);

  // Get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  };
  const [month, setMonth] = React.useState<string>(getCurrentMonth());

  React.useEffect(() => {
    if (exportTarget === 'specific' && allEmployees.length === 0) {
      (async () => {
        try {
          setLoadingEmployees(true);
          const res = await apiClient<any>("/organization/employees?format=paginated&limit=5000&include_terminated=true", { method: "GET", withAuth: true });
          const list = res?.data || [];
          setAllEmployees(list);
        } catch (e) {
          console.error("Failed to fetch employees for export", e);
        } finally {
          setLoadingEmployees(false);
        }
      })();
    }
  }, [exportTarget, allEmployees.length]);

  const filteredEmployees = React.useMemo(() => {
    const s = employeeSearch.toLowerCase().trim();
    if (!s) return allEmployees;
    return allEmployees.filter(emp => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const code = String(emp.employee_id || emp.id).toLowerCase();
      return fullName.includes(s) || code.includes(s) || (emp.email && emp.email.toLowerCase().includes(s));
    });
  }, [allEmployees, employeeSearch]);

  const submit = async () => {
    try {
      setSubmitting(true);
      const emails = emailsInput.split(/[,\s]+/).map((e) => e.trim()).filter(Boolean);

      if (emails.length === 0) {
        notify('Please enter at least one email address', 'error');
        return;
      }

      if (exportTarget === 'specific' && selectedEmployeeIds.length === 0) {
        notify('Please select at least one employee', 'error');
        return;
      }

      const body: any = {
        emails,
        site_id: exportTarget === 'all' ? local.siteId : null,
        status: exportTarget === 'all' ? (local.status === 'all' ? '' : local.status) : '',
        department: exportTarget === 'all' ? local.department : '',
        export_type: exportType,
        export_format: exportFormat,
        include_terminated: exportTarget === 'all' ? includeTerminated : true,
        employee_ids: exportTarget === 'specific' ? selectedEmployeeIds : undefined
      };

      if (exportType === 'day') {
        body.date = local.date;
      } else {
        body.month = month;
      }

      await apiClient<any>("/attendance/export", { method: "POST", withAuth: true, body: body });
      notify("Export requested. You will receive the email shortly.", "success");
      onClose();
    } catch (err) {
      console.error(err);
      notify("Failed to request export", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadLocal = async () => {
    try {
      setSubmitting(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3002/api/v1';

      if (exportTarget === 'specific' && selectedEmployeeIds.length === 0) {
        notify('Please select at least one employee', 'error');
        return;
      }

      const body: any = {
        site_id: exportTarget === 'all' ? local.siteId : null,
        status: exportTarget === 'all' ? (local.status === 'all' ? '' : local.status) : '',
        department: exportTarget === 'all' ? local.department : '',
        export_type: exportType,
        download_local: true,
        export_format: exportFormat,
        include_terminated: exportTarget === 'all' ? includeTerminated : true,
        employee_ids: exportTarget === 'specific' ? selectedEmployeeIds : undefined
      };

      if (exportType === 'day') {
        body.date = local.date;
      } else {
        body.month = month;
      }

      const res = await fetch(`${baseUrl}/attendance/export`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to download export');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = exportType === 'day'
        ? `Attendance_Report_${local.date}_day.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`
        : `Attendance_Report_${month}_month.${exportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notify('Download started successfully', 'success');
      onClose();
    } catch (err) {
      notify('Failed to download export', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-opacity-30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Export Attendance</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Export Range Option */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Export Range</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_target"
                  value="all"
                  checked={exportTarget === 'all'}
                  onChange={() => setExportTarget('all')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">All Employees under Site</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_target"
                  value="specific"
                  checked={exportTarget === 'specific'}
                  onChange={() => setExportTarget('specific')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Specific Employee(s)</span>
              </label>
            </div>
          </div>

          {exportTarget === 'all' ? (
            <>
              {/* Site */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Site</label>
                <select
                  value={local.siteId ?? ""}
                  onChange={(e) => setLocal({ ...local, siteId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Sites</option>
                  {siteOptions.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
                <select
                  value={local.status}
                  onChange={(e) => setLocal({ ...local, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="completed">Completed</option>
                  <option value="absent">Absent</option>
                  <option value="week_off">Week Off</option>
                  <option value="half_day">Half Day</option>
                  <option value="late">Late</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Department</label>
                <select
                  value={local.department}
                  onChange={(e) => setLocal({ ...local, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (<option key={d.id} value={d.name}>{d.name}</option>))}
                </select>
              </div>

              {/* Include Terminated */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTerminated}
                    onChange={(e) => setIncludeTerminated(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Include Terminated/Inactive Employees</span>
                </label>
              </div>
            </>
          ) : (
            /* Specific Employee Selection Search Bar */
            <div className="md:col-span-2 relative">
              <label className="block text-xs text-gray-500 mb-1">Search & Select Employees</label>
              <div className="border border-gray-300 rounded-lg p-1.5 min-h-[42px] bg-white flex flex-wrap gap-1.5 items-center relative focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                {/* Selected Pills */}
                {selectedEmployeeIds.map(id => {
                  const emp = allEmployees.find(e => e.id === id);
                  if (!emp) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-xs px-2 py-1 rounded-md border border-slate-200">
                      {emp.first_name} {emp.last_name}
                      {emp.status && emp.status !== 'Active' && (
                        <span className={`text-[9px] px-1 rounded font-bold ${
                          emp.status === 'Terminated' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {emp.status}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeIds(prev => prev.filter(x => x !== id))}
                        className="hover:text-red-600 font-bold ml-0.5 text-slate-400"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
                {/* Search Input */}
                <input
                  type="text"
                  placeholder={selectedEmployeeIds.length === 0 ? "Type to search employees (includes Inactive/Terminated)..." : "Type to add more..."}
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setShowEmployeeDropdown(true);
                  }}
                  onFocus={() => setShowEmployeeDropdown(true)}
                  className="flex-1 min-w-[150px] outline-none border-none text-sm p-1 bg-transparent"
                />
                {/* Clear Button */}
                {selectedEmployeeIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedEmployeeIds([])}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-1 font-semibold ml-auto border-l border-slate-200"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Dropdown Options */}
              {showEmployeeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowEmployeeDropdown(false)} />
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-20 divide-y divide-slate-50">
                    {loadingEmployees ? (
                      <div className="p-3 text-center text-xs text-gray-500">Loading employees...</div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500">No employees found</div>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const isSelected = selectedEmployeeIds.includes(emp.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                              } else {
                                setSelectedEmployeeIds(prev => [...prev, emp.id]);
                              }
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors ${
                              isSelected ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-slate-800">
                                {emp.first_name} {emp.last_name}
                              </span>
                              <span className="text-xs text-slate-400 truncate">
                                {emp.designation || 'No Designation'} {emp.department_name ? `• ${emp.department_name}` : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {emp.status && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                  emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  emp.status === 'Terminated' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  emp.status === 'Inactive' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {emp.status}
                                </span>
                              )}
                              <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Export Type */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Export Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="day"
                  checked={exportType === 'day'}
                  onChange={() => setExportType('day')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Daily Report</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="month"
                  checked={exportType === 'month'}
                  onChange={() => setExportType('month')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Monthly Report (All Dates)</span>
              </label>
            </div>
          </div>

          {/* Date or Month Picker */}
          {exportType === 'day' ? (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={local.date}
                onChange={(e) => setLocal({ ...local, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Month</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {/* Export Format */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Export Format</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_format"
                  value="excel"
                  checked={exportFormat === 'excel'}
                  onChange={() => setExportFormat('excel')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="export_format"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={() => setExportFormat('pdf')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="text-sm text-gray-700">PDF (.pdf)</span>
              </label>
            </div>
          </div>

          {/* Emails */}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Emails (comma separated)</label>
            <input
              type="text"
              value={emailsInput}
              onChange={(e) => setEmailsInput(e.target.value)}
              placeholder="user1@example.com, user2@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end mt-4 gap-2">
          <button onClick={onClose} className="px-3 py-2 border border-gray-300 rounded-lg">Cancel</button>
          <button
            onClick={downloadLocal}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Downloading...' : 'Download Locally'}
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Send to Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

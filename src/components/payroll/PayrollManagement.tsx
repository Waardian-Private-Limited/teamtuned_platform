"use client";

import React from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/apiClient";
import PayrollCycleCalendar from "@/components/payroll/PayrollCycleCalendar";
import { Search, Filter, Users, Phone, Building, Clock, MapPin, MoreVertical, ChevronLeft, ChevronRight, Calendar, User, Shield, Eye, RefreshCw, X, CheckCircle, AlertCircle, LogOut, Layers, ChevronDown, Download, FileText, CreditCard, Loader2, Lock, Unlock, FileUp, Upload } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/context/AuthContext";
type EmployeeItem = Record<string, any>;

export default function PayrollManagement({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: { defaultHQ?: boolean; showHQToggle?: boolean; externalControl?: boolean; hqMode?: boolean; selectedSiteId?: number | null }) {
  const { role, permissions, user, employee } = useAuth();
  const [hqMode, setHqMode] = React.useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = React.useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = React.useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(extSiteId ?? null);
  const [items, setItems] = React.useState<EmployeeItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const [activeView, setActiveView] = React.useState<"list" | "payroll">("list");
  const [activeEmployee, setActiveEmployee] = React.useState<EmployeeItem | null>(null);

  const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  const [menuEmployee, setMenuEmployee] = React.useState<EmployeeItem | null>(null);
  const closeMenu = React.useCallback(() => { setMenuOpen(false); setMenuPos(null); setMenuEmployee(null); }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeMenu]);

  const [search, setSearch] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");
  const [lockStatus, setLockStatus] = React.useState<string>("all");
  const isEmployee = (role || "").toLowerCase() === "employee";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const canHRMode = !isEmployee || hasPerm("HR_MODE");

  // Additional State for new UI
  const [departments, setDepartments] = React.useState<any[]>([]);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [successTimer, setSuccessTimer] = React.useState<number>(0);
  const [totalItems, setTotalItems] = React.useState<number>(0);

  // Export State
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportType, setExportType] = React.useState<'payroll' | 'bank'>('payroll');
  const [exportSite, setExportSite] = React.useState<string>('all');
  const [exportMethod, setExportMethod] = React.useState<'download' | 'email'>('download');
  const [exportEmail, setExportEmail] = React.useState('');
  const [isExporting, setIsExporting] = React.useState(false);

  // Update (Override)
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [updateFile, setUpdateFile] = React.useState<File | null>(null);
  const [withLateMark, setWithLateMark] = React.useState(false);

  // Cycle Navigation (EXACTLY like PayrollCycleCalendar)
  const [now, setNow] = React.useState<Date>(new Date());
  const [policyData, setPolicyData] = React.useState<any>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [isLocking, setIsLocking] = React.useState(false);
  const [showLockConfirm, setShowLockConfirm] = React.useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = React.useState(false);
  const [includeInactive, setIncludeInactive] = React.useState(false);

  const computeCycle = React.useCallback((ref: Date, startDay: number, endDay: number) => {
    let cycleYear = ref.getFullYear();
    let cycleMonth = ref.getMonth() + 1;

    if (startDay === endDay || startDay > endDay) {
      cycleMonth -= 1;
      if (cycleMonth < 1) {
        cycleMonth = 12;
        cycleYear -= 1;
      }
    }

    let start: Date, end: Date;

    const clamp = (y: number, m: number, d: number) => {
      const lastDay = new Date(y, m, 0).getDate();
      return Math.min(d, lastDay);
    };

    if (startDay === endDay) {
      start = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, startDay));
      const nextMonth = cycleMonth === 12 ? 1 : cycleMonth + 1;
      const nextYear = cycleMonth === 12 ? cycleYear + 1 : cycleYear;
      const endDate = new Date(nextYear, nextMonth - 1, clamp(nextYear, nextMonth, endDay));
      endDate.setDate(endDate.getDate() - 1);
      end = endDate;
    } else if (startDay > endDay) {
      start = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, startDay));
      const nextMonth = cycleMonth === 12 ? 1 : cycleMonth + 1;
      const nextYear = cycleMonth === 12 ? cycleYear + 1 : cycleYear;
      end = new Date(nextYear, nextMonth - 1, clamp(nextYear, nextMonth, endDay));
    } else {
      start = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, startDay));
      end = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, endDay));
    }

    return { start, end };
  }, []);

  const startDay = policyData?.payment_cycle_start || 20;
  const endDay = policyData?.payment_cycle_end || 20;
  const { start, end } = computeCycle(now, startDay, endDay);

  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const startKey = dateKey(start);
  const endKey = dateKey(end);

  // Cycle keys updated from backend
  const [cycleStartKey, setCycleStartKey] = React.useState<string>(startKey);
  const [cycleEndKey, setCycleEndKey] = React.useState<string>(endKey);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return "—";
    }
  };

  const shiftCycle = (dir: -1 | 1) => {
    const d = new Date(now.getFullYear(), now.getMonth() + dir, now.getDate());
    setNow(d);
  };

  const formatStatus = (status: string): string => {
    const s = (status || "").toLowerCase().trim();
    if (s.includes("checked-out") || s.includes("completed") || s.includes("finished")) return "Completed";
    if (s.includes("checked-in") || s.includes("present") || s.includes("active")) return "Present";
    if (s.includes("week") && s.includes("off")) return "Week Off";
    if (s.includes("holiday")) return "Holiday";
    if (s.includes("half")) return "Half Day";
    if (s.includes("absent")) return "Absent";
    if (s.includes("leave")) return "On Leave";
    return status || "—";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Present": return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" };
      case "Completed": return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" };
      case "Week Off": return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" };
      case "Holiday": return { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" };
      case "Half Day": return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
      case "Absent": return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" };
      case "On Leave": return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" };
      case "On Break": return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" };
      case "Outside Work": return { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" };
      default: return { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Present": return <CheckCircle className="w-3.5 h-3.5" />;
      case "Completed": return <CheckCircle className="w-3.5 h-3.5" />;
      case "Week Off": return <Calendar className="w-3.5 h-3.5" />;
      case "Holiday": return <Calendar className="w-3.5 h-3.5" />;
      case "Half Day": return <Clock className="w-3.5 h-3.5" />;
      case "Absent": return <AlertCircle className="w-3.5 h-3.5" />;
      case "On Leave": return <AlertCircle className="w-3.5 h-3.5" />;
      case "On Break": return <Clock className="w-3.5 h-3.5" />;
      case "Outside Work": return <MapPin className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  const applyFilters = () => {
    setPage(1);
    fetchList();
  };

  const clearFilters = () => {
    setSearch("");
    setDepartment("");
    setLockStatus("all");
    setNow(new Date());
    setPage(1);
    fetchList();
  };

  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedItems = items; // Pagination handled by backend

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
      } catch { }

      try {
        if (canHRMode) {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        }
      } catch { }

      try {
        const res = await apiClient<any>("/organization/departments", { method: "GET", withAuth: true });
        const list = Array.isArray(res) ? res : (Array.isArray(res?.departments) ? res.departments : []);
        setDepartments(list);
      } catch { }

      // Fetch policy data to get cycle configuration
      try {
        // Session fetch removed (using useAuth)
        const empId = employee?.id || 0;
        if (empId) {
          const payrollRes = await apiClient<any>("/attendance/payroll-cycle", {
            method: "GET",
            withAuth: true,
            params: {
              employee_id: String(empId),
              ref_month: String(new Date().getMonth() + 1),
              ref_year: String(new Date().getFullYear())
            }
          });
          setPolicyData({
            payment_cycle_start: payrollRes?.payment_cycle_start,
            payment_cycle_end: payrollRes?.payment_cycle_end,
            salary_date_day: payrollRes?.salary_date_day
          });

          // Update cycle keys from backend response (like PayrollCycleCalendar)
          const srvStart = String(payrollRes?.cycle_start || '').slice(0, 10);
          const srvEnd = String(payrollRes?.cycle_end || '').slice(0, 10);
          if (srvStart && srvEnd) {
            setCycleStartKey(srvStart);
            setCycleEndKey(srvEnd);
          }
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
      if (!effHq && (!effSite || Number(effSite) <= 0)) {
        setItems([]);
        throw new Error("Select a site or enable HR mode to view employees");
      }
      if (effHq) {
        params["hq"] = "1";
        if (effSite) params["site_id"] = String(effSite);
      } else if (effSite) {
        params["site_id"] = String(effSite);
      }

      // Add filters
      params["month"] = String(endKey.slice(5, 7));
      params["year"] = String(endKey.slice(0, 4));
      const s = search.trim();
      if (s) params["search"] = s;
      if (department) {
        const dep = departments.find(d => String(d.name) === department);
        if (dep?.id != null) params["department_id"] = String(dep.id);
      }
      if (lockStatus !== "all") {
        params["is_locked"] = lockStatus === "locked" ? "1" : "0";
      }
      params["page"] = String(page);
      params["limit"] = String(pageSize);

      const res = await apiClient<any>("/attendance/payroll-list", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res?.items) ? res.items : [];
      setItems(list);
      setTotalItems(res?.pagination?.totalItems ?? list.length);

      // Update cycle keys from backend response (like PayrollCycleCalendar)
      if (list.length > 0 && list[0].cycle_start && list[0].cycle_end) {
        setCycleStartKey(list[0].cycle_start);
        setCycleEndKey(list[0].cycle_end);
      }
      setSelectedIds(new Set());
    } catch (e: any) {
      setError(e?.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }, [hqMode, selectedSiteId, canHRMode, externalControl, extHq, extSiteId, startKey, endKey, search, department, page, pageSize, departments]);

  const handleLockUnlock = async (ids: number[], action: 'lock' | 'unlock') => {
    try {
      setIsLocking(true);
      const payload = {
        employee_ids: ids,
        month: endKey.split('-')[1],
        year: endKey.split('-')[0]
      };
      const endpoint = action === 'lock' ? "/attendance/payroll-lock" : "/attendance/payroll-unlock";
      await apiClient(endpoint, { method: "POST", body: payload, withAuth: true });
      toast.success(`Payroll ${action === 'lock' ? 'locked' : 'unlocked'} successfully`);
      fetchList();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} payroll`);
    } finally {
      setIsLocking(false);
    }
  };

  const executeLockAll = async () => {
    try {
      setIsLocking(true);
      setShowLockConfirm(false);
      const payload = {
        lock_all: true,
        month: endKey.split('-')[1],
        year: endKey.split('-')[0],
        include_inactive: includeInactive
      };
      await apiClient("/attendance/payroll-lock", { method: "POST", body: payload, withAuth: true });
      toast.success("Payroll locked for all active employees");
      fetchList();
    } catch (err: any) {
      toast.error(err.message || "Failed to lock all payroll");
    } finally {
      setIsLocking(false);
    }
  };

  const handleLockAll = () => {
    setShowLockConfirm(true);
  };

  const executeUnlockAll = async () => {
    try {
      setIsLocking(true);
      setShowUnlockConfirm(false);
      const payload = {
        unlock_all: true,
        month: endKey.split('-')[1],
        year: endKey.split('-')[0],
        include_inactive: includeInactive
      };
      await apiClient("/attendance/payroll-unlock", { method: "POST", body: payload, withAuth: true });
      toast.success("Payroll unlocked for all active employees");
      fetchList();
    } catch (err: any) {
      toast.error(err.message || "Failed to unlock all payroll");
    } finally {
      setIsLocking(false);
    }
  };

  const handleUnlockAll = () => {
    setShowUnlockConfirm(true);
  };

  const [isGenerating, setIsGenerating] = React.useState(false);
  const handleGenerateSlips = async (ids: number[]) => {
    try {
      setIsGenerating(true);
      const payload = {
        employee_ids: ids,
        month: endKey.split('-')[1],
        year: endKey.split('-')[0]
      };
      await apiClient("/attendance/payroll-generate", { method: "POST", body: payload, withAuth: true });
      toast.success(`${ids.length} Salary slips generated successfully`);
      fetchList();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate salary slips");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDownloadTemplate = async () => {
    try {
      const year = cycleEndKey.slice(0, 4);
      const month = cycleEndKey.slice(5, 7);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token'); // Try common keys or check auth context

      // Construct URL manually to avoid apiClient interception issues with Blobs
      const queryParams = new URLSearchParams({
        month,
        year,
        site_id: String(selectedSiteId || ''),
        cycle_start: cycleStartKey,
        cycle_end: cycleEndKey
      });

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3006/api/v1';
      console.log("Downloading template from:", `${baseUrl}/attendance/payroll-edit-template`);

      const response = await fetch(`${baseUrl}/attendance/payroll-edit-template?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Download response error:", response.status, errText);
        throw new Error(`Download failed: ${response.status} ${errText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payroll_Edit_Template_${year}_${month}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Template downloaded");
    } catch (err: any) {
      console.error("Download template error:", err);
      toast.error("Failed to download template");
    }
  };

  const handleUpdatePayroll = async () => {
    if (!updateFile) {
      toast.error("Please select a file first");
      return;
    }

    try {
      setIsUpdating(true);
      const year = cycleEndKey.slice(0, 4);
      const month = cycleEndKey.slice(5, 7);

      const formData = new FormData();
      formData.append('file', updateFile);
      formData.append('month', month);
      formData.append('year', year);
      formData.append('cycle_start', cycleStartKey);
      formData.append('cycle_end', cycleEndKey);

      // We need to send FormData. apiClient might default to JSON.
      // We usually pass `body: formData` and let browser set Content-Type (multipart).
      // But we need to ensure apiClient doesn't force Content-Type: application/json.

      // Let's try passing body directly.
      const response = await apiClient<any>('/attendance/payroll-update', {
        method: 'POST',
        body: formData,
        withAuth: true,
        // headers: {} // Let browser set boundary
      });

      toast.success(`Updated ${response.processed} records`);
      setShowUpdateModal(false);
      setUpdateFile(null);
      fetchList();
    } catch (err: any) {
      console.error("Update error:", err);
      toast.error(err.message || "Failed to update payroll");
    } finally {
      setIsUpdating(false);
    }
  };

  React.useEffect(() => { fetchList(); }, [fetchList]);

  if (activeView !== "list" && activeEmployee) {
    const idVal = (() => {
      const id = (activeEmployee as any).id;
      if (typeof id === "number") return id;
      const parsed = parseInt(String(id));
      return Number.isNaN(parsed) ? 0 : parsed;
    })();
    const nameLabel = String(activeEmployee.name || `${activeEmployee.first_name || ""} ${activeEmployee.last_name || ""}` || `#${idVal}`);
    return (
      <div className="h-[calc(100vh-9rem)] flex flex-col bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 pb-3 px-4 pt-4 shrink-0 z-10">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setActiveView("list"); setActiveEmployee(null); }}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{nameLabel}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs text-slate-600">Payroll Management</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-white">
          <div className="h-full w-full overflow-y-auto">
            <PayrollCycleCalendar employeeId={idVal} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col bg-white overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Header & Filters */}
      <div className="bg-white border-b border-slate-200 pb-2 px-4 pt-2 shrink-0 z-10">
        <div className="max-w-7xl mx-auto w-full space-y-2">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-end">
            {!externalControl && showHQToggle && canHRMode && (
              <div className="lg:col-span-2 flex items-center gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                <input type="checkbox" checked={hqMode && canHRMode} onChange={(e) => setHqMode(e.target.checked)} disabled={!canHRMode} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <div className="text-xs font-medium text-blue-900">HR Mode</div>
              </div>
            )}
            <div className="lg:col-span-3">
              <label className="block text-xs font-medium text-slate-500 mb-1">Payroll Cycle</label>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                <button
                  onClick={() => shiftCycle(-1)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <div className="flex-1 text-center">
                  <div className="text-xs font-medium text-slate-900 whitespace-nowrap">
                    {formatDate(cycleStartKey)} - {formatDate(cycleEndKey)}
                  </div>
                </div>
                <button
                  onClick={() => shiftCycle(1)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" className="w-full pl-7 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
              </div>
            </div>
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
              <select className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={lockStatus} onChange={(e) => setLockStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="locked">Locked</option>
                <option value="unlocked">Unlocked</option>
              </select>
            </div>
            {!externalControl && (
              <div className="lg:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Site</label>
                <select className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={selectedSiteId == null ? "" : String(selectedSiteId)} onChange={(e) => { const raw = e.target.value; if (raw === "") { setSelectedSiteId(null); return; } const val = parseInt(raw, 10); setSelectedSiteId(Number.isNaN(val) ? null : val); }}>
                  {hqMode && canHRMode ? (<option value="">All Sites</option>) : (<option value="">Select Site</option>)}
                  {(canHRMode ? allSites : inchargeSites).length === 0 && <option value="">No sites available</option>}
                  {(canHRMode ? allSites : inchargeSites).map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="lg:col-span-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">&nbsp;</label>
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
            {selectedIds.size > 0 ? (
              <div className="lg:col-span-3 flex items-center gap-2">
                <button
                  disabled={isLocking || isGenerating}
                  onClick={() => handleLockUnlock(Array.from(selectedIds), 'lock')}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Lock ({selectedIds.size})
                </button>
                <button
                  disabled={isLocking || isGenerating}
                  onClick={() => handleLockUnlock(Array.from(selectedIds), 'unlock')}
                  className="flex-1 px-3 py-1.5 bg-slate-600 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock
                </button>
                <button
                  disabled={isLocking || isGenerating}
                  onClick={() => handleGenerateSlips(Array.from(selectedIds))}
                  className="flex-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  Slips
                </button>
              </div>
            ) : (
              <>
                <div className="lg:col-span-2 flex items-center gap-2">
                  <button
                    disabled={isLocking}
                    onClick={handleLockAll}
                    className="flex-1 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Lock All
                  </button>
                  <button
                    disabled={isLocking}
                    onClick={handleUnlockAll}
                    className="flex-1 px-3 py-1.5 bg-slate-600 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unlock All
                  </button>
                </div>
                <div className="lg:col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">&nbsp;</label>
                  <button
                    onClick={() => setShowUpdateModal(true)}
                    className="w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    Update
                  </button>
                </div>

              </>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white">
        <div className="h-full max-w-7xl mx-auto w-full flex flex-col">
          {error && (
            <div className="px-4 pt-4">
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
                <Shield className="w-5 h-5 text-rose-600" />
                <div className="text-rose-700 font-medium text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* Employee List */}
          <div className="flex-1 overflow-hidden bg-white border border-slate-200 rounded-lg">
            {/* Horizontal scroll container for both header and body with modern scrollbar */}
            <div className="h-full overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400">
              <div className="min-w-[2100px] h-full flex flex-col">
                {/* Fixed Header */}
                <div className="bg-white border-b border-slate-200 flex-shrink-0 z-10">
                  <div className="grid grid-cols-[40px_80px_200px_120px_80px_100px_100px_110px_80px_80px_80px_80px_100px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-3">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={items.length > 0 && selectedIds.size === items.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                    </div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Image</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</div>

                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Site</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Total Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Present Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Absent Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Paid Leave</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Adj PL</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Adj CO</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Week Off</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Holidays</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Full Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Half Days</div>

                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Gross Salary</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Earned Gross</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Deductions</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Net Pay</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right sticky right-0 bg-white shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] z-20 px-2 py-3 -my-3 flex items-center justify-end">Actions</div>
                  </div>
                </div>

                {/* Scrollable Body - only vertical scroll, horizontal is handled by parent */}
                <div className="divide-y divide-slate-50 overflow-y-auto overflow-x-hidden flex-1 pr-2">
                  {loading ? (
                    // Ghost Loader
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="min-w-[2100px] grid grid-cols-[80px_200px_120px_80px_100px_100px_110px_80px_80px_80px_80px_100px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-4 animate-pulse">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg"></div>
                        <div className="h-4 bg-slate-100 rounded w-32"></div>

                        <div className="h-4 bg-slate-100 rounded w-24"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>

                        <div className="h-4 bg-slate-100 rounded w-12 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div>
                        <div className="h-4 bg-slate-100 rounded w-20 ml-auto"></div>
                        <div className="w-8 h-8 bg-slate-100 rounded-lg ml-auto"></div>
                      </div>
                    ))
                  ) : pagedItems.length === 0 ? (
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
                      const metrics = employee.metrics || {};
                      const salary = employee.salary || {};

                      return (
                        <div key={employee.id} className="min-w-[2100px] grid grid-cols-[40px_80px_200px_120px_80px_100px_100px_110px_80px_80px_80px_80px_100px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-3 hover:bg-slate-50 transition-colors items-center group border-l-2 border-transparent hover:border-blue-500">
                          {/* Checkbox */}
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(employee.id)}
                              onChange={() => toggleSelect(employee.id)}
                              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                          </div>

                          {/* Image */}
                          <div className="flex-shrink-0">
                            {employee.profile_image_url ? (
                              <img
                                src={employee.profile_image_url}
                                alt=""
                                className="w-9 h-9 rounded-lg object-cover border border-slate-100"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-100">
                                <User className="w-4 h-4 text-slate-400" />
                              </div>
                            )}
                          </div>

                          {/* Name */}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate flex items-center gap-1.5">
                              {employee.first_name} {employee.last_name}
                              {employee.is_locked === 1 && (
                                <Lock className="w-3 h-3 text-blue-600" />
                              )}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{employee.department_name || "-"}</div>
                          </div>



                          {/* Site */}
                          <div className="text-sm text-slate-600 truncate">{employee.primary_site_name || "Unassigned"}</div>

                          {/* Total Days */}
                          <div className="text-sm text-slate-900 font-medium text-right">{metrics.total_days || 0}</div>

                          {/* Present */}
                          <div className="text-sm text-emerald-600 font-medium text-right">{((metrics.full_days || 0) + ((metrics.half_days || 0) * 0.5)).toFixed(1)}</div>

                          {/* Absent */}
                          <div className="text-sm text-rose-600 font-medium text-right">{metrics.absent_days || 0}</div>

                          {/* Paid Leaves */}
                          <div className="text-sm text-teal-600 font-medium text-right">{Number(metrics.total_paid_leave_days || 0).toFixed(1)}</div>

                          {/* Adj PL */}
                          <div className="text-sm text-blue-600 font-medium text-right">{Number(metrics.adjusted_paid_leaves || 0).toFixed(1)}</div>

                          {/* Adj CO */}
                          <div className="text-sm text-blue-600 font-medium text-right">{Number(metrics.adjusted_comp_offs || 0).toFixed(1)}</div>

                          {/* Week Off */}
                          <div className="text-sm text-slate-600 font-medium text-right">{metrics.total_week_offs || 0}</div>

                          {/* Holidays */}
                          <div className="text-sm text-violet-600 font-medium text-right">{metrics.total_holidays || 0}</div>

                          {/* Full Days */}
                          <div className="text-sm text-blue-600 font-medium text-right">{metrics.full_days || 0}</div>

                          {/* Half Days */}
                          <div className="text-sm text-amber-600 font-medium text-right">{metrics.half_days || 0}</div>



                          {/* Gross Salary */}
                          <div className="text-sm text-slate-900 font-medium text-right">₹{Number(salary.gross_salary || 0).toLocaleString()}</div>

                          {/* Net Salary (Adjusted Gross) */}
                          <div className="text-sm text-blue-700 font-medium text-right">₹{Number(salary.adjusted_gross || 0).toLocaleString()}</div>

                          {/* Deductions */}
                          <div className="text-sm text-rose-700 font-medium text-right">₹{Number(salary.total_deductions || 0).toLocaleString()}</div>

                          {/* Net Payment */}
                          <div className="text-sm text-emerald-700 font-bold text-right">₹{Number(salary.net_payment || 0).toLocaleString()}</div>

                          {/* Actions */}
                          <div className="text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] z-10 px-2 py-3 -my-3 flex items-center justify-end">
                            <button
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const padding = 8;
                                let x = Math.min(rect.left, window.innerWidth - 200 - padding);
                                let y = rect.bottom + padding;
                                const menuHeight = 120;
                                if (y + menuHeight > window.innerHeight) { y = rect.top - menuHeight - padding; }
                                setMenuEmployee(employee);
                                setMenuPos({ x, y });
                                setMenuOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })

                  )}

                  {/* Total Row */}
                  {items.length > 0 && (
                    <div className="min-w-[2100px] grid grid-cols-[40px_80px_200px_120px_80px_100px_100px_110px_80px_80px_80px_80px_100px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-3 bg-slate-100 border-t-2 border-slate-200 items-center font-bold text-slate-900 sticky bottom-0 z-10 shadow-inner">
                      <div></div>
                      <div></div>
                      <div>Total Employees: {items.length}</div>
                      <div></div>
                      <div>Total</div>

                      {/* Total Days */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.total_days) || 0), 0)}</div>

                      {/* Present */}
                      <div className="text-right">{items.reduce((sum, item) => sum + ((Number(item?.metrics?.full_days) || 0) + ((Number(item?.metrics?.half_days) || 0) * 0.5)), 0).toFixed(1)}</div>

                      {/* Absent */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.absent_days) || 0), 0)}</div>

                      {/* Paid Leaves */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.total_paid_leave_days) || 0), 0).toFixed(1)}</div>

                      {/* Adj PL */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.adjusted_paid_leaves) || 0), 0).toFixed(1)}</div>

                      {/* Adj CO */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.adjusted_comp_offs) || 0), 0).toFixed(1)}</div>

                      {/* Week Off */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.total_week_offs) || 0), 0)}</div>

                      {/* Holidays */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.total_holidays) || 0), 0)}</div>

                      {/* Full Days */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.full_days) || 0), 0)}</div>

                      {/* Half Days */}
                      <div className="text-right">{items.reduce((sum, item) => sum + (Number(item?.metrics?.half_days) || 0), 0)}</div>

                      {/* Gross Salary */}
                      <div className="text-right">₹{items.reduce((sum, item) => sum + (Number(item?.salary?.gross_salary) || 0), 0).toLocaleString()}</div>

                      {/* Net Salary */}
                      <div className="text-right">₹{items.reduce((sum, item) => sum + (Number(item?.salary?.adjusted_gross) || 0), 0).toLocaleString()}</div>

                      {/* Deductions */}
                      <div className="text-right">₹{items.reduce((sum, item) => sum + (Number(item?.salary?.total_deductions) || 0), 0).toLocaleString()}</div>

                      <div></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-100 bg-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="text-xs text-slate-500">
                  Showing <span className="font-medium text-slate-900">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)}</span> of <span className="font-medium text-slate-900">{totalItems}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Prev</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      if (totalPages <= 5) {
                        return (
                          <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${page === pageNum ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors">
                    <span className="text-xs font-medium">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {
        menuOpen && menuPos && menuEmployee && createPortal(
          <div className="fixed inset-0 z-50" onClick={closeMenu}>
            <div className="absolute w-48 border border-slate-200 rounded-xl bg-white shadow-xl shadow-slate-200/50 text-sm overflow-hidden animate-in fade-in zoom-in duration-100" style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }} onClick={(e) => e.stopPropagation()}>
              <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors flex items-center gap-2.5" onClick={() => { setActiveEmployee(menuEmployee); setActiveView("payroll"); closeMenu(); }}>
                <Calendar className="w-4 h-4" />
                <span className="font-medium">View Payroll</span>
              </button>
              {menuEmployee.is_locked === 1 ? (
                <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors flex items-center gap-2.5" onClick={() => { handleLockUnlock([menuEmployee.id], 'unlock'); closeMenu(); }}>
                  <Unlock className="w-4 h-4" />
                  <span className="font-medium">Unlock Payroll</span>
                </button>
              ) : (
                <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors flex items-center gap-2.5" onClick={() => { handleLockUnlock([menuEmployee.id], 'lock'); closeMenu(); }}>
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">Lock Payroll</span>
                </button>
              )}
              <div className="border-t border-slate-100">
                <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-2.5" onClick={closeMenu}>
                  <X className="w-4 h-4" />
                  <span className="font-medium">Close</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
      {/* Lock Confirmation Modal */}
      {
        showLockConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-rose-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Lock All Payroll?</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Are you sure you want to lock payroll for <span className="font-medium text-slate-900">ALL {includeInactive ? '' : 'active'} employees</span> for this period? <br />This action cannot be easily undone.
                </p>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <input
                    type="checkbox"
                    id="includeInactiveLock"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="includeInactiveLock" className="text-sm text-slate-600">
                    Include Inactive Employees
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLockConfirm(false)}
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeLockAll}
                    className="flex-1 px-4 py-2 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    Yes, Lock All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Unlock Confirmation Modal */}
      {
        showUnlockConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Unlock className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Unlock All Payroll?</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Are you sure you want to unlock payroll for <span className="font-medium text-slate-900">ALL {includeInactive ? '' : 'active'} employees</span> for this period? <br />This will allow editing of attendance and metrics.
                </p>

                <div className="flex items-center justify-center gap-2 mb-6">
                  <input
                    type="checkbox"
                    id="includeInactiveUnlock"
                    checked={includeInactive}
                    onChange={(e) => setIncludeInactive(e.target.checked)}
                    className="rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                  />
                  <label htmlFor="includeInactiveUnlock" className="text-sm text-slate-600">
                    Include Inactive Employees
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUnlockConfirm(false)}
                    className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeUnlockAll}
                    className="flex-1 px-4 py-2 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    Yes, Unlock All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Export Modal */}
      {
        showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-semibold text-slate-900">Export Payroll</h3>
                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Cycle Info */}
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Selected Cycle</div>
                    <div className="text-sm font-semibold text-blue-900">
                      {formatDate(cycleStartKey)} - {formatDate(cycleEndKey)}
                    </div>
                  </div>
                </div>

                {/* Export Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Export Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExportType('payroll')}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${exportType === 'payroll'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <FileText className="w-4 h-4" />
                      Payroll Sheet
                    </button>
                    <button
                      onClick={() => setExportType('bank')}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${exportType === 'bank'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      Bank Sheet
                    </button>
                  </div>
                </div>

                {/* Site Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Site</label>
                  <select
                    value={exportSite}
                    onChange={(e) => setExportSite(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="all">All Sites (Grouped)</option>
                    {(canHRMode ? allSites : inchargeSites).map((s) => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {exportSite === 'all'
                      ? "Will generate a single sheet with all sites grouped and totaled."
                      : "Will generate a sheet for the selected site only."}
                  </p>
                </div>

                {/* Delivery Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Delivery Method</label>
                  <div className="flex gap-4 mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="exportMethod"
                        checked={exportMethod === 'download'}
                        onChange={() => setExportMethod('download')}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Download Locally</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="exportMethod"
                        checked={exportMethod === 'email'}
                        onChange={() => setExportMethod('email')}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Send via Email</span>
                    </label>
                  </div>

                  {exportMethod === 'email' && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <input
                        type="email"
                        value={exportEmail}
                        onChange={(e) => setExportEmail(e.target.value)}
                        placeholder="Enter email addresses (comma separated)"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* Late Mark Option (OrgAdmin Only) */}
                {((role || "").toLowerCase() === "orgadmin") && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={withLateMark}
                        onChange={(e) => setWithLateMark(e.target.checked)}
                        className="w-4 h-4 text-amber-600 border-slate-300 focus:ring-amber-500 rounded"
                      />
                      <span className="text-sm font-medium text-amber-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Export with Late Marks
                      </span>
                    </label>
                    <p className="text-[10px] text-amber-700 leading-tight">
                      Applies 0.5-day penalty for every 4th late mark (4, 8, 12...), ignoring overrides/regularizations.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isExporting || (exportMethod === 'email' && !exportEmail)}
                  onClick={async () => {
                    try {
                      setIsExporting(true);
                      const payload = {
                        cycle_start: cycleStartKey,
                        cycle_end: cycleEndKey,
                        type: exportType,
                        site_id: exportSite === 'all' ? null : parseInt(exportSite),
                        method: exportMethod,
                        email: exportEmail,
                        month: endKey.split('-')[1],
                        year: endKey.split('-')[0],
                        withLateMark: withLateMark
                      };

                      if (exportMethod === 'download') {
                        const response = await apiClient<Blob>('/attendance/export-payroll', {
                          method: 'POST',
                          body: payload,
                          responseType: 'blob'
                        });

                        const url = window.URL.createObjectURL(response);
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', `${exportType === 'payroll' ? 'Payroll_Sheet' : 'Bank_Sheet'}_${formatDate(cycleEndKey)}.xlsx`);
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                      } else {
                        await apiClient('/attendance/export-payroll', {
                          method: 'POST',
                          body: payload
                        });
                        toast.success('Email sent successfully!');
                      }
                      setShowExportModal(false);
                    } catch (err) {
                      console.error('Export failed:', err);
                      toast.error('Export failed. Please try again.');
                    } finally {
                      setIsExporting(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {/* Update Modal */}
      {
        showUpdateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="font-semibold text-slate-900">Update Payroll Data</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Cycle: <span className="font-medium text-slate-700">{formatDate(cycleStartKey)} - {formatDate(cycleEndKey)}</span>
                  </p>
                </div>
                <button
                  onClick={() => { setShowUpdateModal(false); setUpdateFile(null); }}
                  className="p-1 rounded-lg hover:bg-slate-200/50 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 font-medium text-blue-900">
                      <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs">1</div>
                      Download Template
                    </div>
                    <p className="text-sm text-blue-700 ml-8">
                      Download the current payroll data to an Excel file.
                    </p>
                    <button
                      onClick={handleDownloadTemplate}
                      className="ml-8 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Excel
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 font-medium text-slate-900">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs">2</div>
                      Upload & Update
                    </div>
                    <p className="text-sm text-slate-600 ml-8">
                      Update "New Payable Days" in the Excel and upload here.
                    </p>
                    <div className="ml-8">
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                <button
                  onClick={() => { setShowUpdateModal(false); setUpdateFile(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdatePayroll}
                  disabled={isUpdating || !updateFile}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Update Payroll
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
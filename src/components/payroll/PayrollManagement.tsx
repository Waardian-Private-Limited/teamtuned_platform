"use client";

import React from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/apiClient";
import PayrollCycleCalendar from "@/components/payroll/PayrollCycleCalendar";
import { Search, Filter, Users, Phone, Building, Clock, MapPin, MoreVertical, ChevronLeft, ChevronRight, Calendar, User, Shield, Eye, RefreshCw, X, CheckCircle, AlertCircle, LogOut, Layers, ChevronDown, Download, FileText, CreditCard, Loader2 } from "lucide-react";
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
  const [department, setDepartment] = React.useState<string>(""); const isEmployee = (role || "").toLowerCase() === "employee";
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

  // Cycle Navigation (EXACTLY like PayrollCycleCalendar)
  const [now, setNow] = React.useState<Date>(new Date());
  const [policyData, setPolicyData] = React.useState<any>(null);

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
    } catch (e: any) {
      setError(e?.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }, [hqMode, selectedSiteId, canHRMode, externalControl, extHq, extSiteId, startKey, endKey, search, department, page, pageSize, departments]);

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
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
              <select className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
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
              <label className="block text-xs font-medium text-slate-500 mb-1">Page Size</label>
              <select className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={String(pageSize)} onChange={(e) => setPageSize(parseInt(e.target.value) || 10)}>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </div>
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
              <div className="min-w-[1900px] h-full flex flex-col">
                {/* Fixed Header */}
                <div className="bg-white border-b border-slate-200 flex-shrink-0 z-10">
                  <div className="grid grid-cols-[80px_200px_150px_120px_80px_80px_80px_80px_80px_80px_80px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-3">
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Image</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Site</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Total Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Present</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Absent</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Paid Leaves</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Week Off</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Holidays</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Full Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Half Days</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Gross Salary</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Net Salary</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Deductions</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Net Payment</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-right">Actions</div>
                  </div>
                </div>

                {/* Scrollable Body - only vertical scroll, horizontal is handled by parent */}
                <div className="divide-y divide-slate-50 overflow-y-auto overflow-x-hidden flex-1 pr-2">
                  {loading ? (
                    // Ghost Loader
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="min-w-[1900px] grid grid-cols-[80px_200px_150px_120px_80px_80px_80px_80px_80px_80px_80px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-4 animate-pulse">
                        <div className="w-9 h-9 bg-slate-100 rounded-lg"></div>
                        <div className="h-4 bg-slate-100 rounded w-32"></div>
                        <div className="h-4 bg-slate-100 rounded w-20"></div>
                        <div className="h-4 bg-slate-100 rounded w-24"></div>
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
                        <div key={employee.id} className="min-w-[1900px] grid grid-cols-[80px_200px_150px_120px_80px_80px_80px_80px_80px_80px_80px_100px_100px_100px_100px_100px_80px] gap-2 px-4 py-3 hover:bg-slate-50 transition-colors items-center group border-l-2 border-transparent hover:border-blue-500">
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
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {employee.first_name} {employee.last_name}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{employee.department_name || "-"}</div>
                          </div>

                          {/* ID */}
                          <div className="text-sm text-slate-600 truncate">#{employee.id}</div>

                          {/* Site */}
                          <div className="text-sm text-slate-600 truncate">{employee.primary_site_name || "Unassigned"}</div>

                          {/* Total Days */}
                          <div className="text-sm text-slate-900 font-medium text-right">{metrics.total_days || 0}</div>

                          {/* Present */}
                          <div className="text-sm text-emerald-600 font-medium text-right">{metrics.full_days || 0}</div>

                          {/* Absent */}
                          <div className="text-sm text-rose-600 font-medium text-right">{metrics.absent_days || 0}</div>

                          {/* Paid Leaves */}
                          <div className="text-sm text-teal-600 font-medium text-right">{Number(metrics.total_paid_leave_days || 0).toFixed(1)}</div>

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
                          <div className="text-right">
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
                </div>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {totalItems > 0 && (
            <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-100 bg-white">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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

      {menuOpen && menuPos && menuEmployee && createPortal(
        <div className="fixed inset-0 z-50" onClick={closeMenu}>
          <div className="absolute w-48 border border-slate-200 rounded-xl bg-white shadow-xl shadow-slate-200/50 text-sm overflow-hidden animate-in fade-in zoom-in duration-100" style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }} onClick={(e) => e.stopPropagation()}>
            <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors flex items-center gap-2.5" onClick={() => { setActiveEmployee(menuEmployee); setActiveView("payroll"); closeMenu(); }}>
              <Calendar className="w-4 h-4" />
              <span className="font-medium">View Payroll</span>
            </button>
            <div className="border-t border-slate-100">
              <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-2.5" onClick={closeMenu}>
                <X className="w-4 h-4" />
                <span className="font-medium">Close</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Export Modal */}
      {showExportModal && (
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
                      year: endKey.split('-')[0]
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
      )}
    </div>
  );
}
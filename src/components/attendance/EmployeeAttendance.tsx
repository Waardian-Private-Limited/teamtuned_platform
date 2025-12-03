"use client";

import React from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/apiClient";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import LeavesManagement from "@/components/leaves/LeavesManagement";
import RedeemHistory from "@/components/redeem/RedeemHistory";
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
  Eye
} from "lucide-react";

type EmployeeItem = Record<string, any>;

type Props = {
  defaultHQ?: boolean;
  showHQToggle?: boolean;
  externalControl?: boolean;
  hqMode?: boolean;
  selectedSiteId?: number | null;
};

export default function EmployeeAttendance({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: Props) {
  const [hqMode, setHqMode] = React.useState<boolean>(extHq ?? defaultHQ);
  const [inchargeSites, setInchargeSites] = React.useState<Array<Record<string, any>>>([]);
  const [allSites, setAllSites] = React.useState<Array<Record<string, any>>>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(extSiteId ?? null);
  const [items, setItems] = React.useState<EmployeeItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  // Detail views
  const [activeView, setActiveView] = React.useState<"list" | "attendance" | "leaves" | "redeems">("list");
  const [activeEmployee, setActiveEmployee] = React.useState<EmployeeItem | null>(null);
  const [recentApps, setRecentApps] = React.useState<any[]>([]);
  const [recentLoading, setRecentLoading] = React.useState<boolean>(false);
  const [recentError, setRecentError] = React.useState<string | null>(null);

  // Floating action menu
  const [menuOpen, setMenuOpen] = React.useState<boolean>(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  const [menuEmployee, setMenuEmployee] = React.useState<EmployeeItem | null>(null);
  const closeMenu = React.useCallback(() => { setMenuOpen(false); setMenuPos(null); setMenuEmployee(null); }, []);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closeMenu]);

  // Filters
  const [search, setSearch] = React.useState<string>("");
  const [department, setDepartment] = React.useState<string>("");

  // Session-based permission gating
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const isEmployee = (role || "").toLowerCase() === "employee";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const canHRMode = !isEmployee || hasPerm("HR_MODE");
  const canViewAttendance = !isEmployee || ["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"].some((c) => hasPerm(c));

  // Client-side pagination
  const [page, setPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(10);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const filteredItems = React.useMemo(() => {
    const s = search.trim().toLowerCase();
    const d = department.trim().toLowerCase();
    return items.filter((it) => {
      const name = String(it.name || `${it.first_name || ""} ${it.last_name || ""}`).toLowerCase();
      const dept = String(it.department_name || it.department || "").toLowerCase();
      const passSearch = !s || name.includes(s) || String(it.phone || it.phone_number || "").toLowerCase().includes(s);
      const passDept = !d || dept.includes(d);
      return passSearch && passDept;
    });
  }, [items, search, department]);

  const pagedItems = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  React.useEffect(() => {
    (async () => {
      // Load session for role & permissions
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole((session.role || null) as string | null);
          setPermissions(session.employee?.permissions || []);
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

      // If HR mode is available, fetch all sites
      try {
        if (canHRMode) {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        }
      } catch { }
    })();
  }, []);

  // Reactively fetch all sites when HR capability becomes available
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

      const res = await apiClient<any>("/attendance/employee-management", { method: "GET", params, withAuth: true });
      const list: any[] = Array.isArray(res?.items) ? res.items : (Array.isArray(res) ? res : (res?.data || []));
      setItems(list.map((e: any) => ({ ...(e || {}) })));
      setPage(1);
    } catch (e: any) {
      setError(e?.message || "Failed to load employee attendance");
    } finally {
      setLoading(false);
    }
  }, [hqMode, selectedSiteId, canHRMode, externalControl, extHq, extSiteId]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  React.useEffect(() => {
    (async () => {
      if (activeView !== "leaves" || !activeEmployee) return;
      setRecentLoading(true);
      setRecentError(null);
      try {
        const targetIdRaw = (activeEmployee as any)?.id;
        const targetId = typeof targetIdRaw === 'number' ? targetIdRaw : parseInt(String(targetIdRaw)) || 0;
        const res = await apiClient<any>('/leaves/applications', { method: 'GET', withAuth: true, params: { limit: '3', employee_id: String(targetId || '') } });
        const list: any[] = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
        setRecentApps(list);
      } catch (e: any) {
        setRecentError(e?.message || 'Failed to load recent applications');
      } finally {
        setRecentLoading(false);
      }
    })();
  }, [activeView, activeEmployee]);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setActiveView("list"); setActiveEmployee(null); }}
              className="p-2 rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{nameLabel}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <ViewIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600 capitalize">
                    {activeView === "attendance" ? "Attendance Calendar" :
                      activeView === "leaves" ? "Leave Management" : "Redeem History"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {activeView === "attendance" && <AttendanceCalendar employeeId={idVal} employeeName={nameLabel} />}
            {activeView === "leaves" && (
              <div className="space-y-4">
                <LeavesManagement employeeId={idVal} employeeName={nameLabel} />
              </div>
            )}
            {activeView === "redeems" && <RedeemHistory employeeId={idVal} employeeName={nameLabel} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 lg:p-2">
      <div className="max-w-7xl mx-auto space-y-6">
        {isEmployee && !canViewAttendance && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-600" />
            <div className="text-red-700 font-medium">You do not have permission to view Attendance.</div>
          </div>
        )}

        {/* Filters Card */}
        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Filters & Search</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
            {/* HR Mode Toggle */}
            {!externalControl && showHQToggle && canHRMode && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <input
                  type="checkbox"
                  checked={hqMode && canHRMode}
                  onChange={(e) => setHqMode(e.target.checked)}
                  disabled={!canHRMode}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-blue-900">HR Mode</div>
                  <div className="text-xs text-blue-700">View all employees</div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Employees</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <input
                type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., Sales"
              />
            </div>

            {/* Site Selection */}
            {!externalControl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
                <select
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                  value={selectedSiteId == null ? "" : String(selectedSiteId)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setSelectedSiteId(null);
                      return;
                    }
                    const val = parseInt(raw, 10);
                    setSelectedSiteId(Number.isNaN(val) ? null : val);
                  }}
                >
                  {hqMode && canHRMode ? (
                    <option value="">All Sites</option>
                  ) : (
                    <option value="">Select Site</option>
                  )}
                  {(canHRMode ? allSites : inchargeSites).length === 0 && <option value="">No sites available</option>}
                  {(canHRMode ? allSites : inchargeSites).map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>
                      {String(s.name || s.site_name || s.id)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Page Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Page Size</label>
              <select
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                value={String(pageSize)}
                onChange={(e) => setPageSize(parseInt(e.target.value) || 10)}
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-600" />
            <div className="text-red-700 font-medium">{error}</div>
          </div>
        )}

        {/* Employee Table */}
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Employee List</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Showing {pagedItems.length} of {filteredItems.length}</span>
                {loading && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Badges</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sites</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedItems.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Users className="w-16 h-16 text-gray-300 mb-4" />
                        <div className="text-lg font-medium text-gray-900">No employees found</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {items.length === 0 ? "No employees available." : "No employees match your filters."}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {pagedItems.map((employee) => {
                  const name = String(employee.name || `${employee.first_name || ""} ${employee.last_name || ""}` || `Employee #${employee.id || "-"}`);
                  const phone = String(employee.phone || employee.phone_number || "-");
                  const dept = String(employee.department_name || employee.department || "-");
                  const status = String(employee.current_status || employee.status || employee.status_timeline || "-");
                  const sitesStr = String(employee.assigned_sites || (Array.isArray(employee.site_ids) ? employee.site_ids.join(", ") : employee.site_ids || "-"));

                  const getStatusConfig = (status: string) => {
                    const s = status.toLowerCase();
                    if (s.includes("absent")) return { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
                    if (s.includes("half") || s.includes("late") || s.includes("early")) return { color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" };
                    if (s.includes("present") || s.includes("checked")) return { color: "text-green-600", bg: "bg-green-50", border: "border-green-200" };
                    if (s.includes("work")) return { color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" };
                    return { color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" };
                  };

                  const statusConfig = getStatusConfig(status);

                  return (
                    <tr key={String(employee.id)} className="hover:bg-gray-50 transition-colors duration-150 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <span>ID: {String(employee.id || "-")}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{phone}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{dept}</span>
                        </div>
                      </td>

                      {/* Badges - Now includes Absent status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const badges = employee.badges || [];
                            const currentStatus = String(employee.current_status || "").toLowerCase();
                            const hasAttendance = employee.attendance && (employee.attendance.punch_in_time || employee.attendance.total_work_minutes > 0);

                            // If absent, show Absent badge
                            if (currentStatus === "absent" || (!hasAttendance && currentStatus !== "week_off" && currentStatus !== "holiday")) {
                              return (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
                                  Absent
                                </span>
                              );
                            }

                            // If week_off but has attendance, show Overtime badge
                            if (currentStatus === "week_off" && hasAttendance) {
                              return (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                  Overtime
                                </span>
                              );
                            }

                            // If week_off without attendance, show Week Off badge
                            if (currentStatus === "week_off" && !hasAttendance) {
                              return (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                  Week Off
                                </span>
                              );
                            }

                            // Format and display backend badges
                            return badges.map((badge: any, idx: number) => {
                              const label = String(badge.label || badge.type || "")
                                .replace(/_/g, " ")
                                .split(" ")
                                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                .join(" ");

                              const color = badge.color || "#6B7280";
                              const bgColor = `${color}15`; // 15 is hex for ~8% opacity

                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border"
                                  style={{
                                    backgroundColor: bgColor,
                                    color: color,
                                    borderColor: `${color}40`
                                  }}
                                >
                                  {label}
                                </span>
                              );
                            });
                          })()}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 text-sm">{sitesStr || "No sites"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const padding = 8;
                            let x = Math.min(rect.left, window.innerWidth - 200 - padding);
                            let y = rect.bottom + padding;
                            const menuHeight = 160;
                            if (y + menuHeight > window.innerHeight) {
                              y = rect.top - menuHeight - padding;
                            }
                            setMenuEmployee(employee);
                            setMenuPos({ x, y });
                            setMenuOpen(true);
                          }}
                          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-105 group-hover:bg-gray-200"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl p-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredItems.length)}</span> of{" "}
              <span className="font-semibold text-gray-900">{filteredItems.length}</span> employees
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  if (totalPages <= 5) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${page === pageNum
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}

                {totalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-400">...</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all duration-200 ${page === totalPages
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100"
                        }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-all duration-200"
              >
                <span className="text-sm font-medium">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions Menu Portal */}
      {
        menuOpen && menuPos && menuEmployee && createPortal(
          <div className="fixed inset-0 z-50" onClick={closeMenu}>
            <div
              className="absolute w-48 border border-gray-200 rounded-2xl bg-white shadow-lg shadow-gray-200/50 text-sm overflow-hidden animate-in fade-in-90 zoom-in-90"
              style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-4 py-3 hover:bg-blue-50 text-gray-700 hover:text-blue-700 transition-colors duration-150 flex items-center gap-3"
                onClick={() => { setActiveEmployee(menuEmployee); setActiveView("attendance"); closeMenu(); }}
              >
                <Calendar className="w-4 h-4" />
                <span>View Attendance</span>
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-green-50 text-gray-700 hover:text-green-700 transition-colors duration-150 flex items-center gap-3"
                onClick={() => { setActiveEmployee(menuEmployee); setActiveView("leaves"); closeMenu(); }}
              >
                <Leaf className="w-4 h-4" />
                <span>View Leaves</span>
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-purple-50 text-gray-700 hover:text-purple-700 transition-colors duration-150 flex items-center gap-3"
                onClick={() => { setActiveEmployee(menuEmployee); setActiveView("redeems"); closeMenu(); }}
              >
                <Gift className="w-4 h-4" />
                <span>View Redeems</span>
              </button>
            </div>
          </div>,
          document.body
        )
      }
    </div >
  );
}
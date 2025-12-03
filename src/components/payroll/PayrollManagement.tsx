"use client";

import React from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/apiClient";
import PayrollCycleCalendar from "@/components/payroll/PayrollCycleCalendar";
import { Search, Filter, Users, Phone, Building, Clock, MapPin, MoreVertical, ChevronLeft, ChevronRight, Calendar, User, Shield, Eye } from "lucide-react";

type EmployeeItem = Record<string, any>;

export default function PayrollManagement({ defaultHQ = true, showHQToggle = true, externalControl = false, hqMode: extHq, selectedSiteId: extSiteId }: { defaultHQ?: boolean; showHQToggle?: boolean; externalControl?: boolean; hqMode?: boolean; selectedSiteId?: number | null }) {
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

  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const isEmployee = (role || "").toLowerCase() === "employee";
  const hasPerm = (code: string) => (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());
  const canHRMode = !isEmployee || hasPerm("HR_MODE");

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
      } catch { }

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
      setError(e?.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [hqMode, selectedSiteId, canHRMode, externalControl, extHq, extSiteId]);

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
      <div className="min-h-screen bg-slate-50 p-3 lg:p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveView("list"); setActiveEmployee(null); }} className="p-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">{nameLabel}</h1>
                <div className="text-xs text-slate-500">Payroll Management</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-6">
            <PayrollCycleCalendar employeeId={idVal} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-3 lg:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Filters & Search</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
            {!externalControl && showHQToggle && canHRMode && (
              <div className="flex items-center gap-3 p-2.5 bg-blue-50/50 rounded-lg border border-blue-100">
                <input type="checkbox" checked={hqMode && canHRMode} onChange={(e) => setHqMode(e.target.checked)} disabled={!canHRMode} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                <div>
                  <div className="text-sm font-medium text-blue-900">HR Mode</div>
                  <div className="text-xs text-blue-700">View all employees</div>
                </div>
              </div>
            )}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Search Employees</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..." />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Department</label>
              <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Sales" />
            </div>
            {!externalControl && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Site</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={selectedSiteId == null ? "" : String(selectedSiteId)} onChange={(e) => { const raw = e.target.value; if (raw === "") { setSelectedSiteId(null); return; } const val = parseInt(raw, 10); setSelectedSiteId(Number.isNaN(val) ? null : val); }}>
                  {hqMode && canHRMode ? (<option value="">All Sites</option>) : (<option value="">Select Site</option>)}
                  {(canHRMode ? allSites : inchargeSites).length === 0 && <option value="">No sites available</option>}
                  {(canHRMode ? allSites : inchargeSites).map((s) => (
                    <option key={String(s.id)} value={String(s.id)}>{String(s.name || s.site_name || s.id)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Page Size</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" value={String(pageSize)} onChange={(e) => setPageSize(parseInt(e.target.value) || 10)}>
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-rose-600" />
            <div className="text-rose-700 font-medium text-sm">{error}</div>
          </div>
        )}

        {/* Employee List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Employee List</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Showing {pagedItems.length} of {filteredItems.length}</span>
              {loading && <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedItems.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-12 h-12 mb-3 opacity-50" />
                        <div className="text-base font-medium text-slate-900">No employees found</div>
                        <div className="text-sm mt-1">{items.length === 0 ? "No employees available." : "No employees match your filters."}</div>
                      </div>
                    </td>
                  </tr>
                )}

                {pagedItems.map((employee) => {
                  const name = String(employee.name || `${employee.first_name || ""} ${employee.last_name || ""}` || `Employee #${employee.id || "-"}`);
                  const phone = String(employee.phone || employee.phone_number || "-");
                  const dept = String(employee.department_name || employee.department || "-");

                  return (
                    <tr key={String(employee.id)} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{name}</div>
                            <div className="text-xs text-slate-500">ID: {String(employee.id || "-")}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{phone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dept}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
            <div className="text-xs text-slate-500">
              Showing <span className="font-medium text-slate-900">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredItems.length)}</span> of <span className="font-medium text-slate-900">{filteredItems.length}</span>
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
        )}

        {menuOpen && menuPos && menuEmployee && createPortal(
          <div className="fixed inset-0 z-50" onClick={closeMenu}>
            <div className="absolute w-48 border border-slate-200 rounded-xl bg-white shadow-xl shadow-slate-200/50 text-sm overflow-hidden animate-in fade-in zoom-in duration-100" style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }} onClick={(e) => e.stopPropagation()}>
              <button className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors flex items-center gap-2.5" onClick={() => { setActiveEmployee(menuEmployee); setActiveView("payroll"); closeMenu(); }}>
                <Calendar className="w-4 h-4" />
                <span className="font-medium">View Payroll</span>
              </button>
              <div className="border-t border-slate-100">
                <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-slate-600 transition-colors flex items-center gap-2.5" onClick={closeMenu}>
                  <Eye className="w-4 h-4" />
                  <span className="font-medium">Close</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
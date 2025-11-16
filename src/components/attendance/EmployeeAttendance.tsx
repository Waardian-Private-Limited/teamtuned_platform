"use client";

import React from "react";
import { createPortal } from "react-dom";
import { apiClient } from "@/lib/apiClient";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import LeavesManagement from "@/components/leaves/LeavesManagement";
import RedeemHistory from "@/components/redeem/RedeemHistory";

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

  // Floating action menu (viewport portal)
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
      } catch {}

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

      // If HR mode is available, fetch all sites to allow optional filtering in HQ mode
      try {
        if (canHRMode) {
          const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
          const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
          setAllSites(list as any[]);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactively fetch all sites when HR capability becomes available
  React.useEffect(() => {
    (async () => {
      if (!canHRMode || allSites.length > 0) return;
      try {
        const res = await apiClient<{ sites?: any[]; data?: any[] }>("/sites", { method: "GET", withAuth: true, params: { incharge_only: "0" } });
        const list = Array.isArray(res?.sites) ? res!.sites! : (Array.isArray(res?.data) ? res!.data! : []);
        setAllSites(list as any[]);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canHRMode]);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      const effHq = (externalControl ? (extHq ?? hqMode) : hqMode) && canHRMode;
      const effSite = externalControl ? (extSiteId ?? selectedSiteId) : selectedSiteId;
      // Guard: require either HR mode or a selected site
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
      setPage(1); // reset to first page when filters change
    } catch (e: any) {
      setError(e?.message || "Failed to load employee attendance");
    } finally {
      setLoading(false);
    }
  }, [hqMode, selectedSiteId]);

  React.useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalControl ? extHq : hqMode, externalControl ? extSiteId : selectedSiteId]);

  // Render detail view when active
  if (activeView !== "list" && activeEmployee) {
    const idVal = (() => {
      const id = (activeEmployee as any).id;
      if (typeof id === "number") return id;
      const parsed = parseInt(String(id));
      return Number.isNaN(parsed) ? 0 : parsed;
    })();
    const nameLabel = String(activeEmployee.name || `${activeEmployee.first_name || ""} ${activeEmployee.last_name || ""}` || `#${idVal}`);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded text-xs" onClick={() => { setActiveView("list"); setActiveEmployee(null); }}>
            ← Back
          </button>
          <div className="text-sm font-semibold">{nameLabel}</div>
          <div className="text-xs text-gray-500">{activeView === "attendance" ? "Attendance" : activeView === "leaves" ? "Leaves" : "Redeems"}</div>
        </div>
        {activeView === "attendance" && <AttendanceCalendar employeeId={idVal} employeeName={nameLabel} />}
        {activeView === "leaves" && <LeavesManagement employeeId={idVal} employeeName={nameLabel} />}
        {activeView === "redeems" && <RedeemHistory employeeId={idVal} employeeName={nameLabel} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isEmployee && !canViewAttendance && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm rounded-md">You do not have permission to view Attendance.</div>
      )}

      {/* Filters */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          {!externalControl && showHQToggle && canHRMode && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hqMode && canHRMode} onChange={(e) => setHqMode(e.target.checked)} disabled={!canHRMode} />
              <span>HR Mode</span>
            </label>
          )}
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-600">Search</label>
            <input type="text" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Department</label>
            <input type="text" className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g., Sales" />
          </div>
          {!externalControl && (
            <div>
              <label className="block text-xs text-gray-600">Site</label>
              <select
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
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
                  <option value="">All sites</option>
                ) : (
                  <option value="">Select a site</option>
                )}
                {(canHRMode ? allSites : inchargeSites).length === 0 && <option value="">No sites</option>}
                {(canHRMode ? allSites : inchargeSites).map((s) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.name || s.site_name || s.id)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-600">Page Size</label>
            <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={String(pageSize)} onChange={(e) => setPageSize(parseInt(e.target.value) || 10)}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="space-y-3">
        {loading && items.length === 0 && <div className="p-6 text-center text-sm">Loading...</div>}
        {error && <div className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
        {!loading && items.length === 0 && !error && <div className="p-6 text-center text-sm text-gray-600">No employees</div>}

        {items.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Employee</th>
                  <th className="text-left px-3 py-2">Phone</th>
                  <th className="text-left px-3 py-2">Department</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Assigned Sites</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((r) => {
                  const name = String(r.name || `${r.first_name || ""} ${r.last_name || ""}` || `Employee #${r.id || "-"}`);
                  const phone = String(r.phone || r.phone_number || "-");
                  const dept = String(r.department_name || r.department || "-");
                  const status = String(r.current_status || r.status || r.status_timeline || "-");
                  const statusColor = (() => {
                    const v = status.toLowerCase();
                    if (v.includes("absent")) return "text-red-600";
                    if (v.includes("half") || v.includes("late") || v.includes("early")) return "text-yellow-600";
                    if (v.includes("present") || v.includes("checked")) return "text-green-600";
                    if (v.includes("work")) return "text-indigo-600";
                    return "text-gray-500";
                  })();
                  const sitesStr = String(r.assigned_sites || (Array.isArray(r.site_ids) ? r.site_ids.join(", ") : r.site_ids || "-"));
                  return (
                    <tr key={String(r.id)} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{name}</div>
                        <div className="text-xs text-gray-500">#{String(r.id || "-")}</div>
                      </td>
                      <td className="px-3 py-2">{phone}</td>
                      <td className="px-3 py-2">{dept}</td>
                      <td className="px-3 py-2"><span className={`text-xs font-semibold ${statusColor}`}>{status}</span></td>
                      <td className="px-3 py-2">{sitesStr || "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-block text-left">
                          <button
                            type="button"
                            className="text-xs px-2 py-1 rounded border"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const padding = 8;
                              // Default below the button
                              let x = Math.min(rect.left, window.innerWidth - 180 - padding);
                              let y = rect.bottom + padding;
                              // If near bottom, flip upward
                              const menuHeight = 140; // approx
                              if (y + menuHeight > window.innerHeight) {
                                y = rect.top - menuHeight - padding;
                              }
                              setMenuEmployee(r);
                              setMenuPos({ x, y });
                              setMenuOpen(true);
                            }}
                          >
                            ⋮
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {items.length > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">Page {page} of {totalPages} • Showing {pagedItems.length} of {filteredItems.length}</div>
            <div className="flex items-center gap-2">
              <button className="text-xs px-3 py-1 rounded border disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="text-xs px-3 py-1 rounded border disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        )}
      </div>
      {/* Actions Portal */}
      {menuOpen && menuPos && menuEmployee && createPortal(
        <div className="fixed inset-0 z-50" onClick={closeMenu}>
          <div
            className="absolute w-44 border rounded bg-white shadow text-sm"
            style={{ left: `${menuPos.x}px`, top: `${menuPos.y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => { setActiveEmployee(menuEmployee); setActiveView("attendance"); closeMenu(); }}
            >
              View Attendance
            </button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => { setActiveEmployee(menuEmployee); setActiveView("leaves"); closeMenu(); }}
            >
              View Leaves
            </button>
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => { setActiveEmployee(menuEmployee); setActiveView("redeems"); closeMenu(); }}
            >
              View Redeems
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
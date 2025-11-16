"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

type Props = {
  employeeId: number;
  employeeName?: string;
};

type AttendanceRecord = Record<string, any>;

export default function AttendanceCalendar({ employeeId, employeeName }: Props) {
  const [month, setMonth] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = React.useState<Record<string, any> | null>(null);
  const [gridMode, setGridMode] = React.useState<boolean>(true);

  const year = month.getFullYear();
  const mon = month.getMonth() + 1;

  const fetchMonthly = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/attendance/monthly", {
        method: "GET",
        withAuth: true,
        params: { employee_id: String(employeeId), month: String(mon), year: String(year) },
      });
      const list: any[] = Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.records)
        ? res.records
        : Array.isArray(res)
        ? res
        : (res?.data || []);
      setItems(list.map((e: any) => ({ ...(e || {}) })));
      // Capture monthly summary when available
      if (res?.summary) setSummary(res.summary);
      else setSummary(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load monthly attendance");
    } finally {
      setLoading(false);
    }
  }, [employeeId, mon, year]);

  React.useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  // Build date map for quick lookup
  const dateMap = React.useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    (items || []).forEach((r) => {
      const key = String(r.attendance_date || r.date || "").slice(0, 10);
      if (key) m.set(key, r);
    });
    return m;
  }, [items]);

  const daysInMonth = React.useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const totalDays = last.getDate();
    const startWeekday = first.getDay(); // 0=Sun
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const prevMonth = () => {
    setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    const cand = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    if (cand > current) return;
    setMonth(cand);
  };

  const statusColor = (s?: string) => {
    const v = (s || "").toLowerCase();
    if (v.includes("absent")) return "#ef4444";
    if (v.includes("half") || v.includes("late") || v.includes("early")) return "#f59e0b";
    if (v.includes("present")) return "#22c55e";
    if (v.includes("work")) return "#6366f1";
    return "#6b7280";
  };

  const fmtTime = (raw?: string) => {
    if (!raw) return "--:--";
    try {
      const dt = new Date(raw);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return raw;
    }
  };
  const fmtMinutes = (min?: number) => {
    const m = Number(min || 0);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}h ${mm}m`;
  };
  const chipClass = (color: string) =>
    `inline-flex items-center text-[11px] px-2 py-1 rounded-md border shadow-sm`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{employeeName || `Employee #${employeeId}`}</div>
          <div className="text-xs text-gray-500">Attendance Calendar</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 border rounded text-xs" onClick={prevMonth}>Prev</button>
          <div className="text-xs">{month.toLocaleString(undefined, { month: "long", year: "numeric" })}</div>
          <button className="px-2 py-1 border rounded text-xs" onClick={nextMonth}>Next</button>
          <button className="px-2 py-1 border rounded text-xs" onClick={() => setGridMode((v) => !v)}>{gridMode ? "List" : "Grid"}</button>
        </div>
      </div>

      {/* Summary bar (modern) */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">Working Days</div>
            <div className="text-sm font-semibold">{summary.total_working_days}</div>
          </div>
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">Present</div>
            <div className="text-sm font-semibold text-green-600">{summary.present_days}</div>
          </div>
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">Half Days</div>
            <div className="text-sm font-semibold text-amber-600">{summary.half_days}</div>
          </div>
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">Absent</div>
            <div className="text-sm font-semibold text-red-600">{summary.absent_days}</div>
          </div>
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">Late / Early</div>
            <div className="text-sm font-semibold"><span className="text-amber-600">{summary.late_days}</span> / <span className="text-amber-600">{summary.early_exit_days}</span></div>
          </div>
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">OT</div>
            <div className="text-sm font-semibold text-indigo-600">{fmtMinutes(summary.overtime_minutes)} ({summary.overtime_days} d)</div>
          </div>
          <div className="p-2 rounded border bg-white">
            <div className="text-[11px] text-gray-500">WO / Holidays</div>
            <div className="text-sm font-semibold">{summary.total_week_offs} / {summary.total_holidays}</div>
          </div>
          <div className="p-2 rounded border bg-white col-span-2 lg:col-span-2">
            <div className="text-[11px] text-gray-500">Cycle</div>
            <div className="text-sm font-medium">{summary.cycle_start} → {summary.cycle_end}</div>
          </div>
        </div>
      )}

      {/* Today status chip */}
      {(() => {
        const todayKey = new Date().toISOString().slice(0, 10);
        const rec = dateMap.get(todayKey);
        if (!rec) return null;
        const status = String(rec.status_timeline || rec.status || "-");
        const color = statusColor(status);
        return (
          <div className="text-xs">
            <span className="px-2 py-1 border rounded" style={{ borderColor: color, color }}>Today: {status}</span>
          </div>
        );
      })()}

      {loading && <div className="p-4 text-center text-sm">Loading...</div>}
      {error && <div className="p-3 border bg-red-50 text-red-700 text-xs rounded">{error}</div>}
      {!loading && items.length === 0 && !error && <div className="p-4 text-center text-sm text-gray-600">No records</div>}

      {!loading && (
        gridMode ? (
          <div className="border rounded">
            {/* Weekday header */}
            <div className="grid grid-cols-7 text-xs font-semibold bg-gray-50 border-b">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="px-2 py-2 text-center text-gray-600">{d}</div>
              ))}
            </div>
            {/* Month cells with stacked chips */}
            <div className="grid grid-cols-7 gap-px p-px">
              {daysInMonth.map((d, idx) => {
                if (!d) return <div key={idx} className="min-h-[110px] bg-gray-50" />;
                const key = d.toISOString().slice(0, 10);
                const r = dateMap.get(key);
                const status = String(r?.status_timeline || r?.status || "-");
                const isToday = new Date().toISOString().slice(0, 10) === key;

                const chips: Array<{ label: string; color: string }> = [];
                const tw = Number(r?.total_work_minutes || 0);
                const late = Number(r?.late_by_minutes || 0);
                const early = Number(r?.early_exit_minutes || 0);
                const ot = Number(r?.overtime_minutes || 0);
                const isHoliday = !!r?.is_holiday;
                const isWO = !!r?.is_weekly_off;

                if (isHoliday) chips.push({ label: "Holiday", color: "#7c3aed" });
                if (isWO) chips.push({ label: "Week Off", color: "#6b7280" });

                if (status.toLowerCase().includes("absent")) chips.push({ label: "Absent", color: "#ef4444" });
                else if (tw >= 8 * 60) chips.push({ label: `Present • ${fmtMinutes(tw)}`, color: "#22c55e" });
                else if (tw >= 4 * 60) chips.push({ label: `Half Day • ${fmtMinutes(tw)}`, color: "#f59e0b" });
                else if (!isHoliday && !isWO && tw > 0) chips.push({ label: `Worked • ${fmtMinutes(tw)}`, color: "#6366f1" });
                else if (status && status !== "-") chips.push({ label: status, color: statusColor(status) });

                if (late > 0) chips.push({ label: `Late • ${late}m`, color: "#f59e0b" });
                if (early > 0) chips.push({ label: `Early Exit • ${early}m`, color: "#f59e0b" });
                if (ot > 0) chips.push({ label: `OT • ${fmtMinutes(ot)}`, color: "#4f46e5" });

                return (
                  <div key={key} className="min-h-[110px] bg-white border rounded-md p-2 flex flex-col">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] text-gray-500 font-medium">{d.getDate()}</div>
                      {isToday && <div className="w-5 h-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center">●</div>}
                    </div>
                    <div className="mt-2 space-y-1">
                      {chips.length === 0 ? (
                        <div className="text-[11px] text-gray-300">No data</div>
                      ) : (
                        chips.slice(0, 4).map((c, i) => (
                          <div key={i} className="truncate">
                            <span className={chipClass(c.color)} style={{ borderColor: c.color, color: c.color }}>{c.label}</span>
                          </div>
                        ))
                      )}
                    </div>
                    {r && (
                      <div className="mt-auto grid grid-cols-2 gap-1 text-[11px]">
                        <div>
                          <div className="text-gray-400">In</div>
                          <div className="font-medium">{fmtTime(String(r?.punch_in_time || ""))}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Out</div>
                          <div className="font-medium">{fmtTime(String(r?.punch_out_time || ""))}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="border rounded overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">In</th>
                  <th className="text-left px-3 py-2">Out</th>
                </tr>
              </thead>
              <tbody>
                {/* Render whole month in list view too */}
                {daysInMonth.map((d, idx) => {
                  if (!d) return (
                    <tr key={`blank-${idx}`} className="border-t">
                      <td className="px-3 py-2 text-gray-300" colSpan={4}>—</td>
                    </tr>
                  );
                  const key = d.toISOString().slice(0, 10);
                  const r = dateMap.get(key);
                  const status = String(r?.status_timeline || r?.status || "-");
                  const color = statusColor(status);
                  const dateStr = d.toLocaleDateString();
                  return (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{dateStr}</td>
                      <td className="px-3 py-2"><span className="font-medium" style={{ color }}>{status}</span></td>
                      <td className="px-3 py-2">{fmtTime(String(r?.punch_in_time || ""))}</td>
                      <td className="px-3 py-2">{fmtTime(String(r?.punch_out_time || ""))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
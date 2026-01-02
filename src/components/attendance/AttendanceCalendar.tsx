"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  FileText,
  User,
  AlertTriangle
} from "lucide-react";
import AttendanceDetailsModal from "./AttendanceDetailsModal";

type Props = {
  employeeId: number;
  employeeName?: string;
  onBack?: () => void;
};

type AttendanceRecord = Record<string, any>;

export default function AttendanceCalendar({ employeeId, employeeName, onBack }: Props) {
  const [month, setMonth] = React.useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = React.useState<Record<string, any> | null>(null);
  const [cycleInfo, setCycleInfo] = React.useState<{ start: string; end: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = React.useState<AttendanceRecord | null>(null);

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

      let list: any[] = [];
      if (Array.isArray(res?.records)) list = res.records;
      else if (Array.isArray(res?.items)) list = res.items;
      else if (Array.isArray(res)) list = res;

      setItems(list);
      const sum = res?.summary || {};
      if (res?.salary_date) sum.salary_date = res.salary_date;
      setSummary(sum);

      // Extract cycle info
      if (res?.cycle_start && res?.cycle_end) {
        setCycleInfo({ start: res.cycle_start, end: res.cycle_end });
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [employeeId, mon, year]);

  React.useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  const dateMap = React.useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    items.forEach((r) => {
      const dateStr = r?.attendance_date;
      if (!dateStr) return;

      // Use the date string directly without timezone conversion
      // Format: "2025-11-02" stays as "2025-11-02"
      const normalizedDate = String(dateStr).split('T')[0];
      m.set(normalizedDate, r);
    });
    return m;
  }, [items]);

  const daysInMonth = React.useMemo(() => {
    const y = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const totalDays = last.getDate();
    const startWeekday = first.getDay();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [month]);

  const prevMonth = () => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => {
    const now = new Date();
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    const cand = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    if (cand > current) return;
    setMonth(cand);
  };

  const getStatusInfo = (record?: AttendanceRecord | null, dateKey?: string) => {
    // Check if date is in the future
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isFuture = dateKey ? dateKey > todayKey : false;

    // Future dates should not be marked as absent
    if (isFuture && !record?.attendance_id) {
      return {
        color: "bg-white border-slate-100 text-slate-300",
        dotColor: "bg-slate-200",
        label: "—",
        type: "future"
      };
    }

    // Holiday takes priority (but check for overtime work)
    if (record?.is_holiday) {
      // If there's an attendance record on a holiday, it's overtime work
      if (record?.attendance_id && record?.total_work_minutes > 0) {
        return {
          color: "bg-indigo-100 border-indigo-300 text-indigo-900",
          dotColor: "bg-indigo-600",
          label: "OT",
          type: "overtime"
        };
      }
      return {
        color: "bg-purple-100 border-purple-300 text-purple-800",
        dotColor: "bg-purple-500",
        label: "H",
        type: "holiday"
      };
    }

    // Week off (but check for overtime work)
    if (record?.is_weekly_off) {
      // If there's an attendance record on a week off, it's overtime work
      if (record?.attendance_id !== null) {
        return {
          color: "bg-indigo-100 border-indigo-300 text-indigo-900",
          dotColor: "bg-indigo-600",
          label: "OT",
          type: "overtime"
        };
      }
      return {
        color: "bg-slate-100 border-slate-300 text-slate-600",
        dotColor: "bg-slate-400",
        label: "WO",
        type: "weekoff"
      };
    }

    // Only if status = "Completed" and status_timeline is Full-Day or Half-Day
    if (record?.status === "Completed") {
      if (record?.status_timeline === "Full-Day") {
        return {
          color: "bg-emerald-100 border-emerald-300 text-emerald-900",
          dotColor: "bg-emerald-600",
          label: "P",
          type: "fullday"
        };
      } else if (record?.status_timeline === "Half-Day") {
        return {
          color: "bg-amber-100 border-amber-300 text-amber-900",
          dotColor: "bg-amber-600",
          label: "HD",
          type: "halfday"
        };
      }
    }

    // Paid Leave
    if (record?.status === 'Leave' || record?.is_leave || record?.is_paid_leave) {
      return {
        color: "bg-teal-100 border-teal-300 text-teal-900",
        dotColor: "bg-teal-600",
        label: "PL",
        type: "paidleave"
      };
    }

    // If no attendance_id and not future, it's absent
    if (!record?.attendance_id && !isFuture) {
      return {
        color: "bg-rose-100 border-rose-300 text-rose-900",
        dotColor: "bg-rose-600",
        label: "A",
        type: "absent"
      };
    }

    // Default to neutral for edge cases
    return {
      color: "bg-white border-slate-100 text-slate-300",
      dotColor: "bg-slate-200",
      label: "—",
      type: "unknown"
    };
  };

  const stats = summary || {};
  const present = stats.Present || 0;
  const absent = stats.Absent || 0;
  const fullDay = stats.FullDay || 0;
  const halfDay = stats.HalfDay || 0;
  const leaves = stats.Leaves || 0;
  const overtime = stats.Overtime || 0;
  const holiday = stats.Holiday || 0;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "—";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return "—";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Section - Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-6 py-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
            )}
            <div>
              <h1 className="text-slate-900 flex items-center gap-2 font-semibold text-lg">
                Attendance Calendar
              </h1>
              {employeeName && (
                <p className="text-sm text-slate-600 mt-0.5">{employeeName}</p>
              )}
            </div>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>

            <div className="min-w-[160px] text-center">
              <div className="text-slate-900 font-medium">
                {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </div>
            </div>

            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>

        {/* Cycle Info & Legend */}
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          {cycleInfo && (
            <div className="inline-flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Cycle: {formatDate(cycleInfo.start)} - {formatDate(cycleInfo.end)}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span>P - Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span>A - Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>HD - Half Day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span>H - Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-300"></div>
              <span>WO - Week Off</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span>OT - Overtime</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>LD - Late Deduction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-teal-500"></div>
              <span>PL - Paid Leave</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Calendar Section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1">
            <div className="max-w-6xl mx-auto p-2">
              {loading && (
                <div className="text-center py-20 text-slate-500">
                  <div className="inline-block w-8 h-8 border-3 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-2"></div>
                  <div>Loading attendance...</div>
                </div>
              )}

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700 text-sm">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <div className="bg-white rounded-lg border border-slate-200 max-h-[520px] overflow-auto">
                  {/* Weekday Header - Sticky */}
                  <div className="sticky top-0 z-10 grid grid-cols-7 gap-px bg-slate-200 border-b border-slate-200">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="bg-slate-50 py-2 text-center">
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{day}</div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-px bg-slate-200">
                    {daysInMonth.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="bg-slate-50/30 aspect-square min-h-[52px]" />;
                      }

                      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                      const record = dateMap.get(dateKey);
                      const now = new Date();
                      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      const isToday = todayKey === dateKey;

                      const statusInfo = getStatusInfo(record, dateKey);

                      return (
                        <button
                          key={dateKey}
                          onClick={() => record && setSelectedRecord(record)}
                          className={`aspect-square min-h-[52px] p-1 flex flex-col items-center justify-start pt-1 transition-all relative group ${statusInfo.color} ${isToday ? "ring-2 ring-inset ring-blue-500" : ""
                            } ${record ? "hover:shadow-md cursor-pointer" : "cursor-default"}`}
                        >
                          {isToday && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}

                          <div className="text-xs font-semibold mb-0.5">{date.getDate()}</div>

                          <div className="flex items-center gap-0.5">
                            <div className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></div>
                            <div className="text-xs font-semibold">{statusInfo.label}</div>
                          </div>

                          {record && record.badges && Array.isArray(record.badges) && record.badges.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {record.badges.slice(0, 3).map((b: any, i: number) => {
                                const t = String(b.type || '').toLowerCase();
                                if (t === 'late' || t === 'late_deduction') return <Clock key={i} className="w-3 h-3 text-orange-500" />;
                                if (t === 'early_penalty') return <Clock key={i} className="w-3 h-3 text-red-500" />;
                                if (t === 'overridden') return <User key={i} className="w-3 h-3 text-blue-500" />;
                                if (t === 'break' || t === 'break_availed') return <Clock key={i} className="w-3 h-3 text-amber-500" />;
                                if (t === 'outside_work') return <MapPin key={i} className="w-3 h-3 text-cyan-500" />;
                                if (t === 'overtime') return <TrendingUp key={i} className="w-3 h-3 text-indigo-500" />;
                                if (t === 'paid_leave') return <FileText key={i} className="w-3 h-3 text-teal-500" />;
                                return null;
                              })}
                            </div>
                          )}

                          {record && record.total_work_minutes > 0 && (
                            <div className="text-[11px] opacity-70 mt-auto pb-0.5 font-semibold">
                              {Math.floor(record.total_work_minutes / 60)}h
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="w-64 bg-white border-l border-slate-200 p-4 overflow-auto">
          <div className="space-y-3">
            <div className="pb-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Summary</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-sm text-slate-700">Present</span>
                </div>
                <span className="font-semibold text-emerald-900">{present}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/50 border border-rose-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-sm text-slate-700">Absent</span>
                </div>
                <span className="font-semibold text-rose-900">{absent}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-slate-700">Full Day</span>
                </div>
                <span className="font-semibold text-blue-900">{fullDay}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm text-slate-700">Half Day</span>
                </div>
                <span className="font-semibold text-amber-900">{halfDay}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-purple-50/50 border border-purple-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-sm text-slate-700">Leaves</span>
                </div>
                <span className="font-semibold text-purple-900">{leaves}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                  <span className="text-sm text-slate-700">Overtime</span>
                </div>
                <span className="font-semibold text-indigo-900">{overtime}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-violet-50/50 border border-violet-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  <span className="text-sm text-slate-700">Holiday</span>
                </div>
                <span className="font-semibold text-violet-900">{holiday}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50 border border-orange-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-slate-700">Late Deduction</span>
                </div>
                <span className="font-semibold text-orange-900">{stats.LateDeduction ?? stats.LateMarks ?? 0}</span>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <AttendanceDetailsModal
          record={selectedRecord}
          salaryDate={summary?.salary_date}
          isLocked={summary?.salary_date ? new Date() > new Date(summary.salary_date) : false}
          onUpdate={fetchMonthly}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
}

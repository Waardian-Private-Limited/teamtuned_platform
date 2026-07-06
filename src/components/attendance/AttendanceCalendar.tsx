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
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import ResetAttendanceModal from "./ResetAttendanceModal";
import { useAuth } from "@/context/AuthContext";
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
  const [showResetModal, setShowResetModal] = React.useState<boolean>(false);
  const { role } = useAuth();
  const isOrgAdmin = role?.toLowerCase() === 'orgadmin' || role?.toLowerCase() === 'superadmin';

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
    if (isFuture && !(record?.attendance_id || record?.id)) {
      return {
        color: "bg-white border-slate-100 text-slate-300",
        dotColor: "bg-slate-200",
        label: "—",
        type: "future"
      };
    }

    // Holiday takes priority (but check for overtime work)
    if (record?.is_holiday) {
      if ((record?.attendance_id || record?.id) && record?.total_work_minutes > 0) {
        return {
          color: "bg-blue-50 border-blue-200 text-blue-900",
          dotColor: "bg-blue-600",
          label: "OT",
          type: "overtime"
        };
      }
      return {
        color: "bg-purple-50 border-purple-200 text-purple-800",
        dotColor: "bg-purple-500",
        label: "H",
        type: "holiday"
      };
    }

    // Week off (but check for overtime work)
    if (record?.is_weekly_off) {
      if (record?.attendance_id || record?.id) {
        return {
          color: "bg-blue-50 border-blue-200 text-blue-900",
          dotColor: "bg-blue-600",
          label: "OT",
          type: "overtime"
        };
      }
      return {
        color: "bg-slate-50 border-slate-200 text-slate-600",
        dotColor: "bg-slate-400",
        label: "WO",
        type: "weekoff"
      };
    }

    // Only if status = "Completed" and status_timeline is Full-Day or Half-Day
    if (record?.status === "Completed" || record?.status === "Present") {
      if (record?.status_timeline === "Half-Day" || record?.status_summary?.includes("Half")) {
        return {
          color: "bg-amber-50 border-amber-200 text-amber-900",
          dotColor: "bg-amber-600",
          label: "HD",
          type: "halfday"
        };
      } else {
        return {
          color: "bg-emerald-50 border-emerald-200 text-emerald-900",
          dotColor: "bg-emerald-600",
          label: "P",
          type: "fullday"
        };
      }
    }

    // Night OT (if not marked completed/absent yet but active/was night ot)
    if (record?.was_night_ot) {
      return {
        color: "bg-emerald-50 border-emerald-200 text-emerald-900",
        dotColor: "bg-emerald-600",
        label: "P",
        type: "fullday"
      };
    }

    // Unpaid Leave (Leave but not paid)
    const leaveType = (record?.leave_type || '').toLowerCase();
    const isUnpaidType = leaveType.includes('unpaid') || leaveType.includes('lwp') || leaveType.includes('loss of pay');

    if (isUnpaidType || ((record?.status === 'Leave' || record?.is_leave) && !record?.is_paid_leave)) {
      return {
        color: "bg-orange-50 border-orange-200 text-orange-950",
        dotColor: "bg-orange-600",
        label: "LWP",
        type: "unpaidleave"
      };
    }

    // Paid Leave
    if (record?.is_paid_leave) {
      return {
        color: "bg-teal-50 border-teal-200 text-teal-900",
        dotColor: "bg-teal-600",
        label: "PL",
        type: "paidleave"
      };
    }

    // Missed Out (Check-in but no Check-out for past days, or explicit Missed Out status)
    const isPastDay = dateKey ? dateKey < todayKey : false;
    const isNoOut = record?.punch_in_time && !record?.punch_out_time && isPastDay;
    if (record?.status === "Missed Out" || record?.status === "Pending" || isNoOut) {
      return {
        color: "bg-red-50 border-red-200 text-red-700",
        dotColor: "bg-red-500",
        label: "MO",
        type: "missed_out"
      };
    }

    // If no attendance_id and not future, it's absent
    if (!(record?.attendance_id || record?.id) && !isFuture) {
      return {
        color: "bg-red-600 border-red-700 text-white",
        dotColor: "bg-red-200",
        label: "A",
        type: "absent"
      };
    }

    // Default to neutral
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
  const lateDeductionCount = stats.LateDeduction ?? stats.LateMarks ?? 0;
  const earlyPenaltyCount = stats.EarlyPenalty ?? 0;
  const lateDeductionDates = stats.LateDeductionDates || [];
  const earlyPenaltyDates = stats.EarlyPenaltyDates || [];
  
  const lateRemoved = stats.LateRemoved || 0;
  const earlyRemoved = stats.EarlyRemoved || 0;
  const latePenaltyRemoved = stats.LatePenaltyRemoved || 0;
  const earlyPenaltyRemoved = stats.EarlyPenaltyRemoved || 0;

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

          <div className="flex items-center gap-2">
            {isOrgAdmin && (
              <button
                onClick={() => setShowResetModal(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Month</span>
              </button>
            )}
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
              <span>OT - Overtime / Night OT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>🎁 - Comp-Off Generated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span>LD - Late Deduction</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span>ED - Early Deduction</span>
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
          <div className="flex-1 flex flex-col">
            <div className="max-w-6xl mx-auto w-full p-2 h-full flex flex-col">
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
                <div className="bg-white rounded-lg border border-slate-200 flex-1 flex flex-col overflow-hidden h-full">
                  {/* Weekday Header */}
                  <div className="grid grid-cols-7 gap-px bg-slate-200 border-b border-slate-200 shrink-0">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="bg-slate-50 py-1.5 sm:py-2 text-center">
                        <div className="text-[9px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider">{day}</div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="flex-1 grid grid-cols-7 gap-px bg-slate-200 min-h-0" style={{ gridAutoRows: 'minmax(0, 1fr)' }}>
                    {daysInMonth.map((date, index) => {
                      if (!date) {
                        return <div key={`empty-${index}`} className="bg-slate-50/30 w-full h-full" />;
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
                          className={`w-full h-full p-0.5 sm:p-1 flex flex-col items-center justify-start pt-1 transition-all relative group overflow-hidden ${statusInfo.color} ${isToday ? "ring-2 ring-inset ring-blue-500 z-10" : ""
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
                          {/* Badge icons from flags */}
                          <div className="flex items-center gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                            {/* Late Mark */}
                            {record?.is_late_mark_removed === 1 ? (
                              <span title="Late Mark (Removed)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50">Late (W)</span>
                            ) : (record?.is_late_mark === 1 && !record?.was_night_ot && !record?.is_holiday && !record?.is_weekly_off) ? (
                              <span title="Late Mark" className="px-1 py-0.2 rounded font-bold text-[7px] bg-orange-50 text-orange-700 border border-orange-200">Late</span>
                            ) : null}

                            {/* Late Penalty */}
                            {record?.is_late_penalty_removed === 1 ? (
                              <span title="Late Penalty (Waived)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50">L-Pen (W)</span>
                            ) : record?.is_latemark_penalty === 1 ? (
                              <span title="Late Penalty" className="px-1 py-0.2 rounded font-bold text-[7px] bg-orange-600 text-white">L-Pen</span>
                            ) : null}

                            {/* Early Mark */}
                            {record?.is_early_mark_removed === 1 ? (
                              <span title="Early Exit (Removed)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50">Early (W)</span>
                            ) : (record?.is_early_mark === 1 && !record?.was_night_ot && !record?.is_holiday && !record?.is_weekly_off) ? (
                              <span title="Early Exit" className="px-1 py-0.2 rounded font-bold text-[7px] bg-red-50 text-red-700 border border-red-200">Early</span>
                            ) : null}

                            {/* Early Penalty */}
                            {record?.is_early_penalty_removed === 1 ? (
                              <span title="Early Penalty (Waived)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50">E-Pen (W)</span>
                            ) : record?.is_early_penalty === 1 ? (
                              <span title="Early Penalty" className="px-1 py-0.2 rounded font-bold text-[7px] bg-red-600 text-white">E-Pen</span>
                            ) : null}

                            {/* Override */}
                            {record?.is_overridden === 1 && (
                              <span title="Overridden" className="px-1 py-0.2 rounded font-bold text-[7px] bg-blue-50 text-blue-700 border border-blue-200">OV</span>
                            )}

                            {/* Night OT Text Badge */}
                            {record?.was_night_ot && (
                              <span title="Night OT" className="px-1 py-0.2 rounded font-bold text-[7px] bg-indigo-600 text-white">Night OT</span>
                            )}
                          </div>

                          {record && (
                            <div className="flex flex-col items-center mt-auto w-full">
                              {/* Night OT Session Times */}
                              {record.was_night_ot && record.sessions?.filter((s: any) => s.session_type === 'night_ot').map((s: any, i: number) => (
                                <div key={i} className="text-[8px] text-indigo-600 font-bold leading-tight flex items-center gap-0.5">
                                  <span>{s.start_time ? new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '??'}</span>
                                  <span>-</span>
                                  <span>{s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '??'}</span>
                                </div>
                              ))}

                                {record.total_work_minutes > 0 && (
                                  <div className="text-[10px] opacity-70 font-semibold">
                                    {Math.floor(record.total_work_minutes / 60)}h{record.total_work_minutes % 60}m
                                  </div>
                                )}
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
                  <span className="text-sm text-slate-700">Total Late</span>
                </div>
                <span className="font-semibold text-orange-900">{summary?.TotalLateMinutes || 0} mins</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/50 border border-blue-200/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-slate-700">Total OT</span>
                </div>
                <span className="font-semibold text-blue-900">{summary?.TotalOTMinutes || 0} mins</span>
              </div>

              {lateDeductionCount > 0 && (
                <>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50 border border-orange-200/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="text-sm text-slate-700">Late Deduction</span>
                    </div>
                    <span className="font-semibold text-orange-900">{lateDeductionCount}</span>
                  </div>
                  {lateDeductionDates.length > 0 && (
                    <div className="pl-4 text-xs text-slate-600">
                      <div className="font-medium mb-1">Dates:</div>
                      <div className="flex flex-wrap gap-1">
                        {lateDeductionDates.map((date: string, idx: number) => (
                          <span key={idx} className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                            {new Date(date).getDate()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {earlyPenaltyCount > 0 && (
                <>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/50 border border-red-200/50 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-sm text-slate-700">Early Penalty</span>
                    </div>
                    <span className="font-semibold text-red-900">{earlyPenaltyCount}</span>
                  </div>
                  {earlyPenaltyDates.length > 0 && (
                    <div className="pl-4 text-xs text-slate-600">
                      <div className="font-medium mb-1">Dates:</div>
                      <div className="flex flex-wrap gap-1">
                        {earlyPenaltyDates.map((date: string, idx: number) => (
                          <span key={idx} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                            {new Date(date).getDate()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Removed Penalties Section */}
              {(lateRemoved > 0 || earlyRemoved > 0 || latePenaltyRemoved > 0 || earlyPenaltyRemoved > 0) && (
                <div className="pt-3 border-t border-slate-200 mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Adjustments</h4>
                  <div className="space-y-1.5">
                    {lateRemoved > 0 && (
                      <div className="flex items-center justify-between text-xs p-1.5 rounded bg-emerald-50 border border-emerald-100">
                        <span className="text-slate-600">Late Marks Removed</span>
                        <span className="font-bold text-emerald-700">{lateRemoved}</span>
                      </div>
                    )}
                    {earlyRemoved > 0 && (
                      <div className="flex items-center justify-between text-xs p-1.5 rounded bg-emerald-50 border border-emerald-100">
                        <span className="text-slate-600">Early Exits Removed</span>
                        <span className="font-bold text-emerald-700">{earlyRemoved}</span>
                      </div>
                    )}
                    {latePenaltyRemoved > 0 && (
                      <div className="flex items-center justify-between text-xs p-1.5 rounded bg-blue-50 border border-blue-100">
                        <span className="text-slate-600">Late Pen. Waived</span>
                        <span className="font-bold text-blue-700">{latePenaltyRemoved}</span>
                      </div>
                    )}
                    {earlyPenaltyRemoved > 0 && (
                      <div className="flex items-center justify-between text-xs p-1.5 rounded bg-blue-50 border border-blue-100">
                        <span className="text-slate-600">Early Pen. Waived</span>
                        <span className="font-bold text-blue-700">{earlyPenaltyRemoved}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>


          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <AttendanceDetailsModal
          record={{
            ...selectedRecord,
            employee_id: employeeId, // Add employee_id from props
          }}
          salaryDate={summary?.salary_date}
          isLocked={summary?.salary_date ? new Date() > new Date(summary.salary_date) : false}
          onUpdate={fetchMonthly}
          onClose={() => setSelectedRecord(null)}
        />
      )}
      {showResetModal && (
        <ResetAttendanceModal
          currentSiteId={null}
          siteOptions={[]}
          employee_id={employeeId}
          forcedMonth={`${year}-${String(mon).padStart(2, '0')}`}
          onClose={() => setShowResetModal(false)}
          onSuccess={() => {
            setShowResetModal(false);
            fetchMonthly();
          }}
        />
      )}
    </div>
  );
}

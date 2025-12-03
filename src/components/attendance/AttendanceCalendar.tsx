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
  AlertCircle
} from "lucide-react";

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
      setSummary(res?.summary || null);

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
        color: "bg-slate-50 border-slate-200 text-slate-400",
        label: "—",
        type: "future"
      };
    }

    // Holiday takes priority (but check for overtime work)
    if (record?.is_holiday) {
      // If there's an attendance record on a holiday, it's overtime work
      if (record?.attendance_id && record?.total_work_minutes > 0) {
        return {
          color: "bg-indigo-50 border-indigo-200 text-indigo-700",
          label: "Holiday OT",
          type: "overtime"
        };
      }
      return {
        color: "bg-purple-50 border-purple-200 text-purple-700",
        label: "Holiday",
        type: "holiday"
      };
    }

    // Week off (but check for overtime work)
    if (record?.is_weekly_off) {
      // If there's an attendance record on a week off, it's overtime work
      if (record?.attendance_id !== null) {
        return {
          color: "bg-indigo-50 border-indigo-200 text-indigo-700",
          label: "WO OT",
          type: "overtime"
        };
      }
      return {
        color: "bg-slate-100 border-slate-200 text-slate-600",
        label: "Week Off",
        type: "weekoff"
      };
    }

    // Only if status = "Completed" and status_timeline is Full-Day or Half-Day
    if (record?.status === "Completed") {
      if (record?.status_timeline === "Full-Day") {
        return {
          color: "bg-emerald-50 border-emerald-200 text-emerald-700",
          label: "Full Day",
          type: "fullday"
        };
      } else if (record?.status_timeline === "Half-Day") {
        return {
          color: "bg-amber-50 border-amber-200 text-amber-700",
          label: "Half Day",
          type: "halfday"
        };
      }
    }

    // If no attendance_id and not future, it's absent
    if (!record?.attendance_id && !isFuture) {
      return {
        color: "bg-rose-50 border-rose-200 text-rose-700",
        label: "Absent",
        type: "absent"
      };
    }

    // Default to neutral for edge cases
    return {
      color: "bg-slate-50 border-slate-200 text-slate-400",
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
    <div className="p-4 space-y-4">
      {/* Cycle Info */}
      {cycleInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-700">
          <span className="font-medium">Cycle:</span> {formatDate(cycleInfo.start)} - {formatDate(cycleInfo.end)}
        </div>
      )}

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-3 border border-emerald-200/50">
          <div className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Present</div>
          <div className="text-2xl font-bold text-emerald-900">{present}</div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-3 border border-rose-200/50">
          <div className="text-xs font-medium text-rose-600 uppercase tracking-wide">Absent</div>
          <div className="text-2xl font-bold text-rose-900">{absent}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-3 border border-blue-200/50">
          <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Full Day</div>
          <div className="text-2xl font-bold text-blue-900">{fullDay}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-3 border border-amber-200/50">
          <div className="text-xs font-medium text-amber-600 uppercase tracking-wide">Half Day</div>
          <div className="text-2xl font-bold text-amber-900">{halfDay}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-3 border border-purple-200/50">
          <div className="text-xs font-medium text-purple-600 uppercase tracking-wide">Leaves</div>
          <div className="text-2xl font-bold text-purple-900">{leaves}</div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-xl p-3 border border-indigo-200/50">
          <div className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Overtime</div>
          <div className="text-2xl font-bold text-indigo-900">{overtime}</div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-xl p-3 border border-violet-200/50">
          <div className="text-xs font-medium text-violet-600 uppercase tracking-wide">Holiday</div>
          <div className="text-2xl font-bold text-violet-900">{holiday}</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-700" />
            </button>

            <h2 className="text-lg font-bold text-slate-900 min-w-[180px] text-center">
              {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </h2>

            <button
              onClick={nextMonth}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="text-sm text-slate-600">
            {present}P • {halfDay}H • {absent}A
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 text-slate-500">Loading...</div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Weekday Header */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="text-center py-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase">{day}</div>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
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
                    className={`aspect-square rounded-lg border-2 p-2 flex flex-col transition-all hover:scale-105 cursor-pointer ${statusInfo.color} ${isToday ? "ring-2 ring-blue-500 ring-offset-1" : ""
                      }`}
                  >
                    <div className="text-sm font-bold mb-0.5">{date.getDate()}</div>
                    <div className="text-xs font-medium truncate">{statusInfo.label}</div>
                    {record && record.total_work_minutes > 0 && (
                      <div className="text-xs opacity-75 mt-auto">
                        {Math.floor(record.total_work_minutes / 60)}h
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {formatDate(selectedRecord.attendance_date)}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {getStatusInfo(selectedRecord).type === 'fullday' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {getStatusInfo(selectedRecord).type === 'halfday' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                  {getStatusInfo(selectedRecord).type === 'absent' && <XCircle className="w-4 h-4 text-rose-600" />}
                  <span className="text-sm font-medium">{getStatusInfo(selectedRecord).label}</span>

                  {/* Show Overtime badge if week off/holiday with completed work */}
                  {(selectedRecord.is_weekly_off || selectedRecord.is_holiday) &&
                    selectedRecord.status === "Completed" &&
                    selectedRecord.total_work_minutes > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 ml-2">
                        Overtime
                      </span>
                    )}
                </div>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Status Summary */}
              {selectedRecord.status_summary && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs font-medium text-slate-600 uppercase mb-1">Status</div>
                  <div className="text-sm text-slate-900">{selectedRecord.status_summary}</div>
                </div>
              )}

              {/* Time Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div className="text-xs font-medium text-blue-600 uppercase">Punch In</div>
                  </div>
                  <div className="text-lg font-bold text-blue-900">{formatTime(selectedRecord.punch_in_time)}</div>
                  {selectedRecord.punch_in_site_name && (
                    <div className="text-xs text-blue-700 mt-1">{selectedRecord.punch_in_site_name}</div>
                  )}
                </div>

                <div className="bg-purple-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <div className="text-xs font-medium text-purple-600 uppercase">Punch Out</div>
                  </div>
                  <div className="text-lg font-bold text-purple-900">{formatTime(selectedRecord.punch_out_time)}</div>
                  {selectedRecord.punch_out_site_name && (
                    <div className="text-xs text-purple-700 mt-1">{selectedRecord.punch_out_site_name}</div>
                  )}
                </div>
              </div>

              {/* Work Stats */}
              {selectedRecord.total_work_minutes > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-emerald-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-emerald-600 font-medium">Work</div>
                    <div className="text-sm font-bold text-emerald-900">
                      {Math.floor(selectedRecord.total_work_minutes / 60)}h {selectedRecord.total_work_minutes % 60}m
                    </div>
                  </div>
                  {selectedRecord.late_by_minutes > 0 && (
                    <div className="bg-amber-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-amber-600 font-medium">Late</div>
                      <div className="text-sm font-bold text-amber-900">{selectedRecord.late_by_minutes}m</div>
                    </div>
                  )}
                  {selectedRecord.extra_work_minutes > 0 && (
                    <div className="bg-indigo-50 rounded-lg p-2 text-center">
                      <div className="text-xs text-indigo-600 font-medium">Extra</div>
                      <div className="text-sm font-bold text-indigo-900">{selectedRecord.extra_work_minutes}m</div>
                    </div>
                  )}
                </div>
              )}

              {/* Images */}
              {(selectedRecord.punch_in_image || selectedRecord.punch_out_image) && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-slate-700">Attendance Photos</div>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedRecord.punch_in_image && (
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Punch In</div>
                        <img
                          src={selectedRecord.punch_in_image}
                          alt="Punch In"
                          className="w-full h-32 object-contain rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                    {selectedRecord.punch_out_image && (
                      <div>
                        <div className="text-xs text-slate-600 mb-1">Punch Out</div>
                        <img
                          src={selectedRecord.punch_out_image}
                          alt="Punch Out"
                          className="w-full h-32 object-contain rounded-lg border border-slate-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location Maps */}
              {((selectedRecord.punch_in_lat && selectedRecord.punch_in_lng) ||
                (selectedRecord.punch_out_lat && selectedRecord.punch_out_lng)) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <div className="text-sm font-semibold text-slate-700">Locations</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Punch In Location */}
                      {selectedRecord.punch_in_lat && selectedRecord.punch_in_lng && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-blue-600 uppercase">Punch In Location</div>
                          <div className="rounded-lg overflow-hidden border border-slate-200">
                            <iframe
                              width="100%"
                              height="200"
                              frameBorder="0"
                              src={`https://www.google.com/maps?q=${selectedRecord.punch_in_lat},${selectedRecord.punch_in_lng}&output=embed`}
                              allowFullScreen
                            />
                          </div>
                          <div className="text-xs text-slate-600">
                            {selectedRecord.punch_in_lat}, {selectedRecord.punch_in_lng}
                          </div>
                        </div>
                      )}

                      {/* Punch Out Location */}
                      {selectedRecord.punch_out_lat && selectedRecord.punch_out_lng && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-purple-600 uppercase">Punch Out Location</div>
                          <div className="rounded-lg overflow-hidden border border-slate-200">
                            <iframe
                              width="100%"
                              height="200"
                              frameBorder="0"
                              src={`https://www.google.com/maps?q=${selectedRecord.punch_out_lat},${selectedRecord.punch_out_lng}&output=embed`}
                              allowFullScreen
                            />
                          </div>
                          <div className="text-xs text-slate-600">
                            {selectedRecord.punch_out_lat}, {selectedRecord.punch_out_lng}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* Remarks */}
              {selectedRecord.remarks && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="text-xs font-medium text-amber-600 uppercase mb-1">Remarks</div>
                  <div className="text-sm text-amber-900">{selectedRecord.remarks}</div>
                </div>
              )}

              {/* Regularization */}
              {selectedRecord.is_regularized && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="text-xs font-medium text-blue-600 uppercase mb-1">Regularization</div>
                  <div className="text-sm text-blue-900">
                    Status: <span className="font-semibold">{selectedRecord.regularization_status || 'Pending'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
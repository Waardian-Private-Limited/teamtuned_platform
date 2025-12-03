"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  DollarSign,
  RefreshCw,
  MapPin,
  Image as ImageIcon,
  X,
  ArrowRight
} from "lucide-react";

type AttendanceRecord = Record<string, any>;
type SalaryItem = { name: string; type: "credit" | "debit"; amount: number; is_taxable?: boolean };

export default function PayrollCycleCalendar({ employeeId }: { employeeId?: number }) {
  const [now, setNow] = React.useState<Date>(new Date());
  const [items, setItems] = React.useState<AttendanceRecord[]>([]);
  const [breakdown, setBreakdown] = React.useState<SalaryItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [payrollData, setPayrollData] = React.useState<any>(null);
  const [detailOpen, setDetailOpen] = React.useState<boolean>(false);
  const [detailRecord, setDetailRecord] = React.useState<AttendanceRecord | null>(null);

  // Override states
  const [overrideStatus, setOverrideStatus] = React.useState<string>('Completed');
  const [overrideTimeline, setOverrideTimeline] = React.useState<string>('Full-Day');
  const [overrideSaving, setOverrideSaving] = React.useState<boolean>(false);
  const [overrideError, setOverrideError] = React.useState<string | null>(null);
  const [overrideOpen, setOverrideOpen] = React.useState<boolean>(false);

  const [policyData, setPolicyData] = React.useState<any>(null);

  const computeCycle = React.useCallback((ref: Date, startDay: number, endDay: number) => {
    // 🎯 KEY INSIGHT: Show the cycle that ENDS in the current month
    // This is the cycle that will be paid on the next salary date

    let cycleYear = ref.getFullYear();
    let cycleMonth = ref.getMonth() + 1; // 1-based month

    if (startDay === endDay || startDay > endDay) {
      // Cross-month cycle (e.g., 20-20 means Oct 20 to Nov 20)
      // The cycle ENDS on the 20th of the current month
      // So we want the cycle that STARTED in the previous month
      cycleMonth -= 1;
      if (cycleMonth < 1) {
        cycleMonth = 12;
        cycleYear -= 1;
      }
    } else {
      // Same-month cycle (e.g., 1-31 means Nov 1 to Nov 30)
      // The cycle STARTS and ENDS in the current month
      // cycleMonth stays the same
    }

    // Calculate start and end dates
    let start: Date, end: Date;

    const clamp = (y: number, m: number, d: number) => {
      const lastDay = new Date(y, m, 0).getDate();
      return Math.min(d, lastDay);
    };

    if (startDay === endDay) {
      // Monthly recurring (e.g., 20-20)
      start = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, startDay));
      const nextMonth = cycleMonth === 12 ? 1 : cycleMonth + 1;
      const nextYear = cycleMonth === 12 ? cycleYear + 1 : cycleYear;
      // 🎯 End date is EXCLUSIVE (one day before) to avoid double-counting
      const endDayExclusive = clamp(nextYear, nextMonth, endDay);
      const endDate = new Date(nextYear, nextMonth - 1, endDayExclusive);
      endDate.setDate(endDate.getDate() - 1); // Make it exclusive by going back 1 day
      end = endDate;
    } else if (startDay > endDay) {
      // Cross-month (e.g., 25-10)
      start = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, startDay));
      const nextMonth = cycleMonth === 12 ? 1 : cycleMonth + 1;
      const nextYear = cycleMonth === 12 ? cycleYear + 1 : cycleYear;
      // 🎯 End date is INCLUSIVE for cross-month cycles with different days
      end = new Date(nextYear, nextMonth - 1, clamp(nextYear, nextMonth, endDay));
    } else {
      // Same month (e.g., 1-31)
      start = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, startDay));
      // 🎯 End date is INCLUSIVE for same-month cycles
      end = new Date(cycleYear, cycleMonth - 1, clamp(cycleYear, cycleMonth, endDay));
    }

    return { start, end };
  }, []);

  // Get policy data to determine cycle
  const startDay = policyData?.payment_cycle_start || 20;
  const endDay = policyData?.payment_cycle_end || 20;

  const { start, end } = computeCycle(now, startDay, endDay);

  // Stable cycle keys
  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parseKey = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };
  const startKey = dateKey(start);
  const endKey = dateKey(end);
  const [cycleStartKey, setCycleStartKey] = React.useState<string>(startKey);
  const [cycleEndKey, setCycleEndKey] = React.useState<string>(endKey);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let empId = employeeId;
      if (!empId) {
        const session = await apiClient<any>("/auth/session", { method: "GET", withAuth: true });
        empId = Number(session?.employee?.id || session?.employee_id || session?.id || 0) || 0;
      }
      if (!empId) throw new Error("Missing employee id");

      const payrollRes = await apiClient<any>("/attendance/payroll-cycle", {
        method: "GET",
        withAuth: true,
        params: {
          employee_id: String(empId),
          ref_month: String(endKey.slice(5, 7)),
          ref_year: String(endKey.slice(0, 4))
        }
      });

      // Store policy data for cycle calculation
      setPolicyData({
        payment_cycle_start: payrollRes?.payment_cycle_start,
        payment_cycle_end: payrollRes?.payment_cycle_end,
        salary_date_day: payrollRes?.salary_date_day
      });

      const srvStart = String(payrollRes?.cycle_start || '').slice(0, 10);
      const srvEnd = String(payrollRes?.cycle_end || '').slice(0, 10);
      if (srvStart && srvEnd) {
        setCycleStartKey(srvStart);
        setCycleEndKey(srvEnd);
      }

      // Fetch attendance for months covering the cycle
      const monthsList: Array<{ year: number; month: number }> = [];
      const [sy, sm] = (srvStart || cycleStartKey).split('-').map(Number);
      const [ey, em] = (srvEnd || cycleEndKey).split('-').map(Number);
      let y = sy, m = sm;
      while (y < ey || (y === ey && m <= em)) {
        monthsList.push({ year: y, month: m });
        m++;
        if (m === 13) { m = 1; y++; }
      }

      const attendanceResults = await Promise.all(
        monthsList.map(({ year, month }) =>
          apiClient<any>("/attendance/monthly", {
            method: "GET",
            withAuth: true,
            params: { employee_id: String(empId), month: String(month), year: String(year) }
          })
        )
      );

      const allRecords = attendanceResults.flatMap(res =>
        Array.isArray(res?.records) ? res.records :
          Array.isArray(res?.items) ? res.items :
            Array.isArray(res?.data) ? res.data : []
      );

      setPayrollData(payrollRes);
      setItems(allRecords);
      setBreakdown(Array.isArray(payrollRes?.salary_breakdown) ? payrollRes.salary_breakdown : []);

    } catch (e: any) {
      setError(e?.message || "Failed to load payroll data");
    } finally {
      setLoading(false);
    }
  }, [employeeId, startKey, endKey]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const attMap = React.useMemo(() => {
    const m = new Map<string, AttendanceRecord>();
    items.forEach((r) => {
      const k = String(r?.attendance_date || "").slice(0, 10);
      if (k) m.set(k, r);
    });
    return m;
  }, [items]);

  const getStatusConfig = (record?: AttendanceRecord | null) => {
    if (!record) return { color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-100", label: "—" };

    if (record.is_holiday) return { color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", label: "Holiday" };
    if (record.is_weekly_off) return { color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", label: "Week Off" };

    const statusRaw = String(record.status || "").trim();
    const tl = String(record.status_timeline || record.status_summary || "").toLowerCase();

    if (statusRaw === "Completed") {
      if (tl.includes("half")) return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", label: "Half Day" };
      return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", label: "Present" };
    }

    return { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", label: "Absent" };
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return timeString; }
  };

  const metrics = payrollData?.metrics || {};
  const salary = payrollData?.salary || { credit_total: 0, debit_total: 0, per_day: 0, gross: 0, net: 0 };
  const summary = payrollData?.summary || {};

  const shiftCycle = (dir: -1 | 1) => {
    const d = new Date(now.getFullYear(), now.getMonth() + dir, now.getDate());
    setNow(d);
  };

  // Generate calendar days
  const cycleMonths = React.useMemo(() => {
    const months: Date[] = [];
    const [sy, sm] = cycleStartKey.split('-').map(Number);
    const [ey, em] = cycleEndKey.split('-').map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      months.push(new Date(y, m - 1, 1));
      m++;
      if (m === 13) { m = 1; y++; }
    }
    return months;
  }, [cycleStartKey, cycleEndKey]);

  const generateMonthCalendar = (monthDate: Date) => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const totalDays = last.getDate();
    const startWeekday = first.getDay();
    const cells: Array<Date | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const isInCycle = (date: Date) => {
    const dateStr = dateKey(date);
    // 🎯 INCLUSIVE comparison: both start and end dates are included in the cycle
    // The backend already handles exclusivity by subtracting 1 day for same start/end cycles
    return dateStr >= cycleStartKey && dateStr <= cycleEndKey;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button onClick={() => shiftCycle(-1)} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-sm font-medium text-slate-700 min-w-[140px] text-center">
              {parseKey(cycleStartKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {parseKey(cycleEndKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={() => shiftCycle(1)} className="p-1.5 hover:bg-slate-50 rounded-md text-slate-500 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={fetchData} disabled={loading} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-medium text-slate-600">Present: <span className="text-slate-900">{metrics.present_days || 0}</span></span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <span className="text-xs font-medium text-slate-600">Absent: <span className="text-slate-900">{metrics.absent_days || 0}</span></span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <span className="text-xs font-medium text-slate-600">Half Day: <span className="text-slate-900">{metrics.half_days || 0}</span></span>
          </div>
          <div className="px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-xs font-medium text-slate-600">Holiday: <span className="text-slate-900">{metrics.total_holidays || 0}</span></span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2 space-y-6">
          {cycleMonths.map((monthDate, idx) => {
            const calendarDays = generateMonthCalendar(monthDate);
            return (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800">{monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-7 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-center text-xs font-medium text-slate-400 py-2">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((date, i) => {
                      if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
                      const k = dateKey(date);
                      const rec = attMap.get(k);
                      const config = getStatusConfig(rec);
                      const inCycle = isInCycle(date);
                      const isToday = k === dateKey(new Date());

                      return (
                        <button
                          key={k}
                          onClick={() => { setDetailRecord(rec ?? { attendance_date: k }); setDetailOpen(true); }}
                          className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all relative group
                            ${inCycle ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md' : 'bg-slate-50 border-transparent opacity-50'}
                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                          `}
                        >
                          <span className={`text-sm font-medium ${inCycle ? 'text-slate-700' : 'text-slate-400'}`}>{date.getDate()}</span>
                          {inCycle && (
                            <div className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color} truncate max-w-full`}>
                              {config.label}
                            </div>
                          )}
                          {/* Cycle Markers */}
                          {k === cycleStartKey && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                          {k === cycleEndKey && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Salary Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Salary Breakdown</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {/* Credits */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Earnings</h4>
                {breakdown.filter(i => i.type === 'credit').map((item, i) => (
                  <div key={`c-${i}`} className="flex items-center justify-between text-sm group">
                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{item.name}</span>
                    <span className="font-medium text-emerald-600">+₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-700">Total Earnings</span>
                  <span className="text-emerald-700">₹{salary.credit_total.toLocaleString()}</span>
                </div>
              </div>

              {/* Debits */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Deductions</h4>
                {breakdown.filter(i => i.type === 'debit').map((item, i) => (
                  <div key={`d-${i}`} className="flex items-center justify-between text-sm group">
                    <span className="text-slate-600 group-hover:text-slate-900 transition-colors">{item.name}</span>
                    <span className="font-medium text-rose-600">-₹{item.amount.toLocaleString()}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-700">Total Deductions</span>
                  <span className="text-rose-700">₹{salary.debit_total.toLocaleString()}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Calculation Details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-800">Calculation</h3>
              </div>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Total Days</span>
                <span className="font-medium text-slate-900">{metrics.total_days}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Present Days</span>
                <span className="font-medium text-slate-900">{metrics.present_days}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Paid Leaves (Full)</span>
                <span className="font-medium text-slate-900">{metrics.total_paid_leaves_full || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Paid Leaves (Half)</span>
                <span className="font-medium text-slate-900">{metrics.total_paid_leaves_half || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">LOP Days (Absent + Half×0.5)</span>
                <span className="font-medium text-slate-900">{((metrics.absent_days || 0) + (metrics.half_days || 0) * 0.5).toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Pay Days</span>
                <span className="font-medium text-slate-900">{metrics.pay_days}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Daily Rate (Gross)</span>
                <span className="font-medium text-slate-900">₹{salary.per_day_gross?.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-slate-500">Earned Gross (Rate × Pay Days)</span>
                <span className="font-medium text-slate-900">₹{salary.earned_gross?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-rose-600">
                <span>Deductions</span>
                <span>-₹{salary.debit_total?.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center font-semibold">
                <span className="text-slate-900">Net Pay</span>
                <span className="text-emerald-600">₹{salary.net?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detailOpen && detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setDetailOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <CalendarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{new Date(detailRecord.attendance_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                  <p className="text-xs text-slate-500">Attendance Details</p>
                </div>
              </div>
              <button onClick={() => setDetailOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {/* Status Banner */}
              <div className={`mb-6 p-4 rounded-xl border ${getStatusConfig(detailRecord).bg} ${getStatusConfig(detailRecord).border} flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/50 ${getStatusConfig(detailRecord).color}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-semibold ${getStatusConfig(detailRecord).color}`}>{getStatusConfig(detailRecord).label}</div>
                    <div className="text-xs text-slate-600 opacity-80">{detailRecord.status_timeline || 'No timeline'}</div>
                  </div>
                </div>
                {/* Override Button */}
                <button
                  onClick={() => {
                    const s = String(detailRecord.status || '').trim();
                    setOverrideStatus(s === 'Completed' ? 'Completed' : (s.toLowerCase().includes('absent') ? 'Absent' : 'Present'));
                    const tl = String(detailRecord.status_timeline || detailRecord.status_summary || 'Full-Day').toLowerCase();
                    setOverrideTimeline(tl.includes('half') ? 'Half-Day' : 'Full-Day');
                    setOverrideOpen(true);
                  }}
                  className="px-3 py-1.5 bg-white shadow-sm border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-colors"
                >
                  Override
                </button>
              </div>

              {/* Override Form */}
              {overrideOpen && (
                <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Override Attendance</h4>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                      <select value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                        <option value="Completed">Completed</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Timeline</label>
                      <select value={overrideTimeline} onChange={(e) => setOverrideTimeline(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" disabled={overrideStatus !== 'Completed'}>
                        <option value="Full-Day">Full-Day</option>
                        <option value="Half-Day">Half-Day</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setOverrideOpen(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                    <button
                      disabled={overrideSaving}
                      onClick={async () => {
                        setOverrideSaving(true);
                        setOverrideError(null);
                        try {
                          const mapStatus = overrideStatus === 'Completed' ? 'Completed' : 'Absent';
                          const tl = overrideStatus === 'Completed' ? overrideTimeline : 'Full-Day';
                          const dateStr = String(detailRecord.attendance_date || '').slice(0, 10);
                          let body: any = { status: mapStatus, status_timeline: tl, status_summary: tl, remarks: 'Payroll override' };

                          if (detailRecord.attendance_id) body.attendance_id = detailRecord.attendance_id;
                          else {
                            let empId = Number(detailRecord.employee_id || employeeId || 0);
                            if (!empId) {
                              const session = await apiClient<any>('/auth/session', { method: 'GET', withAuth: true });
                              empId = Number(session?.employee?.id || session?.employee_id || session?.id || 0) || 0;
                            }
                            body.employee_id = empId;
                            body.attendance_date = dateStr;
                          }

                          await apiClient('/attendance/override', { method: 'POST', withAuth: true, body });

                          // Optimistic update
                          setItems(prev => {
                            const next = [...prev];
                            const idx = next.findIndex(r => String(r.attendance_date || '').slice(0, 10) === dateStr);
                            const updated = { ...(idx >= 0 ? next[idx] : {}), attendance_id: (idx >= 0 ? next[idx].attendance_id : detailRecord.attendance_id) || null, attendance_date: dateStr, status: mapStatus, status_timeline: tl, status_summary: tl };
                            if (idx >= 0) next[idx] = updated; else next.push(updated);
                            return next;
                          });
                          setDetailRecord(prev => prev ? { ...prev, status: mapStatus, status_timeline: tl, status_summary: tl } : prev);
                          setOverrideOpen(false);
                        } catch (e: any) {
                          setOverrideError(e.message || 'Failed to override');
                        } finally {
                          setOverrideSaving(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {overrideSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                  {overrideError && <p className="mt-2 text-xs text-rose-600">{overrideError}</p>}
                </div>
              )}

              {/* Timings */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    <Clock className="w-3 h-3" /> Check In
                  </div>
                  <div className="text-lg font-semibold text-slate-900">{formatTime(detailRecord.punch_in_time)}</div>
                  {detailRecord.punch_in_site_name && <div className="text-xs text-slate-500 mt-1 truncate">{detailRecord.punch_in_site_name}</div>}
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 text-slate-500 text-xs font-medium uppercase tracking-wider">
                    <Clock className="w-3 h-3" /> Check Out
                  </div>
                  <div className="text-lg font-semibold text-slate-900">{formatTime(detailRecord.punch_out_time)}</div>
                  {detailRecord.punch_out_site_name && <div className="text-xs text-slate-500 mt-1 truncate">{detailRecord.punch_out_site_name}</div>}
                </div>
              </div>

              {/* Locations */}
              {(detailRecord.punch_in_lat || detailRecord.punch_out_lat) && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {detailRecord.punch_in_lat && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-32 relative group">
                      <iframe className="w-full h-full" src={`https://maps.google.com/maps?q=${detailRecord.punch_in_lat},${detailRecord.punch_in_lng}&z=15&output=embed`} title="In Loc" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-medium text-slate-700 shadow-sm">In Location</div>
                    </div>
                  )}
                  {detailRecord.punch_out_lat && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 h-32 relative group">
                      <iframe className="w-full h-full" src={`https://maps.google.com/maps?q=${detailRecord.punch_out_lat},${detailRecord.punch_out_lng}&z=15&output=embed`} title="Out Loc" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                      <div className="absolute top-2 left-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-medium text-slate-700 shadow-sm">Out Location</div>
                    </div>
                  )}
                </div>
              )}

              {/* Images */}
              {(detailRecord.punch_in_image || detailRecord.punch_out_image) && (
                <div className="grid grid-cols-2 gap-4">
                  {detailRecord.punch_in_image && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 relative group">
                      <img src={detailRecord.punch_in_image} alt="In" className="w-full h-32 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/50 to-transparent text-white text-xs font-medium">Check In Photo</div>
                    </div>
                  )}
                  {detailRecord.punch_out_image && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 relative group">
                      <img src={detailRecord.punch_out_image} alt="Out" className="w-full h-32 object-cover" />
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/50 to-transparent text-white text-xs font-medium">Check Out Photo</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
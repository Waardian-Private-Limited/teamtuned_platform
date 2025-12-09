"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  DollarSign,
  RefreshCw,
  X,
  MapPin,
  Camera,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  XCircle,
  Briefcase,
  FileText,
  Award,
  Sun,
  Sunset,
  Coffee
} from "lucide-react";
import AttendanceDetailsModal from "../attendance/AttendanceDetailsModal";

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
      // End date is exclusive, so subtract 1 day
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

  const isHoliday = (dateStr: string) => {
    const holidays = payrollData?.holidays || [];
    return holidays.some((h: any) => String(h.holiday_date || '').slice(0, 10) === dateStr);
  };

  const isPaidLeave = (dateStr: string) => {
    const leaves = payrollData?.paid_leaves || [];
    return leaves.some((l: any) => {
      const start = String(l.start_date || '').slice(0, 10);
      const end = String(l.end_date || '').slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const getStatusConfig = (record?: AttendanceRecord | null, dateStr?: string) => {
    const statusRaw = String(record?.status || "").trim();

    if (record?.is_holiday) return { color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", label: "Holiday", icon: CalendarIcon };
    if (record?.is_weekly_off) return { color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", label: "Week Off", icon: CalendarIcon };

    if (record?.is_paid_leave) {
      const half = Number(record?.leave_partial || 0) === 0.5;
      return { color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200", label: half ? "Paid Leave (Half)" : "Paid Leave", icon: FileText };
    }

    if (!record) {
      if (dateStr && isHoliday(dateStr)) return { color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", label: "Holiday", icon: CalendarIcon };
      if (dateStr && isPaidLeave(dateStr)) return { color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200", label: "Paid Leave", icon: FileText };
      return { color: "text-slate-400", bg: "bg-slate-50", border: "border-slate-200", label: "—", icon: null };
    }

    const tl = String(record.status_timeline || record.status_summary || "").toLowerCase();

    if (statusRaw === "Completed") {
      if (tl.includes("half")) return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Half Day", icon: Clock };
      return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Present", icon: CheckCircle2 };
    }

    return { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", label: "Absent", icon: XCircle };
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '--:--';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return timeString; }
  };

  const metrics = payrollData?.metrics || {};
  const salary = payrollData?.salary || { credit_total: 0, debit_total: 0, per_day: 0, gross: 0, net: 0 };

  const shiftCycle = (dir: -1 | 1) => {
    const d = new Date(now.getFullYear(), now.getMonth() + dir, now.getDate());
    setNow(d);
  };

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
    return dateStr >= cycleStartKey && dateStr <= cycleEndKey;
  };

  return (
    <div className="min-h-screen bg-white p-2 sm:p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Navigation */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Payroll Cycle</h1>
                <p className="text-xs text-slate-500">Attendance & Salary</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200">
                  <button
                    onClick={() => shiftCycle(-1)}
                    className="p-1.5 hover:bg-white rounded-l-lg text-slate-600 hover:text-slate-900 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3 py-1.5 border-x border-slate-200">
                    <div className="text-sm font-medium text-slate-900">
                      {parseKey(cycleStartKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {parseKey(cycleEndKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <button
                    onClick={() => shiftCycle(1)}
                    className="p-1.5 hover:bg-white rounded-r-lg text-slate-600 hover:text-slate-900 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
            <MetricCard label="Total Days" value={metrics.total_days || 0} color="blue" icon={CalendarIcon} />
            <MetricCard label="Working Days" value={metrics.scheduled_working_days || 0} color="indigo" icon={Users} />
            <MetricCard label="Present" value={metrics.present_days || 0} color="emerald" icon={CheckCircle2} />
            <MetricCard label="Absent" value={metrics.absent_days || 0} color="rose" icon={XCircle} />
            <MetricCard label="Late Deduction" value={metrics.late_days || 0} color="orange" icon={Clock} />
            <MetricCard label="Paid Leaves" value={metrics.total_paid_leave_days || 0} color="teal" icon={CheckCircle2} />
            <MetricCard label="Comp Off" value={metrics.comp_off_days || 0} color="cyan" icon={CheckCircle2} />
            <MetricCard label="Full Day" value={metrics.full_days || 0} color="green" icon={CheckCircle2} />
            <MetricCard label="Half Day" value={metrics.half_days || 0} color="amber" icon={Clock} />
            <MetricCard label="Week Off" value={metrics.total_week_offs || 0} color="slate" icon={CalendarIcon} />
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Calendar Section */}
          <div className="xl:col-span-2 space-y-4">
            {cycleMonths.map((monthDate, idx) => {
              const calendarDays = generateMonthCalendar(monthDate);
              return (
                <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                  </div>
                  <div className="p-3">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarDays.map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
                        const dKey = dateKey(date);
                        const record = attMap.get(dKey);
                        const config = getStatusConfig(record, dKey);
                        const inCycle = isInCycle(date);
                        const isToday = dKey === dateKey(new Date());

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              setDetailRecord({ ...record, attendance_date: dKey } as any);
                              setDetailOpen(true);
                            }}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center relative border transition-all ${!inCycle ? 'opacity-40 grayscale' : 'hover:scale-105 hover:shadow-md z-0 hover:z-10'
                              } ${config.bg} ${config.border} ${config.color} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                          >
                            <span className={`text-xs font-medium ${inCycle ? 'text-slate-700' : 'text-slate-400'}`}>
                              {date.getDate()}
                            </span>
                            {inCycle && record && (
                              <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${config.bg} ${config.color} border ${config.border}`}>
                                {config.label === 'Present' ? 'P' :
                                  config.label === 'Absent' ? 'A' :
                                    config.label === 'Holiday' ? 'H' :
                                      config.label === 'Week Off' ? 'WO' :
                                        config.label.includes('Paid Leave') ? 'PL' :
                                          config.label.includes('Half') ? 'HD' :
                                            config.label.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Salary Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Breakdown</h3>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto text-sm">
                {/* Earnings */}
                <div className="space-y-1">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Earnings</h4>
                  {breakdown.filter(i => i.type === 'credit').map((item, i) => (
                    <div key={`c-${i}`} className="flex items-center justify-between py-1">
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-medium text-emerald-600">+₹{item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
                    <span className="text-slate-900">Total Earnings</span>
                    <span className="text-emerald-700">₹{salary.credit_total?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Deductions */}
                {breakdown.filter(i => i.type === 'debit').length > 0 && (
                  <div className="space-y-1 pt-2">
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Deductions</h4>
                    {breakdown.filter(i => i.type === 'debit').map((item, i) => (
                      <div key={`d-${i}`} className="flex items-center justify-between py-1">
                        <span className="text-slate-600">{item.name}</span>
                        <span className="font-medium text-rose-600">-₹{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
                      <span className="text-slate-900">Total Deductions</span>
                      <span className="text-rose-700">₹{salary.debit_total?.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Calculation Details */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Calculation</h3>
                </div>
              </div>
              <div className="p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Working Days</span>
                    <span className="font-medium text-slate-900">{metrics.working_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Scheduled Working</span>
                    <span className="font-medium text-slate-900">{metrics.scheduled_working_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Present</span>
                    <span className="font-medium text-emerald-700">{metrics.present_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Absent</span>
                    <span className="font-medium text-rose-700">{metrics.absent_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Paid Leaves</span>
                    <span className="font-medium text-teal-700">{metrics.total_paid_leave_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Holidays</span>
                    <span className="font-medium text-violet-700">{metrics.total_holidays?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Week Offs</span>
                    <span className="font-medium text-slate-700">{metrics.total_week_offs?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Late Deduction Days</span>
                    <span className="font-medium text-orange-700">{metrics.late_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Comp Off</span>
                    <span className="font-medium text-cyan-700">{metrics.comp_off_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Full Day</span>
                    <span className="font-medium text-slate-900">{metrics.full_days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Half Day</span>
                    <span className="font-medium text-amber-700">{metrics.half_days?.toLocaleString() || 0}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100" />

                <div className="space-y-1">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Gross Salary</span>
                    <span className="font-medium text-slate-900">₹{salary.gross_salary?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Adjusted Gross</span>
                    <span className="font-medium text-blue-700">₹{salary.adjusted_gross?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Credits</span>
                    <span className="font-medium text-emerald-700">₹{salary.credit_total?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Debits</span>
                    <span className="font-medium text-rose-700">₹{salary.debit_total?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Salary Advance EMI</span>
                    <span className="font-medium text-slate-900">₹{salary.salary_advance_emi?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Total Deductions</span>
                    <span className="font-medium text-rose-700">₹{salary.total_deductions?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Net Payment</span>
                    <span className="font-semibold text-blue-700">₹{salary.net_payment?.toLocaleString() || salary.net?.toLocaleString() || '0'}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">Bank Payment</span>
                    <span className="font-semibold text-blue-700">₹{salary.bank_payment?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Detail Modal */}
      {detailOpen && detailRecord && (
        <AttendanceDetailsModal
          record={detailRecord}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: any }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    green: "bg-green-50 text-green-700 border-green-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  const c = colorMap[color] || colorMap.slate;

  return (
    <div className={`p-3 rounded-xl border ${c} flex flex-col justify-between h-20`}>
      <div className="flex items-center gap-2 opacity-80">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

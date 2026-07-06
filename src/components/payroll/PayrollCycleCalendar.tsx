"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
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
  Coffee,
  Calculator,
  Info,
  User,
  AlertTriangle,
  MoreVertical,
  Download,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Save
} from "lucide-react";
import SalarySlipEditorModal from "./SalarySlipEditorModal";
import AdjustPayrollModal from "./AdjustPayrollModal";
import AttendanceDetailsModal from "../attendance/AttendanceDetailsModal";

import { useAuth } from "@/context/AuthContext";
type AttendanceRecord = Record<string, any>;
type SalaryItem = {
  name: string;
  type: "credit" | "debit";
  amount: number;
  is_taxable?: boolean;
  breakdown?: {
    debit_type: string;
    reference_type: string;
    steps: Array<{
      step: string;
      value: number;
      formula: string;
    }>;
  };
};

export default function PayrollCycleCalendar({ employeeId }: { employeeId?: number }) {
  const { role, permissions, user, employee } = useAuth();
  const [now, setNow] = React.useState<Date>(new Date());
  const [items, setItems] = React.useState<AttendanceRecord[]>([]);
  const [overviewOpen, setOverviewOpen] = React.useState(true);
  const [breakdownOpen, setBreakdownOpen] = React.useState(true);
  const [calcOpen, setCalcOpen] = React.useState(true);
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

  const [actionMenuOpen, setActionMenuOpen] = React.useState<boolean>(false);
  const [actionMenuPos, setActionMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  const actionButtonRef = React.useRef<HTMLButtonElement>(null);

  const closeActionMenu = () => {
    setActionMenuOpen(false);
    setActionMenuPos(null);
  };

  const [policyData, setPolicyData] = React.useState<any>(null);
  const [adjustModalOpen, setAdjustModalOpen] = React.useState<boolean>(false);

  // Custom calculator states
  const [customCalcOpen, setCustomCalcOpen] = React.useState<boolean>(false);
  const [customMetrics, setCustomMetrics] = React.useState({
    total_days: 0,
    present_days: 0,
    absent_days: 0,
    half_days: 0,
    full_days: 0,
    late_days: 0,
    paid_leave_days: 0,
    week_offs: 0,
    holidays: 0,
    comp_off_days: 0,
    sandwich_loss_days: 0
  });

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
        // Session fetch removed (using useAuth)
        empId = employee?.id || 0;
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

  // Initialize custom metrics from actual data
  React.useEffect(() => {
    if (payrollData?.metrics) {
      setCustomMetrics({
        total_days: payrollData.metrics.total_days || 0,
        present_days: payrollData.metrics.present_days || 0,
        absent_days: payrollData.metrics.absent_days || 0,
        half_days: payrollData.metrics.half_days || 0,
        full_days: payrollData.metrics.full_days || 0,
        late_days: payrollData.metrics.late_days || 0,
        paid_leave_days: payrollData.metrics.total_paid_leave_days || 0,
        week_offs: payrollData.metrics.total_week_offs || 0,
        holidays: payrollData.metrics.total_holidays || 0,
        comp_off_days: payrollData.metrics.comp_off_days || 0,
        sandwich_loss_days: payrollData.metrics.sandwich_loss_days || 0
      });
    }
  }, [payrollData]);

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

  const isUnpaidLeave = (dateStr: string) => {
    const leaves = payrollData?.unpaid_leaves || [];
    return leaves.some((l: any) => {
      const start = String(l.start_date || '').slice(0, 10);
      const end = String(l.end_date || '').slice(0, 10);
      return dateStr >= start && dateStr <= end;
    });
  };

  const [showSlipEditor, setShowSlipEditor] = React.useState(false);
  const [editorData, setEditorData] = React.useState<any>(null);
  const [isFetchingForEditor, setIsFetchingForEditor] = React.useState(false);

  const handleDownloadSlip = async () => {
    const empId = employeeId || employee?.id;
    if (!empId) return;

    // Fetch data for editor
    try {
      console.log("Fetching payroll data for editor...", { empId, cycleStartKey, cycleEndKey });
      setIsFetchingForEditor(true);

      const response = await apiClient<any>('/attendance/payroll-cycle', {
        method: 'GET',
        withAuth: true,
        params: {
          employee_id: String(empId),
          cycle_start: cycleStartKey,
          cycle_end: cycleEndKey
        }
      });

      console.log("Payroll data response:", response);

      if (response) {
        setEditorData(response);
        setShowSlipEditor(true);
        console.log("Opening editor modal...");
      } else {
        alert("Received empty data from server");
      }
    } catch (err: any) {
      console.error("Error fetching payroll for editor", err);
      alert(err?.message || "Could not load payroll data for editing.");
    } finally {
      setIsFetchingForEditor(false);
    }
  };

  const [isLocking, setIsLocking] = React.useState(false);
  const handleLockUnlock = async (id: number, action: 'lock' | 'unlock') => {
    try {
      setIsLocking(true);
      const payload = {
        employee_ids: [id],
        month: endKey.split('-')[1],
        year: endKey.split('-')[0]
      };
      const endpoint = action === 'lock' ? "/attendance/payroll-lock" : "/attendance/payroll-unlock";
      await apiClient(endpoint, { method: "POST", body: payload, withAuth: true });
      // Use window.alert or toast if available. PayrollCycleCalendar doesn't seem to have toast imported.
      // Wait, let me check imports.
      alert(`Payroll ${action === 'lock' ? 'locked' : 'unlocked'} successfully`);
      fetchData();
    } catch (err: any) {
      alert(err.message || `Failed to ${action} payroll`);
    } finally {
      setIsLocking(false);
    }
  };

  const getStatusConfig = (record?: AttendanceRecord | null, dateStr?: string) => {
    const statusRaw = String(record?.status || "").trim();

    // Check Sandwich LOP first (Overwrites Week Off visual)
    const sandwichDates = payrollData?.sandwich_dates || [];
    if (dateStr && sandwichDates.includes(dateStr)) {
      return { color: "text-rose-955", bg: "bg-rose-50", border: "border-rose-200", label: "LOP (Sandwich)", icon: AlertTriangle };
    }

    // Check No Out (Check-in but no Check-out for past days)
    const isPastDay = dateStr ? new Date(dateStr).getTime() < new Date().setHours(0, 0, 0, 0) : false;
    const isNoOut = record?.punch_in_time && !record?.punch_out_time && isPastDay;
    
    const isMissedOut = statusRaw === "Missed Out" || statusRaw === "Pending" || isNoOut;
    if (isMissedOut) {
      return {
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        label: "Missed Out",
        icon: AlertTriangle
      };
    }

    if (record?.is_holiday) {
      if ((record?.attendance_id || record?.id) && record?.total_work_minutes > 0) {
        return { color: "text-blue-950", bg: "bg-blue-50", border: "border-blue-200", label: "Overtime", icon: Clock };
      }
      return { color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", label: "Holiday", icon: CalendarIcon };
    }

    if (record?.is_weekly_off) {
      if (record?.attendance_id || record?.id) {
        return { color: "text-blue-950", bg: "bg-blue-50", border: "border-blue-200", label: "Overtime", icon: Clock };
      }
      return { color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", label: "Week Off", icon: CalendarIcon };
    }

    // Only if status = "Completed" or "Present"
    const tl = String(record?.status_timeline || record?.status_summary || "").toLowerCase();
    const isPL = record?.is_paid_leave || (dateStr && isPaidLeave(dateStr));
    const plHalf = Number(record?.leave_partial || 0) === 0.5 || (record?.is_paid_leave && tl.includes('half'));

    if (statusRaw === "Completed" || statusRaw === "Present") {
      if (tl.includes("half")) {
        return {
          color: isPL ? "text-teal-900" : "text-amber-950",
          bg: isPL ? "bg-teal-50" : "bg-amber-50",
          border: isPL ? "border-teal-200" : "border-amber-200",
          label: isPL ? "Half Day + PL" : "Half Day",
          icon: isPL ? FileText : Clock
        };
      }
      return {
        color: isPL ? "text-teal-900" : "text-emerald-950",
        bg: isPL ? "bg-teal-50" : "bg-emerald-50",
        border: isPL ? "border-teal-200" : "border-emerald-200",
        label: isPL ? "Present + PL" : "Present",
        icon: isPL ? FileText : CheckCircle2
      };
    }

    // Unpaid Leave
    const leaveType = (record?.leave_type || '').toLowerCase();
    const isUnpaidType = leaveType.includes('unpaid') || leaveType.includes('lwp') || leaveType.includes('loss of pay');

    if (isUnpaidType || (record?.status === 'Leave' || record?.is_leave || statusRaw === 'Leave')) {
      if (isUnpaidType || (!record?.is_paid_leave && (record?.status === 'Leave' || record?.is_leave))) {
        return { color: "text-orange-950", bg: "bg-orange-50", border: "border-orange-200", label: "Unpaid Leave", icon: FileText };
      }
    }

    if (isPL) {
      return { color: "text-teal-900", bg: "bg-teal-50", border: "border-teal-200", label: plHalf ? "Paid Leave (Half)" : "Paid Leave", icon: FileText };
    }

    // Night OT logic (if active/not checked out yet)
    if (record?.was_night_ot) {
      return { color: "text-emerald-950", bg: "bg-emerald-50", border: "border-emerald-200", label: "Present", icon: CheckCircle2 };
    }

    // Standard Absent
    return { color: "text-white", bg: "bg-red-900", border: "border-red-955", label: "Absent", icon: XCircle };
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-0 z-30 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Title & Navigation */}
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-900">Payroll Cycle</h1>
                  {payrollData?.is_locked === 1 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-600">
                      <Lock className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase">Locked</span>
                    </div>
                  )}
                </div>
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

                <button
                  onClick={() => setOverviewOpen(!overviewOpen)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center space-x-2 text-sm bg-white text-slate-600"
                >
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span className="font-medium hidden sm:inline">Overview</span>
                  {overviewOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>

                <button
                  onClick={() => setCustomCalcOpen(true)}
                  className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                  title="Custom Calculation"
                >
                  <Calculator className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setActionMenuOpen(!actionMenuOpen)}
                  className={`p-1.5 border rounded-lg transition-all ${actionMenuOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200'}`}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {actionMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1 text-sm animate-in fade-in zoom-in duration-100 origin-top-right z-50">
                    <button
                      onClick={() => {
                        if (payrollData?.s3_url) {
                          window.open(payrollData.s3_url, '_blank');
                        } else {
                          handleDownloadSlip();
                        }
                        closeActionMenu();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      <span>{payrollData?.s3_url ? 'View Payslip' : 'Download Payslip'}</span>
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-colors">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>View Breakdown</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    {payrollData?.is_locked === 1 ? (
                      <>
                        <button
                          disabled={isLocking}
                          onClick={() => { handleLockUnlock(employeeId || employee?.id || 0, 'unlock'); closeActionMenu(); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 flex items-center gap-2 transition-colors"
                        >
                          <Unlock className="w-4 h-4" />
                          <span>Unlock Cycle</span>
                        </button>
                        <button
                          onClick={() => { setAdjustModalOpen(true); closeActionMenu(); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-600 flex items-center gap-2 transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          <span>Adjust Payroll</span>
                        </button>
                      </>
                    ) : (
                      <button
                        disabled={isLocking}
                        onClick={() => { handleLockUnlock(employeeId || employee?.id || 0, 'lock'); closeActionMenu(); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center gap-2 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Lock Cycle</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          {overviewOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-4">
              <MetricCard label="Total Days" value={metrics.total_days || 0} color="blue" icon={CalendarIcon} />
              <MetricCard label="Working Days" value={metrics.scheduled_working_days || 0} color="indigo" icon={Users} />
              <MetricCard label="Present" value={metrics.present_days || 0} color="emerald" icon={CheckCircle2} />
              <MetricCard label="Absent" value={metrics.absent_days || 0} color="rose" icon={XCircle} />
              <MetricCard label="Late Deduction" value={metrics.late_days || 0} color="orange" icon={Clock} />
              <MetricCard label="Total Late" value={`${metrics.total_late_minutes || 0} mins`} color="orange" icon={Clock} />
              <MetricCard label="Total OT" value={`${metrics.total_ot_minutes || 0} mins`} color="blue" icon={Clock} />
              <MetricCard label="Paid Leaves" value={metrics.total_paid_leave_days || 0} color="teal" icon={CheckCircle2} />
              <MetricCard label="Adj PL" value={metrics.adjusted_paid_leaves || 0} color="teal" icon={CheckCircle2} />
              <MetricCard label="Comp Off" value={metrics.comp_off_days || 0} color="cyan" icon={CheckCircle2} />
              <MetricCard label="Adj CO" value={metrics.adjusted_comp_offs || 0} color="cyan" icon={CheckCircle2} />
              <MetricCard label="Virtual CO" value={metrics.virtual_comp_offs || 0} color="violet" icon={CheckCircle2} />
              <MetricCard label="Full Day" value={metrics.full_days || 0} color="green" icon={CheckCircle2} />
              <MetricCard label="Half Day" value={metrics.half_days || 0} color="amber" icon={Clock} />
              <MetricCard label="Week Off" value={metrics.total_week_offs || 0} color="slate" icon={CalendarIcon} />
              <MetricCard label="Holidays" value={metrics.total_holidays || 0} color="violet" icon={CalendarIcon} />
              <MetricCard label="Sandwich LOP" value={metrics.sandwich_loss_days || 0} color="rose" icon={AlertTriangle} />
              
              {/* Penalty Removals */}
              {metrics.lateRemoved > 0 && <MetricCard label="Late Removed" value={metrics.lateRemoved} color="emerald" icon={CheckCircle2} />}
              {metrics.earlyRemoved > 0 && <MetricCard label="Early Removed" value={metrics.earlyRemoved} color="emerald" icon={CheckCircle2} />}
              {metrics.latePenaltyRemoved > 0 && <MetricCard label="Late Penalty Rem" value={metrics.latePenaltyRemoved} color="teal" icon={Award} />}
              {metrics.earlyPenaltyRemoved > 0 && <MetricCard label="Early Penalty Rem" value={metrics.earlyPenaltyRemoved} color="teal" icon={Award} />}
            </div>
          )}
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
                              setDetailRecord({
                                ...record,
                                attendance_date: dKey,
                                employee_id: employeeId || record?.employee_id || employee?.id
                              } as any);
                              setDetailOpen(true);
                            }}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center relative border transition-all ${!inCycle ? 'opacity-40 grayscale' : 'hover:scale-105 hover:shadow-md z-0 hover:z-10'
                              } ${config.bg} ${config.border} ${config.color} ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                          >
                            <span className={`text-xs font-medium ${inCycle ? 'text-slate-700' : 'text-slate-400'}`}>
                              {date.getDate()}
                            </span>
                            {inCycle && record && (
                              <>
                                <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${config.bg} ${config.color} border ${config.border}`}>
                                  {config.label === 'Present' ? 'P' :
                                    config.label === 'Missed Out' ? 'MO' :
                                    config.label.includes('Absent') ? 'A' :
                                      config.label === 'Holiday' ? 'H' :
                                        config.label === 'Week Off' ? 'WO' :
                                          config.label.includes('Paid Leave') ? 'PL' :
                                            config.label.includes('Unpaid Leave') ? 'LWP' :
                                              config.label.includes('Half') ? 'HD' :
                                                config.label.slice(0, 2).toUpperCase()}
                                </div>
                                {/* Flag-based badges — read directly from record columns */}
                                <div className="mt-1 flex gap-0.5 items-center flex-wrap justify-center px-0.5">
                                  {/* Late Mark */}
                                  {record?.is_late_mark_removed === 1 ? (
                                    <span title="Late Mark (Removed)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50 leading-none">Late (W)</span>
                                  ) : record?.is_late_mark === 1 ? (
                                    <span title="Late Mark" className="px-1 py-0.2 rounded font-bold text-[7px] bg-orange-50 text-orange-700 border border-orange-200 leading-none">Late</span>
                                  ) : null}
                                  {/* Late Penalty */}
                                  {record?.is_late_penalty_removed === 1 ? (
                                    <span title="Late Penalty (Waived)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50 leading-none">L-Pen (W)</span>
                                  ) : record?.is_latemark_penalty === 1 ? (
                                    <span title="Late Penalty" className="px-1 py-0.2 rounded font-bold text-[7px] bg-orange-600 text-white leading-none">L-Pen</span>
                                  ) : null}
                                  {/* Early Mark */}
                                  {record?.is_early_mark_removed === 1 ? (
                                    <span title="Early Exit (Removed)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50 leading-none">Early (W)</span>
                                  ) : record?.is_early_mark === 1 ? (
                                    <span title="Early Exit" className="px-1 py-0.2 rounded font-bold text-[7px] bg-red-50 text-red-700 border border-red-200 leading-none">Early</span>
                                  ) : null}
                                  {/* Early Penalty */}
                                  {record?.is_early_penalty_removed === 1 ? (
                                    <span title="Early Penalty (Waived)" className="px-1 py-0.2 rounded font-bold text-[7px] text-slate-400 border border-slate-200 line-through bg-slate-50 leading-none">E-Pen (W)</span>
                                  ) : record?.is_early_penalty === 1 ? (
                                    <span title="Early Penalty" className="px-1 py-0.2 rounded font-bold text-[7px] bg-red-600 text-white leading-none">E-Pen</span>
                                  ) : null}
                                  {/* Override */}
                                  {record?.is_overridden === 1 && (
                                    <span title="Overridden" className="px-1 py-0.2 rounded font-bold text-[7px] bg-blue-50 text-blue-700 border border-blue-200 leading-none">OV</span>
                                  )}
                                  {/* Night OT Text Badge */}
                                  {record?.was_night_ot && (
                                    <span title="Night OT" className="px-1 py-0.2 rounded font-bold text-[7px] bg-indigo-600 text-white leading-none">Night OT</span>
                                  )}
                                </div>
                              </>
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
              <button
                onClick={() => setBreakdownOpen(!breakdownOpen)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Breakdown</h3>
                </div>
                {breakdownOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </button>
              {breakdownOpen && (
                <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto text-sm transition-all">
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
                        <div key={`d-${i}`} className="space-y-1">
                          <div className="flex items-center justify-between py-1">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="font-medium text-rose-600">-₹{item.amount.toLocaleString()}</span>
                          </div>
                          {/* Show calculation breakdown if available */}
                          {item.breakdown && item.breakdown.steps && item.breakdown.steps.length > 0 && (
                            <details className="ml-4 text-xs text-slate-500">
                              <summary className="cursor-pointer hover:text-slate-700 select-none">
                                View calculation
                              </summary>
                              <div className="mt-2 space-y-1 pl-3 border-l-2 border-slate-200">
                                {item.breakdown.steps.map((step, stepIdx) => (
                                  <div key={stepIdx} className="flex items-start justify-between gap-2 py-0.5">
                                    <span className="text-slate-600 font-medium">{step.step}:</span>
                                    <span className="text-slate-700 text-right">{step.formula}</span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between font-medium">
                        <span className="text-slate-900">Total Deductions</span>
                        <span className="text-rose-700">₹{salary.debit_total?.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Calculation Details */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setCalcOpen(!calcOpen)}
                className="w-full flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Calculation</h3>
                </div>
                {calcOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </button>
              {calcOpen && (
                <div className="p-4 space-y-3 text-sm transition-all">
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
                      <span className="text-slate-600">Adj PL</span>
                      <span className="font-medium text-teal-700">{metrics.adjusted_paid_leaves?.toLocaleString() || 0}</span>
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
                      <span className="text-slate-600">Sandwich LOP Days</span>
                      <span className="font-medium text-rose-700">{metrics.sandwich_loss_days?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600">Comp Off</span>
                      <span className="font-medium text-cyan-700">{metrics.comp_off_days?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600">Adj CO</span>
                      <span className="font-medium text-cyan-700">{metrics.adjusted_comp_offs?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-600">Virtual CO (Credit)</span>
                      <span className="font-medium text-violet-700">{metrics.virtual_comp_offs?.toLocaleString() || 0}</span>
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
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Detail Modal */}
      {
        detailOpen && detailRecord && (
          <AttendanceDetailsModal
            record={detailRecord}
            onClose={() => setDetailOpen(false)}
          />
        )
      }

      {/* Custom Calculator Modal */}
      {
        customCalcOpen && (
          <CustomCalculatorModal
            metrics={customMetrics}
            onMetricsChange={setCustomMetrics}
            payrollData={payrollData}
            breakdown={breakdown}
            employeeId={employeeId || employee?.id || 0}
            onClose={() => setCustomCalcOpen(false)}
          />
        )
      }

      {/* Debug: Check if modal renders */}
      {showSlipEditor && (
        console.log("Trying to render SalarySlipEditorModal", { showSlipEditor, hasData: !!editorData }),
        null
      )}

      {showSlipEditor && editorData && (
        <SalarySlipEditorModal
          isOpen={showSlipEditor}
          onClose={() => setShowSlipEditor(false)}
          initialData={editorData}
          employeeId={employeeId || employee?.id || 0}
          cycleStart={cycleStartKey}
          cycleEnd={cycleEndKey}
        />
      )}

      {adjustModalOpen && payrollData && (
        <AdjustPayrollModal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          initialData={payrollData}
          employeeId={employeeId || employee?.id || 0}
          cycleStart={cycleStartKey}
          cycleEnd={cycleEndKey}
          onSuccess={() => fetchData()}
        />
      )}
    </div >
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
    violet: "bg-violet-50 text-violet-700 border-violet-100",
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

// Custom Calculator Modal Component
function CustomCalculatorModal({
  metrics,
  onMetricsChange,
  payrollData,
  breakdown,
  employeeId,
  onClose
}: {
  metrics: any;
  onMetricsChange: (m: any) => void;
  payrollData: any;
  breakdown: SalaryItem[];
  employeeId: number;
  onClose: () => void;
}) {
  const [calculatedResults, setCalculatedResults] = React.useState<any>(null);
  const [calculating, setCalculating] = React.useState(false);
  const [calculateError, setCalculateError] = React.useState<string | null>(null);

  // Calculate using backend API
  const handleCalculate = async () => {
    setCalculating(true);
    setCalculateError(null);

    try {
      if (!employeeId) throw new Error("Missing employee id");

      // Calculate payable days from metrics
      const payableDays = metrics.full_days + (metrics.half_days * 0.5) + metrics.paid_leave_days + metrics.week_offs + metrics.holidays;

      // Call backend API with simplified parameters
      const response = await apiClient<any>("/attendance/payroll-calculate-custom", {
        method: "POST",
        withAuth: true,
        body: {
          employee_id: employeeId,
          total_days: metrics.total_days,
          payable_days: payableDays
        }
      });

      setCalculatedResults(response);
    } catch (e: any) {
      setCalculateError(e?.message || "Failed to calculate");
    } finally {
      setCalculating(false);
    }
  };

  // State for expandable sections
  const [creditsExpanded, setCreditsExpanded] = React.useState(false);
  const [debitsExpanded, setDebitsExpanded] = React.useState(false);
  const [expandedDebitIndices, setExpandedDebitIndices] = React.useState<Record<number, boolean>>({});

  const toggleDebitBreakdown = (idx: number) => {
    setExpandedDebitIndices(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Validation: Check if total attendance days exceed total days
  const validation = React.useMemo(() => {
    const totalDays = metrics.total_days || 0;
    const fullDays = metrics.full_days || 0;
    const halfDays = metrics.half_days || 0;
    const absentDays = metrics.absent_days || 0;
    const paidLeaveDays = metrics.paid_leave_days || 0;
    const weekOffs = metrics.week_offs || 0;
    const holidays = metrics.holidays || 0;

    // Calculate total accounted days (counting half days as 0.5)
    const totalAccountedDays = fullDays + halfDays + absentDays + paidLeaveDays + weekOffs + holidays;

    const isValid = totalAccountedDays <= totalDays;
    const difference = totalAccountedDays - totalDays;

    return {
      isValid,
      totalAccountedDays: Number(totalAccountedDays.toFixed(2)),
      difference: Number(difference.toFixed(2)),
      message: isValid
        ? `Valid: ${totalAccountedDays.toFixed(2)} / ${totalDays} days accounted`
        : `Invalid: ${totalAccountedDays.toFixed(2)} days exceeds ${totalDays} total days by ${difference.toFixed(2)} days`
    };
  }, [metrics]);

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onMetricsChange({ ...metrics, [field]: numValue });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Calculator className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Custom Payroll Calculator</h2>
                <p className="text-sm text-slate-600">Enter custom attendance values for verification</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Input Metrics</h3>

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Total Days" value={metrics.total_days} onChange={(v) => handleInputChange('total_days', v)} color="blue" />
                <InputField label="Full Days" value={metrics.full_days} onChange={(v) => handleInputChange('full_days', v)} color="emerald" />
                <InputField label="Half Days" value={metrics.half_days} onChange={(v) => handleInputChange('half_days', v)} color="amber" />
                <InputField label="Absent Days" value={metrics.absent_days} onChange={(v) => handleInputChange('absent_days', v)} color="rose" />
                <InputField label="Paid Leaves" value={metrics.paid_leave_days} onChange={(v) => handleInputChange('paid_leave_days', v)} color="teal" />
                <InputField label="Week Offs" value={metrics.week_offs} onChange={(v) => handleInputChange('week_offs', v)} color="slate" />
                <InputField label="Holidays" value={metrics.holidays} onChange={(v) => handleInputChange('holidays', v)} color="violet" />
                <InputField label="Comp Off" value={metrics.comp_off_days} onChange={(v) => handleInputChange('comp_off_days', v)} color="cyan" />
                <InputField label="Late Days" value={metrics.late_days} onChange={(v) => handleInputChange('late_days', v)} color="orange" />
              </div>

              {/* Validation Indicator */}
              <div className={`mt-4 p-3 rounded-lg border ${validation.isValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-start gap-2">
                  {validation.isValid ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${validation.isValid ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {validation.isValid ? 'Valid Configuration' : 'Invalid Configuration'}
                    </p>
                    <p className={`text-xs mt-1 ${validation.isValid ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {validation.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculation Results */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Calculated Results</h3>
                <button
                  onClick={handleCalculate}
                  disabled={calculating || !validation.isValid}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {calculating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Calculate
                    </>
                  )}
                </button>
              </div>

              {calculateError && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{calculateError}</p>
                </div>
              )}

              {!calculatedResults && !calculating && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border border-slate-200 text-center">
                  <Calculator className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600">Click "Calculate" to see results</p>
                  <p className="text-xs text-slate-500 mt-1">Backend will calculate accurate salary based on your custom metrics</p>
                </div>
              )}

              {calculatedResults && (
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 space-y-3 border border-slate-200">
                  <ResultRow label="Total Days" value={calculatedResults.metrics?.total_days || 0} />
                  <ResultRow label="Payable Days" value={calculatedResults.metrics?.payable_days || 0} />
                  <ResultRow label="Proration Ratio" value={`${(calculatedResults.metrics?.proration_ratio * 100).toFixed(2)}%`} />

                  <div className="border-t border-slate-300 my-2" />

                  <ResultRow label="Gross Salary (Monthly)" value={`₹${calculatedResults.salary?.gross_salary?.toLocaleString() || '0'}`} highlight />
                  <ResultRow label="Per Day Gross" value={`₹${calculatedResults.salary?.per_day_gross?.toLocaleString() || '0'}`} />
                  <ResultRow label="Earned Gross" value={`₹${calculatedResults.salary?.earned_gross?.toLocaleString() || '0'}`} highlight />

                  <div className="border-t border-slate-300 my-2" />

                  {/* Expandable Credits Section */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setCreditsExpanded(!creditsExpanded)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-semibold text-emerald-700">Total Credits (Earned)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-700">₹{calculatedResults.salary_breakdown?.filter((b: any) => b.type === 'credit').reduce((sum: number, item: any) => sum + (item.earned_amount || 0), 0).toLocaleString() || '0'}</span>
                        {creditsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </button>
                    {creditsExpanded && (
                      <div className="pl-4 space-y-1 border-l-2 border-emerald-200">
                        {calculatedResults.salary_breakdown?.filter((b: any) => b.type === 'credit').map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="font-medium text-emerald-600">+₹{item.earned_amount?.toLocaleString() || '0'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Expandable Debits Section */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setDebitsExpanded(!debitsExpanded)}
                      className="w-full flex items-center justify-between p-2 hover:bg-slate-200/50 rounded-lg transition-colors"
                    >
                      <span className="text-sm font-semibold text-rose-700">All Debits</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-rose-700">₹{calculatedResults.salary?.additional_debits?.toLocaleString() || '0'}</span>
                        {debitsExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </button>
                    {debitsExpanded && (
                      <div className="pl-4 space-y-1 border-l-2 border-rose-200">
                        {calculatedResults.salary_breakdown?.filter((b: any) => b.type === 'debit').map((item: any, idx: number) => (
                          <div key={idx} className="py-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-600">{item.name}</span>
                                {item.breakdown && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleDebitBreakdown(idx);
                                    }}
                                    className="text-slate-400 hover:text-blue-500 transition-colors"
                                  >
                                    <Info className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <span className="font-medium text-rose-600">-₹{item.amount.toLocaleString()}</span>
                            </div>

                            {/* Breakdown Steps */}
                            {expandedDebitIndices[idx] && item.breakdown && (
                              <div className="mt-1 ml-2 pl-2 border-l border-slate-300 space-y-0.5">
                                {item.breakdown.steps.map((step: any, sIdx: number) => (
                                  <div key={sIdx} className="text-[10px] text-slate-500 flex justify-between gap-2">
                                    <span>{step.step}:</span>
                                    <span className="font-mono">{step.formula}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <ResultRow label="Salary Advance EMI" value={`₹${calculatedResults.salary?.salary_advance_emi?.toLocaleString() || '0'}`} color="orange" />
                  <ResultRow label="Total Deductions" value={`₹${calculatedResults.salary?.total_deductions?.toLocaleString() || '0'}`} color="rose" highlight />

                  <div className="border-t-2 border-slate-400 my-2" />

                  <ResultRow label="Net Payment" value={`₹${calculatedResults.salary?.net_payment?.toLocaleString() || '0'}`} color="blue" highlight large />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            * Calculations are performed by the backend for 100% accuracy
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Input Field Component
function InputField({ label, value, onChange, color = "blue" }: { label: string; value: number; onChange: (v: string) => void; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: "border-blue-200 focus:border-blue-500 focus:ring-blue-500",
    emerald: "border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500",
    amber: "border-amber-200 focus:border-amber-500 focus:ring-amber-500",
    rose: "border-rose-200 focus:border-rose-500 focus:ring-rose-500",
    teal: "border-teal-200 focus:border-teal-500 focus:ring-teal-500",
    slate: "border-slate-200 focus:border-slate-500 focus:ring-slate-500",
    violet: "border-violet-200 focus:border-violet-500 focus:ring-violet-500",
    cyan: "border-cyan-200 focus:border-cyan-500 focus:ring-cyan-500",
    orange: "border-orange-200 focus:border-orange-500 focus:ring-orange-500",
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-all ${colorMap[color] || colorMap.blue}`}
        min="0"
        step="0.5"
      />
    </div>
  );
}

// Result Row Component
function ResultRow({ label, value, color, highlight, large }: { label: string; value: string | number; color?: string; highlight?: boolean; large?: boolean }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-700",
    rose: "text-rose-700",
    blue: "text-blue-700",
    orange: "text-orange-700",
  };

  const textColor = color ? colorMap[color] : "text-slate-900";
  const fontWeight = highlight ? "font-bold" : "font-medium";
  const fontSize = large ? "text-lg" : "text-sm";

  return (
    <div className="flex items-center justify-between">
      <span className={`${fontSize} ${highlight ? 'font-semibold' : ''} text-slate-700`}>{label}</span>
      <span className={`${fontSize} ${fontWeight} ${textColor}`}>{value}</span>
    </div>
  );
}


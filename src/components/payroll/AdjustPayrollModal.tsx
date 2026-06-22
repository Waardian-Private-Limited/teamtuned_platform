"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, RefreshCw, Save, Info, Plus, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { toast } from "react-hot-toast";

type SalaryItem = {
  name: string;
  type: "credit" | "debit";
  amount: number;
  full_amount: number;
};

type AdjustPayrollModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialData: any;
  employeeId: number;
  cycleStart: string;
  cycleEnd: string;
  onSuccess: () => void;
};

export default function AdjustPayrollModal({
  isOpen,
  onClose,
  initialData,
  employeeId,
  cycleStart,
  cycleEnd,
  onSuccess
}: AdjustPayrollModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Day metrics state
  const [totalDays, setTotalDays] = useState(0);
  const [presentDays, setPresentDays] = useState(0);
  const [lopDays, setLopDays] = useState(0);
  const [weekOffs, setWeekOffs] = useState(0);
  const [holidays, setHolidays] = useState(0);
  const [paidLeaves, setPaidLeaves] = useState(0);
  const [sandwichLoss, setSandwichLoss] = useState(0);
  const [absentDays, setAbsentDays] = useState(0);

  // Breakdown/Salary states
  const [earnings, setEarnings] = useState<SalaryItem[]>([]);
  const [deductions, setDeductions] = useState<SalaryItem[]>([]);
  const [grossSalary, setGrossSalary] = useState(0);
  const [advanceEmi, setAdvanceEmi] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialData) {
      const m = initialData.metrics || {};
      const s = initialData.salary || {};
      const b = initialData.salary_breakdown || [];

      setTotalDays(m.total_days || 0);
      setPresentDays(m.present_days || 0);
      setLopDays(m.lop_days || 0);
      setWeekOffs(m.total_week_offs || 0);
      setHolidays(m.total_holidays || 0);
      setPaidLeaves(m.total_paid_leave_days || 0);
      setSandwichLoss(m.sandwich_loss_days || 0);
      setAbsentDays(m.absent_days || 0);

      setGrossSalary(s.gross_salary || 0);
      setAdvanceEmi(s.salary_advance_emi || 0);

      // Populate earnings/deductions
      setEarnings(
        b.filter((item: any) => item.type === "credit").map((item: any) => ({
          name: item.name,
          type: "credit",
          amount: Number(item.amount || 0),
          full_amount: Number(item.full_amount || item.amount || 0)
        }))
      );

      setDeductions(
        b.filter((item: any) => item.type === "debit").map((item: any) => ({
          name: item.name,
          type: "debit",
          amount: Number(item.amount || 0),
          full_amount: Number(item.full_amount || item.amount || 0)
        }))
      );
    }
  }, [isOpen, initialData]);

  // Recalculate metrics on the backend given these overrides
  const handleRecalculate = async (
    overridePresent?: number,
    overrideLop?: number,
    overrideAbsent?: number,
    silent = false
  ) => {
    try {
      setLoading(true);
      const params: any = {
        employee_id: String(employeeId),
        cycle_start: cycleStart,
        cycle_end: cycleEnd,
        override_total_days: String(totalDays),
        override_present_days: String(overridePresent !== undefined ? overridePresent : presentDays),
        override_lop_days: String(overrideLop !== undefined ? overrideLop : lopDays),
        override_week_offs: String(weekOffs),
        override_holidays: String(holidays),
        override_paid_leave_days: String(paidLeaves),
        override_sandwich_loss_days: String(sandwichLoss),
        override_absent_days: String(overrideAbsent !== undefined ? overrideAbsent : absentDays)
      };

      const res = await apiClient<any>("/attendance/payroll-cycle", {
        method: "GET",
        withAuth: true,
        params
      });

      if (res) {
        const s = res.salary || {};
        const b = res.salary_breakdown || [];

        setGrossSalary(s.gross_salary || 0);
        setAdvanceEmi(s.salary_advance_emi || 0);

        setEarnings(
          b.filter((item: any) => item.type === "credit").map((item: any) => ({
            name: item.name,
            type: "credit",
            amount: Number(item.amount || 0),
            full_amount: Number(item.full_amount || item.amount || 0)
          }))
        );

        setDeductions(
          b.filter((item: any) => item.type === "debit").map((item: any) => ({
            name: item.name,
            type: "debit",
            amount: Number(item.amount || 0),
            full_amount: Number(item.full_amount || item.amount || 0)
          }))
        );

        if (!silent) {
          toast.success("Payroll breakdown recalculated");
        }
      }
    } catch (err: any) {
      console.error("Recalculate error:", err);
      toast.error(err.message || "Failed to recalculate breakdown");
    } finally {
      setLoading(false);
    }
  };

  const handlePresentDaysChange = (value: number) => {
    const newPresentDays = Math.max(0, value);
    setPresentDays(newPresentDays);
    const newLopDays = Math.max(0, totalDays - newPresentDays);
    setLopDays(newLopDays);
    setAbsentDays(newLopDays);
    handleRecalculate(newPresentDays, newLopDays, newLopDays, true);
  };

  const handleEarningChange = (index: number, field: keyof SalaryItem, value: any) => {
    const updated = [...earnings];
    if (field === "amount" || field === "full_amount") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as never;
    }
    setEarnings(updated);
  };

  const handleDeductionChange = (index: number, field: keyof SalaryItem, value: any) => {
    const updated = [...deductions];
    if (field === "amount" || field === "full_amount") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as never;
    }
    setDeductions(updated);
  };

  const addEarningRow = () => {
    setEarnings([...earnings, { name: "Special Allowance", type: "credit", amount: 0, full_amount: 0 }]);
  };

  const addDeductionRow = () => {
    setDeductions([...deductions, { name: "Other Deduction", type: "debit", amount: 0, full_amount: 0 }]);
  };

  const removeEarningRow = (index: number) => {
    setEarnings(earnings.filter((_, idx) => idx !== index));
  };

  const removeDeductionRow = (index: number) => {
    setDeductions(deductions.filter((_, idx) => idx !== index));
  };

  const totalEarnings = earnings.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const netPayment = totalEarnings - totalDeductions - advanceEmi;

  const handleSubmit = async () => {
    try {
      setSaving(true);

      const refDate = new Date(cycleEnd);
      const year = refDate.getFullYear();
      const month = refDate.getMonth() + 1;

      // Reconstruct payroll metrics object
      const metrics = {
        ...(initialData.metrics || {}),
        total_days: totalDays,
        present_days: presentDays,
        lop_days: lopDays,
        total_week_offs: weekOffs,
        total_holidays: holidays,
        total_paid_leave_days: paidLeaves,
        sandwich_loss_days: sandwichLoss,
        absent_days: absentDays,
        pay_days: presentDays
      };

      // Reconstruct salary breakdown
      const salaryBreakdown = [
        ...earnings.map(e => ({ name: e.name, type: "credit", amount: e.amount, full_amount: e.full_amount })),
        ...deductions.map(d => ({ name: d.name, type: "debit", amount: d.amount, full_amount: d.full_amount }))
      ];

      // Reconstruct salary summaries
      const salary = {
        gross_salary: grossSalary,
        credit_total: totalEarnings,
        debit_total: totalDeductions,
        total_deductions: totalDeductions + advanceEmi,
        net_payment: Number(netPayment.toFixed(2)),
        net_payment_raw: netPayment,
        salary_advance_emi: advanceEmi,
        bank_payment: Number(netPayment.toFixed(2)),
        per_day_gross: totalDays > 0 ? Number((grossSalary / totalDays).toFixed(2)) : 0,
        earned_gross: totalEarnings,
        adjusted_gross: totalEarnings
      };

      const payload = {
        employee_id: employeeId,
        month,
        year,
        metrics,
        salary,
        salary_breakdown: salaryBreakdown
      };

      const res = await apiClient<any>("/attendance/payroll-adjust", {
        method: "POST",
        body: payload,
        withAuth: true
      });

      if (res.success) {
        toast.success("Payroll adjusted successfully");
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message || "Failed to adjust payroll");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col relative animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Adjust Locked Payroll</h2>
              <p className="text-xs text-slate-500"> Tweak working days metrics, preview calculations, and customize details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Days Adjustment Grid */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              Adjust Attendance / Cycle Days
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Total Days</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={totalDays}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Present Days</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500/20"
                  value={presentDays}
                  onChange={(e) => handlePresentDaysChange(parseFloat(e.target.value) || 0)}
                  onBlur={() => handleRecalculate(undefined, undefined, undefined, true)}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">LOP Days</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={lopDays}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Absent Days</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={absentDays}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Paid Leave</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={paidLeaves}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Week Offs</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={weekOffs}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Holidays</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={holidays}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Sandwich LOP</label>
                <input
                  type="number"
                  step="0.5"
                  readOnly
                  disabled
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  value={sandwichLoss}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => handleRecalculate()}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Recalculate Breakdown
              </button>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Earnings */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-semibold text-emerald-700 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Earnings (Credits)
                </h4>
                <button
                  type="button"
                  onClick={addEarningRow}
                  className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Component
                </button>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {earnings.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center group">
                    <input
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                      value={item.name}
                      onChange={(e) => handleEarningChange(idx, "name", e.target.value)}
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        className="w-full pl-5 p-2 border border-slate-200 rounded-lg text-sm text-right text-slate-800 focus:outline-none focus:border-emerald-500 font-mono"
                        value={item.amount}
                        placeholder="Earned"
                        onChange={(e) => handleEarningChange(idx, "amount", e.target.value)}
                      />
                    </div>
                    <div className="relative w-28" title="Base Full Value">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        className="w-full pl-5 p-2 border border-slate-200 rounded-lg text-sm text-right text-slate-400 focus:outline-none bg-slate-50 font-mono"
                        value={item.full_amount}
                        placeholder="Full Base"
                        onChange={(e) => handleEarningChange(idx, "full_amount", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEarningRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {earnings.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No credits defined</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t font-semibold text-slate-700 text-sm">
                <span>Total Earnings</span>
                <span className="text-emerald-700">₹{totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="border border-slate-100 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-semibold text-rose-700 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Deductions (Debits)
                </h4>
                <button
                  type="button"
                  onClick={addDeductionRow}
                  className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded hover:bg-rose-100 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add Component
                </button>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {deductions.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center group">
                    <input
                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-rose-500 font-medium"
                      value={item.name}
                      onChange={(e) => handleDeductionChange(idx, "name", e.target.value)}
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        className="w-full pl-5 p-2 border border-slate-200 rounded-lg text-sm text-right text-slate-800 focus:outline-none focus:border-rose-500 font-mono"
                        value={item.amount}
                        placeholder="Deducted"
                        onChange={(e) => handleDeductionChange(idx, "amount", e.target.value)}
                      />
                    </div>
                    <div className="relative w-28" title="Base Full Value">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                      <input
                        type="number"
                        className="w-full pl-5 p-2 border border-slate-200 rounded-lg text-sm text-right text-slate-400 focus:outline-none bg-slate-50 font-mono"
                        value={item.full_amount}
                        placeholder="Full Base"
                        onChange={(e) => handleDeductionChange(idx, "full_amount", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDeductionRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                {advanceEmi > 0 && (
                  <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="flex-1 text-sm font-medium text-slate-600">Advance Salary EMI (held)</span>
                    <span className="text-sm font-mono text-rose-600 font-bold pr-14">-₹{advanceEmi.toLocaleString()}</span>
                  </div>
                )}

                {deductions.length === 0 && advanceEmi === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No deductions defined</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t font-semibold text-slate-700 text-sm">
                <span>Total Deductions</span>
                <span className="text-rose-700">₹{(totalDeductions + advanceEmi).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

          </div>

          {/* Summaries */}
          <div className="bg-blue-50/50 p-4 rounded-xl flex justify-between items-center border border-blue-100">
            <div>
              <span className="block text-sm text-blue-600 uppercase tracking-wide font-bold">Net Adjusted Pay</span>
              <span className="text-xs text-blue-500">Calculated final salary payment (Earnings - Deductions - EMI)</span>
            </div>
            <div className="text-3xl font-extrabold text-blue-700">
              ₹{netPayment.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-md transition-all text-sm font-semibold disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Adjustment
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}

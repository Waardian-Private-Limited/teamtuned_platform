"use client";

import React from "react";
import { X, Moon, CheckCircle, AlertCircle, Loader2, Calendar, MapPin, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Props {
  currentSiteId: number | null;
  siteOptions: any[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export interface AdjustmentCandidate {
  id: string;
  employee_id: number;
  employee_name: string;
  employee_code: string;
  site_name: string;
  night_ot_date: string;
  prev_punch_in: string | null;
  prev_punch_out: string | null;
  night_ot_duration_minutes: number;
  qualified_level: 'Full-Day' | 'Half-Day';
  target_date: string;
  current_status: string;
  proposed_status: string;
  shift_start: string;
  shift_end: string;
  att_id: number | null;
}

export default function NightOTAdjustmentModal({
  currentSiteId,
  siteOptions,
  onClose,
  onSuccess,
}: Props) {
  const [month, setMonth] = React.useState<string>(() => new Date().toISOString().slice(0, 7));
  const [siteId, setSiteId] = React.useState<number | "all">(currentSiteId ?? "all");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [applying, setApplying] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2>(1);
  const [adjustments, setAdjustments] = React.useState<AdjustmentCandidate[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [progress, setProgress] = React.useState<number>(0);
  const [progressMessage, setProgressMessage] = React.useState<string | null>(null);


  const handleFetchAdjustments = async () => {
    if (!month) {
      setError("Please select a valid month.");
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout budget for All Sites query

    try {
      const siteParam = siteId === "all" ? "all" : String(siteId);
      const res = await apiClient<any>(
        `/attendance/night-ot-adjustment/preview?month=${month}&site_id=${siteParam}`,
        { method: "GET", withAuth: true, signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (res.success) {
        const list: AdjustmentCandidate[] = res.adjustments || [];
        setAdjustments(list);
        setSelectedIds(new Set(list.map((item) => item.id)));
        setStep(2);
      } else {
        throw new Error(res.message || "Failed to fetch Night OT adjustments preview");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError("The request timed out while scanning all sites. Please try selecting a specific site or narrowing the request.");
      } else {
        setError(err.message || "An unexpected error occurred while fetching preview");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === adjustments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(adjustments.map((a) => a.id)));
    }
  };

  const handleToggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleApplyAdjustments = async () => {
    const selectedList = adjustments.filter((a) => selectedIds.has(a.id));
    if (selectedList.length === 0) {
      setError("Please select at least one adjustment item to confirm.");
      return;
    }

    setApplying(true);
    setError(null);
    setProgress(0);

    const siteParam = siteId === "all" ? "all" : siteId;
    const BATCH_SIZE = 25;
    const totalItems = selectedList.length;
    let totalUpdated = 0;

    try {
      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const chunk = selectedList.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
        const processedCount = Math.min(i + chunk.length, totalItems);
        const percent = Math.round((processedCount / totalItems) * 100);

        setProgress(percent);
        setProgressMessage(`Batch ${currentBatch} of ${totalBatches}: Updating ${processedCount} of ${totalItems} records (${percent}%)...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const res = await apiClient<any>("/attendance/night-ot-adjustment/apply", {
          method: "POST",
          body: {
            month,
            site_id: siteParam,
            adjustments: chunk,
          },
          withAuth: true,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.success) {
          totalUpdated += (res.updated_count || chunk.length);
        } else {
          throw new Error(res.message || `Failed to apply adjustments at batch ${currentBatch}`);
        }
      }

      onSuccess(`Successfully applied Night OT adjustments for ${totalUpdated} records.`);
      onClose();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("A batch request timed out. Some records may have been updated. Please refresh and try again.");
      } else {
        setError(err.message || "An unexpected error occurred while applying adjustments.");
      }
    } finally {
      setApplying(false);
      setProgress(0);
      setProgressMessage(null);
    }
  };


  const formatTimeStr = (isoStr: string | null) => {
    if (!isoStr) return "N/A";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (_) {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-xl shadow-2xl border border-slate-200 w-full ${step === 2 ? 'max-w-4xl' : 'max-w-md'} overflow-hidden transition-all duration-200`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2.5 text-indigo-700">
            <Moon className="w-5 h-5" />
            <h3 className="font-semibold text-slate-800 text-base">Night OT Monthly Adjustment</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan all employees for the selected month who worked a <strong>Night OT</strong> shift on date D and were marked <strong>Absent</strong> on date D+1. Review candidates before confirming overrides.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Select Month
                </label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Select Site
                </label>
                <select
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900"
                >
                  <option value="all">All Sites</option>
                  {siteOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.site_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFetchAdjustments}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Fetch Adjustments</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                <div>
                  <span className="text-slate-600">Month: </span>
                  <strong className="text-slate-800">{month}</strong>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-slate-600">Candidates Found: </span>
                  <strong className="text-indigo-600">{adjustments.length}</strong>
                </div>
                <div className="text-xs text-slate-500">
                  Selected: <span className="font-bold text-slate-800">{selectedIds.size}</span> of {adjustments.length}
                </div>
              </div>

              {applying && progressMessage && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-900">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                      {progressMessage}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}


              {adjustments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-700">No missing Night OT adjustments found!</p>
                  <p className="text-xs">All employees with night OT in {month} already have attendance updated for the following day.</p>
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === adjustments.length && adjustments.length > 0}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Night OT Date (D)</th>
                        <th className="p-3">Prev Punch In / Out</th>
                        <th className="p-3">Target Date (D+1)</th>
                        <th className="p-3">Current Status</th>
                        <th className="p-3">Proposed Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {adjustments.map((item) => (
                        <tr key={item.id} className="hover:bg-indigo-50/40 transition-colors">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(item.id)}
                              onChange={() => handleToggleItem(item.id)}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800">{item.employee_name}</div>
                            <div className="text-[11px] text-slate-400">ID: {item.employee_code} | {item.site_name}</div>
                          </td>
                          <td className="p-3 font-medium text-slate-700">{item.night_ot_date}</td>
                          <td className="p-3 text-slate-600">
                            <div>In: {formatTimeStr(item.prev_punch_in)}</div>
                            <div>Out: {formatTimeStr(item.prev_punch_out)}</div>
                            <div className="text-[10px] text-indigo-600 font-medium">OT: {item.night_ot_duration_minutes}m ({item.qualified_level})</div>
                          </td>
                          <td className="p-3 font-semibold text-slate-800">{item.target_date}</td>
                          <td className="p-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                              {item.current_status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${item.proposed_status === 'Present' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                              {item.proposed_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={applying}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleApplyAdjustments}
                  disabled={applying || selectedIds.size === 0 || adjustments.length === 0}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm & Override Selected ({selectedIds.size})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

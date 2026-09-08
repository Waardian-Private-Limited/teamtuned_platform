"use client";

import React from "react";
import { X, Moon, CheckCircle, AlertCircle, Loader2, Calendar, MapPin, ArrowRight, Download, FileSpreadsheet } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Props {
  currentSiteId: number | null;
  siteOptions: any[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

/* A night the system would not credit because it could not verify the employee
   actually finished the session. Held back for HR rather than silently dropped:
   each one is somebody's day or comp-off. */
export interface NightOTReviewItem {
  employee_id: number;
  employee_name: string | null;
  target_date: string;
  night_ot_date: string | null;
  reason: string;
  auto_terminated: boolean | null;
  has_checkout_photo: boolean | null;
  has_punch_out: boolean | null;
}

/* Plain-English for each reason. The raw codes are fine in a log but useless to
   the person who has to act on the row. */
const REVIEW_REASON_LABELS: Record<string, string> = {
  auto_terminated: "Session auto-closed by system",
  no_checkout_evidence: "No checkout photo or punch-out",
  incomplete_night_ot: "Night OT start or end missing",
  night_ot_rejected: "Night OT was rejected",
};

/* The list is the point of the screen, so it has to be able to leave it —
   payroll gets worked in a spreadsheet, not in a modal. */
function downloadReviewCsv(items: NightOTReviewItem[], month: string) {
  const header = ["Employee ID", "Employee", "Night OT date", "Day affected", "Reason", "Auto-closed", "Checkout photo", "Punch-out"];
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = items.map((r) => [
    r.employee_id,
    r.employee_name || `Employee #${r.employee_id}`,
    r.night_ot_date || "",
    r.target_date,
    REVIEW_REASON_LABELS[r.reason] || r.reason.replace(/_/g, " "),
    r.auto_terminated ? "Yes" : "No",
    r.has_checkout_photo ? "Yes" : "No",
    r.has_punch_out ? "Yes" : "No",
  ].map(esc).join(","));
  const blob = new Blob([[header.map(esc).join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Night_OT_Needs_Review_${month}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
  /* Set only where a full-day stretch lands on a half day: the half repairs the
     day and the rest banks. Absent days consume the whole credit. */
  leftover_compoff?: number;
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
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [reviewItems, setReviewItems] = React.useState<NightOTReviewItem[]>([]);
  const [resultMessage, setResultMessage] = React.useState<string>("");
  const [adjustments, setAdjustments] = React.useState<AdjustmentCandidate[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [progress, setProgress] = React.useState<number>(0);
  const [progressMessage, setProgressMessage] = React.useState<string | null>(null);
  const [activeJobId, setActiveJobId] = React.useState<number | null>(null);

  const handleDownloadExcel = async () => {
    if (!month) return;
    try {
      const siteParam = siteId === "all" ? "all" : String(siteId);
      const token = localStorage.getItem("token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://stress-compacter-splashy.ngrok-free.dev/api/v1";
      const url = `${baseUrl}/attendance/night-ot-adjustment/export-excel?month=${month}&site_id=${siteParam}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download Excel report');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Night_OT_Adjustments_${month}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setError(err.message || "Failed to download Excel report");
    }
  };



  /* Runs the month as a background job.
     Paging the scan into many small requests still failed — a burst of
     requests is its own kind of load, and the browser gave up with "Failed to
     fetch" long before the work was done. Nothing about this belongs on an
     HTTP connection somebody is waiting on: the server now walks the employees
     one at a time at its own pace and records progress as it goes, and this
     just watches that row. It can take as long as it needs. */
  const pollJob = async (jobId: number): Promise<any> => {
    for (;;) {
      await new Promise((r) => setTimeout(r, 3000));
      let res: any;
      try {
        res = await apiClient<any>(`/attendance/night-ot-adjustment/job/${jobId}`, { method: "GET", withAuth: true });
      } catch {
        // A dropped poll says nothing about the run, which is server-side and
        // still going. Try again on the next tick.
        continue;
      }
      if (!res?.success) continue;

      const j = res.job;
      setProgress(j.progress || 0);
      setProgressMessage(j.progress_note || (j.status === "queued" ? "Queued — starting shortly…" : "Working…"));

      if (j.status === "done") return res.result;
      if (j.status === "failed") throw new Error(j.error || "The run failed.");
      if (j.status === "cancelled") throw new Error("The run was cancelled.");
    }
  };

  const startRun = async (mode: "preview" | "apply") => {
    if (!month) {
      setError("Please select a valid month.");
      return null;
    }
    const res = await apiClient<any>("/attendance/night-ot-adjustment/job", {
      method: "POST",
      withAuth: true,
      body: { month, site_id: siteId === "all" ? "all" : siteId, mode },
    });
    if (!res?.success) throw new Error(res?.message || "Could not start the run.");
    setActiveJobId(res.job_id);
    return await pollJob(res.job_id);
  };

  const handleFetchAdjustments = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressMessage("Queued — starting shortly…");
    try {
      const result = await startRun("preview");
      if (!result) return;
      const list: AdjustmentCandidate[] = result.candidates || [];
      setAdjustments(list);
      setSelectedIds(new Set(list.map((i) => i.id)));
      if (Array.isArray(result.review_items)) setReviewItems(result.review_items);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while scanning.");
    } finally {
      setLoading(false);
      setActiveJobId(null);
      setProgress(0);
      setProgressMessage(null);
    }
  };

  const handleFetchAndFix = async () => {
    setError(null);
    setApplying(true);
    setProgress(0);
    setProgressMessage("Queued — starting shortly…");
    try {
      const result = await startRun("apply");
      if (!result) return;

      const o = result.outcome || {};
      let msg = describeOutcome(o, o.compoff_credits || 0);
      if (o.skipped > 0) msg += ` ${o.skipped} left unchanged.`;
      setResultMessage(msg);
      onSuccess(msg);

      const review: NightOTReviewItem[] = result.review_items || [];
      if (review.length > 0) {
        setReviewItems(review);
        setStep(3);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setApplying(false);
      setActiveJobId(null);
      setProgress(0);
      setProgressMessage(null);
    }
  };

  const handleCancelRun = async () => {
    if (!activeJobId) return;
    try {
      await apiClient(`/attendance/night-ot-adjustment/job/${activeJobId}`, { method: "DELETE", withAuth: true });
    } catch { /* it may have finished in the meantime; the poll will say so */ }
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

  /* One line describing what actually happened, built from the server's own
     tally rather than a row count. "Applied 240 adjustments" says nothing about
     whether anyone was made Present, lifted from a half day, or paid in
     comp-off — and those are the three things the person running this is
     accountable for explaining afterwards. */
  const describeOutcome = (o: any, credits: number): string => {
    const parts: string[] = [];
    if (o.absent_to_present) parts.push(`${o.absent_to_present} absent day${o.absent_to_present > 1 ? "s" : ""} → Present`);
    if (o.absent_to_halfday) parts.push(`${o.absent_to_halfday} absent day${o.absent_to_halfday > 1 ? "s" : ""} → Half-Day`);
    if (o.halfday_upgraded) parts.push(`${o.halfday_upgraded} half-day${o.halfday_upgraded > 1 ? "s" : ""} → Full day`);
    if (o.compoff_only) parts.push(`${o.compoff_only} credited as comp-off`);
    if (!parts.length) return "No records needed adjusting.";
    let msg = parts.join(", ") + ".";
    if (credits > 0) {
      msg += ` ${credits} comp-off credit${credits === 1 ? "" : "s"} banked against ${new Date(`${month}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" })}.`;
    }
    return msg;
  };

  const handleApplyAdjustments = async (list?: AdjustmentCandidate[]) => {
    const selectedList = list ?? adjustments.filter((a) => selectedIds.has(a.id));
    if (selectedList.length === 0) {
      setError("Please select at least one adjustment item to confirm.");
      return;
    }

    setApplying(true);
    setError(null);
    setProgress(0);

    const siteParam = siteId === "all" ? "all" : siteId;
    /* Smaller batches, and a breather between them. The server settles each day
       individually - reading two attendance rows, sometimes writing one and
       awarding a comp-off - so a large month is thousands of round trips. Sent
       in one rush they saturate the connection pool and every other user waits
       behind them. This is slower on purpose. */
    const BATCH_SIZE = 15;
    const BATCH_PAUSE_MS = 250;
    const totalItems = selectedList.length;

    const tally = {
      absent_to_present: 0, absent_to_halfday: 0, halfday_upgraded: 0,
      compoff_only: 0, compoff_credits: 0, skipped: 0,
      skipped_reasons: {} as Record<string, number>,
    };
    const collectedReview: NightOTReviewItem[] = [];

    try {
      for (let i = 0; i < totalItems; i += BATCH_SIZE) {
        const chunk = selectedList.slice(i, i + BATCH_SIZE);
        const currentBatch = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalItems / BATCH_SIZE);
        const processedCount = Math.min(i + chunk.length, totalItems);
        const percent = Math.round((processedCount / totalItems) * 100);

        setProgress(percent);
        setProgressMessage(`Batch ${currentBatch} of ${totalBatches} — ${processedCount} of ${totalItems} records (${percent}%). Running gently to keep the system responsive.`);

        const controller = new AbortController();
        // Generous: the server paces itself, so a slow batch is expected rather
        // than a sign anything is wrong.
        const timeoutId = setTimeout(() => controller.abort(), 180000);

        const res = await apiClient<any>("/attendance/night-ot-adjustment/apply", {
          method: "POST",
          body: { month, site_id: siteParam, adjustments: chunk },
          withAuth: true,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.success) {
          throw new Error(res.message || `Failed to apply adjustments at batch ${currentBatch}`);
        }

        const o = res.outcome || {};
        tally.absent_to_present += o.absent_to_present || 0;
        tally.absent_to_halfday += o.absent_to_halfday || 0;
        tally.halfday_upgraded += o.halfday_upgraded || 0;
        tally.compoff_only += o.compoff_only || 0;
        tally.compoff_credits += o.compoff_credits || 0;
        tally.skipped += o.skipped || 0;
        for (const [k, v] of Object.entries(o.skipped_reasons || {})) {
          tally.skipped_reasons[k] = (tally.skipped_reasons[k] || 0) + (v as number);
        }
        if (Array.isArray(res.review_items)) collectedReview.push(...res.review_items);

        if (i + BATCH_SIZE < totalItems) await new Promise(r => setTimeout(r, BATCH_PAUSE_MS));
      }

      let msg = describeOutcome(tally, tally.compoff_credits);
      if (tally.skipped > 0) {
        // Naming the reasons matters: "already settled" is the system working,
        // "manually overridden" means someone's decision was respected, and
        // both look identical if the count is reported bare.
        const reasonLabels: Record<string, string> = {
          already_settled: "already settled",
          manually_overridden: "manually overridden by HR",
          auto_adjust_disabled: "auto-adjust off in policy",
          invalid_night_ot: "night OT not valid",
          auto_terminated: "night OT auto-closed, not worked",
          below_threshold: "below the qualifying threshold",
          no_previous_day: "no night OT the day before",
          no_policy: "no attendance policy",
        };
        const detail = Object.entries(tally.skipped_reasons)
          .map(([k, v]) => `${v} ${reasonLabels[k] || k.replace(/_/g, " ")}`)
          .join(", ");
        msg += ` ${tally.skipped} left unchanged (${detail}).`;
      }

      /* Closing straight away would put this list behind a toast that
         disappears. Anything a human has to decide stays on screen until they
         have seen it. */
      if (collectedReview.length > 0) {
        setResultMessage(msg);
        setReviewItems(collectedReview);
        setStep(3);
        onSuccess(msg);
      } else {
        onSuccess(msg);
        onClose();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("A batch timed out. Anything already applied has been saved — re-run for the same month and settled days will be skipped automatically.");
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
      {/* The review list is a table too, so it needs the wide layout — at
          max-w-md the columns are unreadable. */}
      <div className={`bg-white rounded-xl shadow-2xl border border-slate-200 w-full ${step === 2 ? 'max-w-4xl' : step === 3 ? 'max-w-3xl' : 'max-w-md'} overflow-hidden transition-all duration-200`}>
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

          {step === 3 ? (
            /* What the run could not verify. Shown after the fact rather than
               folded into the summary toast: these are days somebody has to
               look at, and a toast is gone before anyone can write them down. */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{resultMessage}</span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2 text-sm text-amber-900">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{reviewItems.length} night{reviewItems.length === 1 ? "" : "s"} left for you to decide</p>
                    <p className="text-xs mt-0.5 leading-relaxed">
                      Nothing was changed for these. The system could not confirm the employee finished the
                      session themselves &mdash; either it was auto-closed by the 6 AM job, or there is no
                      checkout photo and no punch-out against it. Credit them by hand if the work did happen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="max-h-[45vh] overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-500 uppercase tracking-wider text-[10px]">
                      <th className="p-2.5">Employee</th>
                      <th className="p-2.5">Night OT date</th>
                      <th className="p-2.5">Day affected</th>
                      <th className="p-2.5">Why it was held back</th>
                      <th className="p-2.5">Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviewItems.map((r, idx) => (
                      <tr key={`${r.employee_id}-${r.target_date}-${idx}`} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-800">
                          {r.employee_name || `Employee #${r.employee_id}`}
                          <div className="text-[10px] text-slate-400 font-normal">ID: {r.employee_id}</div>
                        </td>
                        <td className="p-2.5 text-slate-700">{r.night_ot_date || "\u2014"}</td>
                        <td className="p-2.5 text-slate-700">{r.target_date}</td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            {REVIEW_REASON_LABELS[r.reason] || r.reason.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="p-2.5 text-[10px] text-slate-600 space-y-0.5">
                          <div>{r.auto_terminated ? "Auto-closed by system" : "Closed normally"}</div>
                          <div>Checkout photo: {r.has_checkout_photo ? "yes" : "no"}</div>
                          <div>Punch-out: {r.has_punch_out ? "yes" : "no"}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => downloadReviewCsv(reviewItems, month)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-semibold flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download list
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Scans the selected month for employees who worked a <strong>Night OT</strong> stretch, and settles the day after it against what they earned:
              </p>
              <ul className="text-[11px] text-slate-600 space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <li>&bull; <strong>Absent</strong> after a full-day stretch &rarr; marked <strong>Present</strong></li>
                <li>&bull; <strong>Absent</strong> after a half-day stretch &rarr; marked <strong>Half-Day</strong></li>
                <li>&bull; <strong>Half-Day</strong> after a half-day stretch &rarr; <strong>Full day</strong> (half + half)</li>
                <li>&bull; <strong>Half-Day</strong> after a full-day stretch &rarr; Full day, and the leftover half banks as <strong>comp-off</strong></li>
                <li>&bull; Already <strong>Present</strong>, or a week off &rarr; the whole credit banks as <strong>comp-off</strong></li>
              </ul>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Comp-off is credited against the month being processed, not the current month. Days HR has already
                overridden by hand, and days already settled, are left alone.
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

              {/* The run is server-side, so this is a view onto it rather than
                  the work itself — closing the browser does not stop it. */}
              {(applying || loading) && progressMessage && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3 text-xs font-semibold text-indigo-900">
                    <span className="flex items-start gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 mt-px shrink-0" />
                      <span className="font-medium leading-relaxed">{progressMessage}</span>
                    </span>
                    <span className="shrink-0">{progress}%</span>
                  </div>
                  <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-indigo-700">
                      Runs on the server, one employee at a time. Days already settled are skipped, so
                      re-running never double-counts.
                    </p>
                    {activeJobId && (
                      <button
                        type="button"
                        onClick={handleCancelRun}
                        className="shrink-0 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={applying}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-4 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all text-sm font-semibold flex items-center justify-center gap-2 rounded-lg"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleFetchAdjustments}
                  disabled={loading || applying}
                  className="flex-1 px-4 py-2 border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Review First</span>
                </button>
                {/* The usual path when a whole month is being closed off and
                    there is nothing to pick over. Same rules, same pacing —
                    only the review step is skipped. */}
                <button
                  type="button"
                  onClick={handleFetchAndFix}
                  disabled={loading || applying}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Moon className="w-4 h-4" />}
                  <span>Fetch &amp; Fix All</span>
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
                  onClick={handleDownloadExcel}
                  disabled={applying}
                  className="px-4 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all text-sm font-semibold flex items-center justify-center gap-2 rounded-lg"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Download Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyAdjustments()}
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

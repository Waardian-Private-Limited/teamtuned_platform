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

/* Local calendar, not UTC: toISOString() on a date built from local parts rolls
   back a day for anyone east of Greenwich, which would quietly start the range
   on the wrong day for the India deployments. */
function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthStart(d: Date) {
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
}
function monthEnd(d: Date) {
  return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}
function spanDays(from: string, to: string) {
  if (!from || !to) return 0;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
}
function rangeLabel(from: string, to: string) {
  if (!from || !to) return "—";
  return from === to ? from : `${from} → ${to}`;
}

type JobState = {
  id: number;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  progress?: number;
  progress_note?: string | null;
  processed?: number;
  total?: number;
  error?: string | null;
  mode: "preview" | "apply";
  result?: any;
  /* True when the screen found this run already going rather than starting it,
     which is worth saying out loud - otherwise a progress bar appears over a
     form the operator has not submitted. */
  reattached?: boolean;
};

/* Naming the reasons matters: "already settled" is the system working,
   "manually overridden" means someone's decision was respected, and both look
   identical if the count is reported bare. */
const SKIP_REASON_LABELS: Record<string, string> = {
  already_settled: "already settled",
  manually_overridden: "manually overridden by HR",
  auto_adjust_disabled: "auto-adjust off in policy",
  invalid_night_ot: "night OT not valid",
  auto_terminated: "night OT auto-closed, not worked",
  below_threshold: "below the qualifying threshold",
  no_previous_day: "no night OT the day before",
  no_policy: "no attendance policy",
  no_checkout_evidence: "no checkout photo or punch-out",
};

function describeSkips(reasons?: Record<string, number>): string {
  const entries = Object.entries(reasons || {});
  if (!entries.length) return "";
  return ` (${entries.map(([k, v]) => `${v} ${SKIP_REASON_LABELS[k] || k.replace(/_/g, " ")}`).join(", ")})`;
}

/* The list is the point of the screen, so it has to be able to leave it —
   payroll gets worked in a spreadsheet, not in a modal. */
function downloadReviewCsv(items: NightOTReviewItem[], periodLabel: string) {
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
  a.download = `Night_OT_Needs_Review_${periodLabel}.csv`;
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
  /* A custom range rather than a month picker. Night OT gets settled when
     payroll is worked, and that rarely lines up with a calendar month - a cycle
     that runs the 26th to the 25th, or a single week someone is chasing, could
     not be expressed at all before. Defaults to the current month, so the
     common case is still one click. */
  const [fromDate, setFromDate] = React.useState<string>(() => monthStart(new Date()));
  const [toDate, setToDate] = React.useState<string>(() => monthEnd(new Date()));
  const [siteId, setSiteId] = React.useState<number | "all">(currentSiteId ?? "all");
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [reviewItems, setReviewItems] = React.useState<NightOTReviewItem[]>([]);
  const [resultMessage, setResultMessage] = React.useState<string>("");
  const [adjustments, setAdjustments] = React.useState<AdjustmentCandidate[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const handleDownloadExcel = async () => {
    if (!fromDate || !toDate) return;
    try {
      const siteParam = siteId === "all" ? "all" : String(siteId);
      const token = localStorage.getItem("token") || "";
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://stress-compacter-splashy.ngrok-free.dev/api/v1";
      const url = `${baseUrl}/attendance/night-ot-adjustment/export-excel?from_date=${fromDate}&to_date=${toDate}&site_id=${siteParam}`;

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
      link.download = `Night_OT_Adjustments_${fromDate}_to_${toDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      setError(err.message || "Failed to download Excel report");
    }
  };



  /* ── Runs happen on the server, not on this connection ────────────────────
   *
   * Everything here used to hold the browser open for the whole run: the scan
   * awaited an inline polling loop, and applying sent the selected days back in
   * batches of fifteen, each its own request. Both meant the run only survived
   * as long as the tab, the modal and the network all held — and when one of
   * them did not, it surfaced as "Failed to fetch" with no way to tell what had
   * already been written.
   *
   * The labour attendance export does not work that way and neither does this
   * now. A run is queued, the row is polled on a timer, and the result is read
   * when it is there. Closing the modal costs nothing: the run carries on, and
   * reopening finds it again.
   * ───────────────────────────────────────────────────────────────────────── */
  const [job, setJob] = React.useState<JobState | null>(null);
  // A finished job must only be acted on once, or every poll would re-fire the
  // success toast.
  const handledJobRef = React.useRef<number | null>(null);

  const jobRunning = !!job && (job.status === "queued" || job.status === "running");

  /* Derived from the run rather than tracked alongside it. When these were
     separate state, a run that outlived the modal left them stale - a spinner
     that never stopped, or buttons enabled while work was still going. */
  const loading = jobRunning && job?.mode === "preview";
  const applying = jobRunning && job?.mode === "apply";
  const progress = jobRunning ? (job?.progress ?? 0) : 0;
  const activeJobId = jobRunning ? job!.id : null;
  const progressMessage = jobRunning
    ? job?.progress_note || (job?.status === "queued" ? "Queued — starting shortly…" : "Working…")
    : null;

  // Pick up a run still going from an earlier visit, so closing this dialog -
  // or the tab - does not lose track of it.
  React.useEffect(() => {
    (async () => {
      try {
        const res = await apiClient<any>("/attendance/night-ot-adjustment/jobs?limit=1", { withAuth: true });
        const latest = res?.data?.[0];
        if (!latest || !["queued", "running"].includes(latest.status)) return;
        if (latest.from_date) setFromDate(latest.from_date);
        if (latest.to_date) setToDate(latest.to_date);
        setJob({
          id: latest.id,
          status: latest.status,
          progress: latest.progress || 0,
          progress_note: latest.progress_note,
          mode: latest.mode === "preview" ? "preview" : "apply",
          reattached: true,
        });
      } catch { /* nothing running, or no permission - either way, nothing to show */ }
    })();
  }, []);

  React.useEffect(() => {
    if (!jobRunning || !job) return;
    const jobId = job.id;
    const tick = async () => {
      try {
        const res = await apiClient<any>(`/attendance/night-ot-adjustment/job/${jobId}`, { withAuth: true });
        if (!res?.success) return;
        setJob((prev) =>
          prev && prev.id === jobId
            ? { ...prev, ...res.job, mode: prev.mode, result: res.result ?? prev.result }
            : prev
        );
      } catch {
        /* A dropped poll says nothing about the run, which is server-side and
           still going. The next tick retries. */
      }
    };
    const t = setInterval(tick, 4000);
    return () => clearInterval(t);
  }, [jobRunning, job?.id]);

  // Act on a finished run: exactly once, whichever way the screen arrived at it.
  React.useEffect(() => {
    if (!job || jobRunning) return;
    if (handledJobRef.current === job.id) return;
    handledJobRef.current = job.id;

    if (job.status === "failed") {
      setError(job.error || "The run failed.");
      return;
    }
    if (job.status === "cancelled") {
      setError("The run was cancelled. Anything already settled stays settled.");
      return;
    }

    const result = job.result;
    if (!result) return;

    if (job.mode === "preview") {
      const list: AdjustmentCandidate[] = result.candidates || [];
      setAdjustments(list);
      setSelectedIds(new Set(list.map((i) => i.id)));
      if (Array.isArray(result.review_items)) setReviewItems(result.review_items);
      setStep(2);
      return;
    }

    const o = result.outcome || {};
    let msg = describeOutcome(o, o.compoff_credits || 0);
    if (o.skipped > 0) msg += ` ${o.skipped} left unchanged${describeSkips(o.skipped_reasons)}.`;
    setResultMessage(msg);
    onSuccess(msg);

    /* Closing straight away would put the review list behind a toast that
       disappears. Anything a human has to decide stays on screen until they
       have seen it. */
    const review: NightOTReviewItem[] = result.review_items || [];
    if (review.length > 0) {
      setReviewItems(review);
      setStep(3);
    }
  }, [job, jobRunning]);

  const startRun = async (mode: "preview" | "apply", chosen?: AdjustmentCandidate[]) => {
    if (!fromDate || !toDate) {
      setError("Please pick a start and an end date.");
      return;
    }
    if (fromDate > toDate) {
      setError("The start date must not be after the end date.");
      return;
    }
    if (spanDays(fromDate, toDate) > 93) {
      setError(`That range covers ${spanDays(fromDate, toDate)} days. Please run at most 3 months at a time.`);
      return;
    }

    setError(null);
    setResultMessage("");
    try {
      const res = await apiClient<any>("/attendance/night-ot-adjustment/job", {
        method: "POST",
        withAuth: true,
        body: {
          from_date: fromDate,
          to_date: toDate,
          site_id: siteId === "all" ? "all" : siteId,
          mode,
          adjustments: chosen,
        },
      });
      if (!res?.success) throw new Error(res?.message || "Could not start the run.");
      handledJobRef.current = null;
      setJob({ id: res.job_id, status: "queued", progress: 0, progress_note: null, mode });
    } catch (err: any) {
      /* Already running is not an error worth showing as one - it is the run
         this screen is about. Attach to it instead of telling the operator to
         go away and come back. */
      if (err?.status === 409 && err?.data?.job_id) {
        handledJobRef.current = null;
        setJob({ id: err.data.job_id, status: "running", progress: 0, progress_note: null, mode });
        return;
      }
      setError(err?.message || "Could not start the run.");
    }
  };

  const handleFetchAdjustments = () => startRun("preview");
  const handleFetchAndFix = () => startRun("apply");

  const handleCancelRun = async () => {
    if (!job) return;
    try {
      await apiClient(`/attendance/night-ot-adjustment/job/${job.id}`, { method: "DELETE", withAuth: true });
      setJob({ ...job, status: "cancelled" });
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
      /* Each credit is dated to the night that earned it, so a range spanning
         two months banks into both — naming one month here would be wrong. */
      msg += ` ${credits} comp-off credit${credits === 1 ? "" : "s"} banked against the nights that earned them, within ${rangeLabel(fromDate, toDate)}.`;
    }
    return msg;
  };

  const handleApplyAdjustments = (list?: AdjustmentCandidate[]) => {
    const selectedList = list ?? adjustments.filter((a) => selectedIds.has(a.id));
    if (selectedList.length === 0) {
      setError("Please select at least one adjustment item to confirm.");
      return;
    }
    /* The chosen days go to the queue as a list of days, not as instructions.
       What each one becomes is decided server-side when it is written, so a
       preview left open for an hour cannot overwrite a day HR has ruled on
       since. */
    return startRun("apply", selectedList);
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
            <h3 className="font-semibold text-slate-800 text-base">Night OT Adjustment</h3>
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
                  onClick={() => downloadReviewCsv(reviewItems, `${fromDate}_to_${toDate}`)}
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
                Scans the selected period for employees who worked a <strong>Night OT</strong> stretch, and settles the day after it against what they earned:
              </p>
              <ul className="text-[11px] text-slate-600 space-y-1 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <li>&bull; <strong>Absent</strong> after a full-day stretch &rarr; marked <strong>Present</strong></li>
                <li>&bull; <strong>Absent</strong> after a half-day stretch &rarr; marked <strong>Half-Day</strong></li>
                <li>&bull; <strong>Half-Day</strong> after a half-day stretch &rarr; <strong>Full day</strong> (half + half)</li>
                <li>&bull; <strong>Half-Day</strong> after a full-day stretch &rarr; Full day, and the leftover half banks as <strong>comp-off</strong></li>
                <li>&bull; Already <strong>Present</strong>, or a week off &rarr; the whole credit banks as <strong>comp-off</strong></li>
              </ul>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Comp-off is credited against the night that earned it, not the month you run this in. Days HR has already
                overridden by hand, and days already settled, are left alone.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Period to settle
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || undefined}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900"
                  />
                  <span className="text-slate-400 text-sm shrink-0">to</span>
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-900"
                  />
                </div>
                {/* The month buttons are still here because closing off a month
                    is the common case; the dates are for the cycles that do not
                    line up with one. */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => { const d = new Date(); setFromDate(monthStart(d)); setToDate(monthEnd(d)); }}
                    className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    This month
                  </button>
                  <button
                    type="button"
                    onClick={() => { const d = new Date(); d.setMonth(d.getMonth() - 1); setFromDate(monthStart(d)); setToDate(monthEnd(d)); }}
                    className="px-2 py-1 text-[11px] font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Last month
                  </button>
                  {fromDate && toDate && (
                    <span className={`ml-auto text-[11px] font-medium ${spanDays(fromDate, toDate) > 93 || fromDate > toDate ? "text-rose-600" : "text-slate-400"}`}>
                      {fromDate > toDate
                        ? "End date is before the start date"
                        : `${spanDays(fromDate, toDate)} day${spanDays(fromDate, toDate) === 1 ? "" : "s"}${spanDays(fromDate, toDate) > 93 ? " — 3 months max" : ""}`}
                    </span>
                  )}
                </div>
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
                      {job?.reattached
                        ? "This run was already going when you opened this. "
                        : ""}
                      <strong className="font-semibold">You can close this window</strong> — the run carries on
                      and you can reopen to check on it. Days already settled are skipped, so re-running never
                      double-counts.
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
                {/* Never disabled while a run is going: the run is server-side,
                    so closing is a legitimate thing to do rather than something
                    to be protected from. */}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-semibold"
                >
                  {jobRunning ? "Close" : "Cancel"}
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
                  <span className="text-slate-600">Period: </span>
                  <strong className="text-slate-800">{rangeLabel(fromDate, toDate)}</strong>
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
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-indigo-700">
                      Settling on the server. <strong className="font-semibold">You can close this window</strong> —
                      it finishes on its own, and reopening shows where it got to.
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

              {adjustments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-700">No missing Night OT adjustments found!</p>
                  <p className="text-xs">All employees with night OT in {rangeLabel(fromDate, toDate)} already have attendance updated for the following day.</p>
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

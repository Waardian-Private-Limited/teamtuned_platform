import React from "react";
import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Props {
  currentSiteId: number | null;
  siteOptions: any[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function BulkOverrideModal({ 
  currentSiteId, 
  siteOptions, 
  onClose, 
  onSuccess 
}: Props) {
  const [month, setMonth] = React.useState<string>(() => new Date().toISOString().slice(0, 7));
  const [siteId, setSiteId] = React.useState<number | null>(currentSiteId);
  const [checkin, setCheckin] = React.useState(true);
  const [checkout, setCheckout] = React.useState(true);
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2>(1);

  const handleBulkOverride = async () => {
    if (!reason.trim()) {
      setError("Please enter a valid override reason.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/attendance/bulk-override", {
        method: "POST",
        body: {
          month,
          site_id: siteId,
          checkin,
          checkout,
          reason,
        },
        withAuth: true
      });

      if (res.success || res.message) {
        onSuccess(res.message || "Bulk override completed successfully.");
      } else {
        throw new Error(res.message || "Failed to perform bulk override");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setStep(1); // Go back to first step on error
    } finally {
      setLoading(false);
    }
  };

  const validateFirstStep = () => {
    setError(null);
    if (!month) {
      setError("Month is required");
      return;
    }
    if (!checkin && !checkout) {
      setError("At least one option (Check-in or Check-out) must be selected");
      return;
    }
    if (!reason.trim()) {
      setError("Please enter a reason for the override");
      return;
    }
    setStep(2);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-blue-600">
            <CheckCircle className="w-5 h-5" />
            <h3 className="font-semibold text-slate-800 text-base">Bulk Attendance Override</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Site</label>
                <select
                  value={siteId || ""}
                  onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-900"
                >
                  <option value="">All Sites</option>
                  {siteOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.site_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Override Target Flags</label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={checkin}
                      onChange={(e) => setCheckin(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700">Check-in</span>
                      <p className="text-xs text-slate-500">Auto check-in missing punches as per shift start.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={checkout}
                      onChange={(e) => setCheckout(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-slate-700">Check-out</span>
                      <p className="text-xs text-slate-500">Auto check-out missing punches as per shift end.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason for Override</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all text-slate-900"
                />
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
                  onClick={validateFirstStep}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-semibold"
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 space-y-2">
                <p className="font-semibold">⚠️ Attention: Bulk Override Operation</p>
                <p className="text-xs leading-relaxed">
                  You are about to modify attendance records for <strong>all active employees</strong> matching the selected month and site.
                </p>
                <ul className="text-xs list-disc pl-5 space-y-1 mt-2">
                  {checkin && checkout && (
                    <li>Both check-in and check-out will be added as per shift time for every day of the month.</li>
                  )}
                  {checkout && !checkin && (
                    <li>Only check-out punches will be added to records missing a checkout punch. Other fields (lateness, OT, full/half day) remain unchanged.</li>
                  )}
                  {checkin && !checkout && (
                    <li>Only check-in punches will be added to records missing a check-in punch.</li>
                  )}
                  <li>This action is saved, tracked, and logs who modified the records.</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all text-sm font-semibold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleBulkOverride}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm & Proceed</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

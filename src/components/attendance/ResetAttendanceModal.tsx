import React from "react";
import { X, RefreshCw, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/apiClient";

interface Props {
  currentSiteId: number | null;
  siteOptions: any[];
  employee_id?: number;
  forcedMonth?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetAttendanceModal({ 
  currentSiteId, 
  siteOptions, 
  employee_id, 
  forcedMonth, 
  onClose, 
  onSuccess 
}: Props) {
  const [type, setType] = React.useState<'daily' | 'monthly'>(forcedMonth ? 'monthly' : 'monthly');
  const [date, setDate] = React.useState<string>(() => new Date().toISOString().split('T')[0]);
  const [month, setMonth] = React.useState<string>(() => forcedMonth || new Date().toISOString().slice(0, 7));
  const [siteId, setSiteId] = React.useState<number | null>(currentSiteId);
  const [removeRegularization, setRemoveRegularization] = React.useState(true);
  const [removeOverrides, setRemoveOverrides] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<1 | 2>(1);

  const handleReset = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>("/attendance/bulk-reset", {
        method: "POST",
        body: {
          type,
          date: type === 'daily' ? date : undefined,
          month: type === 'monthly' ? month : undefined,
          site_id: siteId,
          employee_id: employee_id,
          remove_regularization: removeRegularization,
          remove_overrides: removeOverrides,
        },
        withAuth: true
      });

      if (res.success) {
        onSuccess();
      } else {
        throw new Error(res.message || "Failed to reset attendance");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-rose-600">
            <RefreshCw className="w-5 h-5" />
            <h3 className="font-semibold text-slate-800 text-base">Reset Attendance {employee_id ? '(Employee)' : ''}</h3>
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
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reset Type</label>
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  {!forcedMonth && (
                    <button
                      onClick={() => setType('daily')}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'daily' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      Daily
                    </button>
                  )}
                  <button
                    onClick={() => setType('monthly')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${type === 'monthly' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-600 hover:text-slate-800'}`}
                  >
                    Monthly {forcedMonth ? `(${forcedMonth})` : ''}
                  </button>
                </div>
              </div>

              {!forcedMonth && type === 'daily' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              )}

              {!forcedMonth && type === 'monthly' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Month</label>
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              )}

              {!employee_id && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Site</label>
                  <select
                    value={siteId || ""}
                    onChange={(e) => setSiteId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="">All Sites</option>
                    {siteOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.site_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={removeRegularization}
                    onChange={(e) => setRemoveRegularization(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Clear Regularizations</span>
                    <span className="text-[10px] text-slate-500">Delete all approved/pending regularization requests</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={removeOverrides}
                    onChange={(e) => setRemoveOverrides(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">Clear Overrides</span>
                    <span className="text-[10px] text-slate-500">Reset manually overridden statuses to system calculated</span>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <h4 className="text-base font-semibold text-slate-800 mb-2 font-bold">Are you absolutely sure?</h4>
              <p className="text-sm text-slate-500 mb-6">
                This will recalculate all attendance data for the selected period. 
                {removeRegularization && " Regularization history will be PERMANENTLY DELETED."}
                This action cannot be undone.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={step === 1 ? onClose : () => setStep(1)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-all shadow-sm"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleReset}
              disabled={loading}
              className="px-6 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Yes, Reset Everything</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

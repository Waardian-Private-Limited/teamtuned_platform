import React from "react";
import {
    X,
    Clock,
    MapPin,
    CheckCircle2,
    AlertCircle,
    XCircle,
    TrendingUp,
    Edit,
    Lock,
    Trash2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/apiClient";

type Props = {
    record: any;
    onClose: () => void;
    onUpdate?: () => void;
    isLocked?: boolean;
    salaryDate?: string | Date;
};

export default function AttendanceDetailsModal({ record, onClose, onUpdate, isLocked, salaryDate }: Props) {
    const { permissions, role } = useAuth();
    const [showOverride, setShowOverride] = React.useState(false);
    const [overrideStatus, setOverrideStatus] = React.useState("Absent");
    const [overrideReason, setOverrideReason] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [showRegularizeAction, setShowRegularizeAction] = React.useState(false);
    const [regularizeAction, setRegularizeAction] = React.useState<'approve' | 'reject'>('approve');
    const [regularizeReason, setRegularizeReason] = React.useState("");

    // Check permissions
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasEditPerm = isOrgAdmin || (permissions || []).includes("ATTEND_EDIT");
    const hasHrMode = isOrgAdmin || (permissions || []).includes("HR_MODE");

    // Check Salary Date Logic
    // If salaryDate is provided, check if today is AFTER salary date
    const salaryDatePassed = salaryDate ? new Date() > new Date(salaryDate) : false;
    const locked = isLocked || salaryDatePassed || record.is_locked;

    if (!record) return null;

    const handleOverride = async () => {
        if (!overrideReason.trim()) {
            alert("Please provide a reason.");
            return;
        }

        const payload = {
            attendance_id: record.attendance_id || record.id,
            employee_id: record.employee_id,
            attendance_date: record.attendance_date || record.date,
            status: overrideStatus,
            reason: overrideReason
        };

        console.log('🔍 Override Debug:');
        console.log('Payload:', payload);
        console.log('Record:', record);
        console.log('Record Keys:', Object.keys(record));
        console.log('Record.employee_id:', record.employee_id);
        console.log('Record.id:', record.id);

        try {
            setLoading(true);
            await apiClient('/attendance/override', {
                method: 'POST',
                body: payload,
                withAuth: true
            });
            setShowOverride(false);
            if (onUpdate) onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Override Error:', err);
            alert(err.message || "Failed to override");
        } finally {
            setLoading(false);
        }
    };

    const handleRegularizeAction = async () => {
        if (regularizeAction === 'reject' && !regularizeReason.trim()) {
            alert("Please provide a reason for rejection.");
            return;
        }

        try {
            setLoading(true);
            const endpoint = regularizeAction === 'approve'
                ? '/attendance/regularize/approve'
                : '/attendance/regularize/reject';

            await apiClient(endpoint, {
                method: 'POST',
                body: {
                    id: record.regularize_request_id,
                    remarks: regularizeReason || undefined
                },
                withAuth: true
            });

            setShowRegularizeAction(false);
            if (onUpdate) onUpdate();
            onClose();
        } catch (err: any) {
            console.error('Regularize Action Error:', err);
            alert(err.message || "Failed to process request");
        } finally {
            setLoading(false);
        }
    };

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

    const getStatusInfo = (record: any) => {
        // Week off (but check for overtime work)
        if (record?.is_weekly_off) {
            if (record?.attendance_id || record?.total_work_minutes > 0) { // Check if worked
                return { label: "OT", type: "overtime" };
            }
            return { label: "WO", type: "weekoff" };
        }
        // Holiday
        if (record?.is_holiday) {
            if (record?.attendance_id || record?.total_work_minutes > 0) {
                return { label: "OT", type: "overtime" };
            }
            return { label: "H", type: "holiday" };
        }

        // Status string checks (prioritize these over attendance_id check)
        const s = (record?.status || "").toLowerCase();
        if (s === 'week off' || s === 'week_off') return { label: "WO", type: "weekoff" };
        if (s === 'holiday') return { label: "H", type: "holiday" };
        if (s === 'present' || s === 'completed' || s === 'checked_in' || s === 'checked_out') {
            if (record?.status_timeline === "Half-Day" || s === 'half day') return { label: "HD", type: "halfday" };
            return { label: "P", type: "fullday" };
        }
        if (s === 'half day' || s === 'half_day') return { label: "HD", type: "halfday" };
        if (s === 'absent') return { label: "A", type: "absent" };

        if (!record?.attendance_id) return { label: "A", type: "absent" };

        return { label: record?.status || "—", type: "unknown" };
    };

    const statusInfo = getStatusInfo(record);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="font-semibold text-slate-900">
                            {formatDate(record.attendance_date || record.date)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            {statusInfo.type === 'fullday' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {statusInfo.type === 'halfday' && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                            {statusInfo.type === 'absent' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            <span className="text-sm font-medium text-slate-700">
                                {statusInfo.label === 'P' ? 'Present' :
                                    statusInfo.label === 'HD' ? 'Half Day' :
                                        statusInfo.label === 'A' ? 'Absent' :
                                            statusInfo.label === 'OT' ? 'Overtime' :
                                                statusInfo.label}
                            </span>

                            {/* Show Overtime badge if week off/holiday with completed work */}
                            {(record.is_weekly_off || record.is_holiday) &&
                                (record.status === "Completed" || record.total_work_minutes > 0) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                        Overtime
                                    </span>
                                )}
                            {!!record.is_latemark_penalty && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                    Late Deduction
                                </span>
                            )}
                            {!!record.is_early_penalty && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                                    Early Penalty
                                </span>
                            )}
                            {!!record.is_overridden && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200">
                                    Overridden
                                </span>
                            )}
                        </div>
                        {/* Status Summary in Header */}
                        {record.status_summary && (
                            <div className="text-xs text-slate-500 mt-1 font-medium">
                                {record.status_summary}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Regularization Action Modal */}
                {showRegularizeAction && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
                        <div className="bg-white rounded-lg p-5 max-w-md w-full mx-4 shadow-xl border border-slate-200">
                            <h4 className="text-base font-semibold text-slate-900 mb-3">
                                {regularizeAction === 'approve' ? 'Approve' : 'Reject'} Regularization Request
                            </h4>
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600">
                                    {regularizeAction === 'approve'
                                        ? 'Are you sure you want to approve this regularization request?'
                                        : 'Please provide a reason for rejecting this regularization request.'}
                                </p>
                                {regularizeAction === 'reject' && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Reason (Required)</label>
                                        <textarea
                                            value={regularizeReason}
                                            onChange={(e) => setRegularizeReason(e.target.value)}
                                            placeholder="Why are you rejecting this request?"
                                            rows={3}
                                            className="w-full text-sm rounded-md border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 pt-4">
                                <button
                                    onClick={handleRegularizeAction}
                                    disabled={loading}
                                    className={`px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-1.5 disabled:opacity-50 ${regularizeAction === 'approve'
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                                        }`}
                                >
                                    {loading ? "Processing..." : regularizeAction === 'approve' ? 'Approve' : 'Reject'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowRegularizeAction(false);
                                        setRegularizeReason("");
                                    }}
                                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Override Form */}
                {showOverride && (
                    <div className="bg-amber-50 border-b border-amber-200 p-4 shrink-0 transition-all">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div className="flex-1 space-y-3">
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900">Override Attendance</h4>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Manually status update. This action will be logged.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-amber-800 mb-1">Status</label>
                                        <select
                                            value={overrideStatus}
                                            onChange={(e) => setOverrideStatus(e.target.value)}
                                            className="w-full text-sm rounded-md border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                                        >
                                            <option value="Absent">Absent</option>
                                            {/* HR Mode Options */}
                                            {hasHrMode && (
                                                <>
                                                    <option value="Full-Day">Full Day</option>
                                                    <option value="Half-Day">Half Day</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-amber-800 mb-1">Reason (Required)</label>
                                        <input
                                            type="text"
                                            value={overrideReason}
                                            onChange={(e) => setOverrideReason(e.target.value)}
                                            placeholder="Why are you changing this?"
                                            className="w-full text-sm rounded-md border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={handleOverride}
                                        disabled={loading}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        {loading ? "Saving..." : "Confirm Override"}
                                    </button>
                                    <button
                                        onClick={() => setShowOverride(false)}
                                        className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-xs font-medium rounded-md hover:bg-amber-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content - Scrollable */}
                <div className="p-5 overflow-y-auto flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            {/* Status Summary */}
                            {record.status_summary && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Status</div>
                                    <div className="text-sm text-slate-900">{record.status_summary}</div>
                                </div>
                            )}

                            {/* Override Info */}
                            {!!record.is_overridden && (
                                <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Edit className="w-3.5 h-3.5 text-rose-700" />
                                        <div className="text-xs font-semibold text-rose-700 uppercase">Manually Overridden</div>
                                    </div>
                                    <div className="text-sm text-rose-900 font-medium italic">
                                        "{record.override_reason}"
                                    </div>
                                    {(record.override_by_first || record.overridden_by) && (
                                        <div className="text-xs text-rose-600 mt-1 font-medium">
                                            By: {record.override_by_first ? `${record.override_by_first} ${record.override_by_last || ''}`.trim() : `ID: ${record.overridden_by}`}
                                            {record.override_by_role && <span className="text-rose-500 font-normal"> ({record.override_by_role})</span>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Time Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-200/50">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                                        <div className="text-xs font-semibold text-blue-700 uppercase">Punch In</div>
                                    </div>
                                    <div className="font-semibold text-blue-900">{formatTime(record.punch_in_time || record.check_in)}</div>
                                    {record.punch_in_site_name && (
                                        <div className="text-xs text-blue-700 mt-1 truncate">{record.punch_in_site_name}</div>
                                    )}
                                </div>

                                <div className="bg-purple-50/50 rounded-lg p-3 border border-purple-200/50">
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <Clock className="w-3.5 h-3.5 text-purple-600" />
                                        <div className="text-xs font-semibold text-purple-700 uppercase">Punch Out</div>
                                    </div>
                                    <div className="font-semibold text-purple-900">{formatTime(record.punch_out_time || record.check_out)}</div>
                                    {record.punch_out_site_name && (
                                        <div className="text-xs text-purple-700 mt-1 truncate">{record.punch_out_site_name}</div>
                                    )}
                                </div>
                            </div>

                            {/* Work Stats */}
                            {(record.total_work_minutes > 0 || record.late_by_minutes > 0 || record.extra_work_minutes > 0) && (
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-emerald-50/50 rounded-lg p-2.5 text-center border border-emerald-200/50">
                                        <div className="text-xs text-emerald-600 font-medium mb-0.5">Work</div>
                                        <div className="text-sm font-semibold text-emerald-900">
                                            {Math.floor((record.total_work_minutes || 0) / 60)}h {(record.total_work_minutes || 0) % 60}m
                                        </div>
                                    </div>
                                    {(record.late_by_minutes > 0 || record.late_minutes > 0) && (
                                        <div className="bg-amber-50/50 rounded-lg p-2.5 text-center border border-amber-200/50">
                                            <div className="text-xs text-amber-600 font-medium mb-0.5">Late</div>
                                            <div className="text-sm font-semibold text-amber-900">{record.late_by_minutes || record.late_minutes}m</div>
                                        </div>
                                    )}
                                    {record.extra_work_minutes > 0 && (
                                        <div className="bg-indigo-50/50 rounded-lg p-2.5 text-center border border-indigo-200/50">
                                            <div className="text-xs text-indigo-600 font-medium mb-0.5">Extra</div>
                                            <div className="text-sm font-semibold text-indigo-900">{record.extra_work_minutes}m</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Images */}
                            {(record.punch_in_image || record.punch_out_image) && (
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-slate-600 uppercase">Attendance Photos</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {record.punch_in_image && (
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Punch In</div>
                                                <img
                                                    src={record.punch_in_image}
                                                    alt="Punch In"
                                                    className="w-full h-28 object-contain rounded-lg border border-slate-200"
                                                />
                                            </div>
                                        )}
                                        {record.punch_out_image && (
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Punch Out</div>
                                                <img
                                                    src={record.punch_out_image}
                                                    alt="Punch Out"
                                                    className="w-full h-28 object-contain rounded-lg border border-slate-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Remarks */}
                            {!!record.remarks && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-amber-700 uppercase mb-1">Remarks</div>
                                    <div className="text-sm text-amber-900">{record.remarks}</div>
                                </div>
                            )}

                            {/* Regularization */}
                            {!!record.is_regularized && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-blue-700 uppercase mb-1">Regularization</div>
                                    <div className="text-sm text-blue-900">
                                        Status: <span className="font-semibold">{record.regularization_status || 'Pending'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Approval Timeline */}
                            {(record.approved_by_name || record.approved_at) && (
                                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-3">
                                    <div className="text-xs font-semibold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Approval Timeline
                                    </div>
                                    <div className="space-y-2">
                                        {record.approved_by_name && (
                                            <div className="flex items-start gap-2">
                                                <div className="text-xs text-slate-500 min-w-[80px]">Approved By:</div>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {record.approved_by_name}
                                                    {record.approved_by_role && (
                                                        <span className="ml-2 text-xs text-slate-500 font-normal">({record.approved_by_role})</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {record.approved_at && (
                                            <div className="flex items-start gap-2">
                                                <div className="text-xs text-slate-500 min-w-[80px]">Approved At:</div>
                                                <div className="text-sm text-slate-700">
                                                    {formatDate(record.approved_at)} at {formatTime(record.approved_at)}
                                                </div>
                                            </div>
                                        )}
                                        {record.regularization_status && (
                                            <div className="flex items-start gap-2">
                                                <div className="text-xs text-slate-500 min-w-[80px]">Status:</div>
                                                <div className="flex items-center gap-1.5">
                                                    {record.regularization_status === 'Approved' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                                    {record.regularization_status === 'Rejected' && <XCircle className="w-4 h-4 text-rose-600" />}
                                                    {record.regularization_status === 'Pending' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                                                    <span className={`text-sm font-semibold ${record.regularization_status === 'Approved' ? 'text-emerald-700' :
                                                        record.regularization_status === 'Rejected' ? 'text-rose-700' :
                                                            'text-amber-700'
                                                        }`}>
                                                        {record.regularization_status}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Timeline (Breaks & Outside Work) */}
                            {record.sessions && record.sessions.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                    <div className="text-xs font-semibold text-slate-600 uppercase">Timeline</div>
                                    <div className="space-y-2">
                                        {record.sessions.map((session: any, idx: number) => {
                                            const isBreak = session.session_type === 'break';
                                            const isOutside = session.session_type === 'outside_work';
                                            const duration = session.duration_minutes || 0;

                                            return (
                                                <div key={idx} className={`relative pl-4 border-l-2 ${isBreak ? 'border-amber-200' : 'border-cyan-200'} pb-4 last:pb-0`}>
                                                    <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full ${isBreak ? 'bg-amber-400' : 'bg-cyan-400'}`}></div>
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className={`text-sm font-medium ${isBreak ? 'text-amber-900' : 'text-cyan-900'}`}>
                                                                {isBreak ? 'Break' : 'Outside Work'}
                                                            </div>
                                                            <div className="text-xs text-slate-500 mt-0.5">
                                                                {formatTime(session.start_time)} - {session.end_time ? formatTime(session.end_time) : 'Ongoing'}
                                                            </div>
                                                            {session.notes && (
                                                                <div className="text-xs text-slate-600 mt-1 italic">"{session.notes}"</div>
                                                            )}
                                                        </div>
                                                        <div className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                            {Math.floor(duration / 60)}h {duration % 60}m
                                                        </div>
                                                    </div>

                                                    {/* Outside Work Location Map */}
                                                    {isOutside && session.location_lat && session.location_lng && (
                                                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 h-24 w-full">
                                                            <iframe
                                                                width="100%"
                                                                height="100%"
                                                                frameBorder="0"
                                                                src={`https://www.google.com/maps?q=${session.location_lat},${session.location_lng}&output=embed&z=15`}
                                                                allowFullScreen
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Location Maps */}
                        {((record.punch_in_lat && record.punch_in_lng) ||
                            (record.punch_out_lat && record.punch_out_lng)) && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-600" />
                                        <div className="text-xs font-semibold text-slate-600 uppercase">Locations</div>
                                    </div>

                                    {/* Punch In Location */}
                                    {record.punch_in_lat && record.punch_in_lng && (
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-blue-600 uppercase">Punch In Location</div>
                                            <div className="rounded-lg overflow-hidden border border-slate-200">
                                                <iframe
                                                    width="100%"
                                                    height="180"
                                                    frameBorder="0"
                                                    src={`https://www.google.com/maps?q=${record.punch_in_lat},${record.punch_in_lng}&output=embed`}
                                                    allowFullScreen
                                                />
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {record.punch_in_lat}, {record.punch_in_lng}
                                            </div>
                                        </div>
                                    )}

                                    {/* Punch Out Location */}
                                    {record.punch_out_lat && record.punch_out_lng && (
                                        <div className="space-y-2">
                                            <div className="text-xs font-medium text-purple-600 uppercase">Punch Out Location</div>
                                            <div className="rounded-lg overflow-hidden border border-slate-200">
                                                <iframe
                                                    width="100%"
                                                    height="180"
                                                    src={`https://www.google.com/maps?q=${record.punch_out_lat},${record.punch_out_lng}&output=embed`}
                                                    allowFullScreen
                                                />
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {record.punch_out_lat}, {record.punch_out_lng}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                    </div>
                </div>

                {/* Footer with Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0 rounded-b-xl">
                    {hasEditPerm && !showOverride && locked && (
                        <button
                            disabled
                            className="px-4 py-2 text-sm font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-2 cursor-not-allowed"
                        >
                            <Lock className="w-4 h-4 text-slate-400" />
                            Locked
                        </button>
                    )}
                    {hasEditPerm && !showOverride && !locked && (
                        <button
                            onClick={() => setShowOverride(true)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Edit className="w-4 h-4 text-slate-500" />
                            Override Status
                        </button>
                    )}
                    {/* Regularization Approve/Reject Buttons */}
                    {(isOrgAdmin || hasHrMode) && record.is_regularized && record.regularization_status === 'Pending' && !showRegularizeAction && (
                        <>
                            <button
                                onClick={() => {
                                    setRegularizeAction('approve');
                                    setShowRegularizeAction(true);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve Regularization
                            </button>
                            <button
                                onClick={() => {
                                    setRegularizeAction('reject');
                                    setShowRegularizeAction(true);
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <XCircle className="w-4 h-4" />
                                Reject Regularization
                            </button>
                        </>
                    )}
                    {/* Delete Action (Org Admin) */}
                    {isOrgAdmin && !locked && (
                        <button
                            onClick={async () => {
                                if (confirm("Are you sure you want to DELETE this attendance record? This action cannot be undone.")) {
                                    try {
                                        setLoading(true);
                                        await apiClient(`/attendance/${record.attendance_id || record.id}`, {
                                            method: 'DELETE',
                                            withAuth: true
                                        });
                                        alert("Record deleted successfully");
                                        onClose();
                                        if (onUpdate) onUpdate();
                                    } catch (e: any) {
                                        alert("Failed to delete: " + e.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            disabled={loading || showOverride}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

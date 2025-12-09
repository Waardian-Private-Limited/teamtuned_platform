import React from "react";
import {
    X,
    Clock,
    MapPin,
    CheckCircle2,
    AlertCircle,
    XCircle,
    TrendingUp
} from "lucide-react";

type Props = {
    record: any;
    onClose: () => void;
};

export default function AttendanceDetailsModal({ record, onClose }: Props) {
    if (!record) return null;

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
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-4 flex items-center justify-between">
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
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[calc(90vh-80px)]">
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
            </div>
        </div>
    );
}

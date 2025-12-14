import React, { useEffect, useState } from 'react';
import { AttendanceSummary } from '@/types/attendance';

interface AttendanceTimerProps {
    summary: AttendanceSummary;
}

const AttendanceTimer: React.FC<AttendanceTimerProps> = ({ summary }) => {
    const [elapsed, setElapsed] = useState<string>("00:00:00");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Only run timer if checked in and not checked out
        if (!summary.checked_in || summary.checked_out) {
            if (summary.total_work_minutes > 0) {
                const totalMs = summary.total_work_minutes * 60 * 1000;
                const hours = Math.floor(totalMs / 3600000);
                const mins = Math.floor((totalMs % 3600000) / 60000);
                const secs = Math.floor((totalMs % 60000) / 1000);
                setElapsed(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
            } else {
                setElapsed("00:00:00");
            }
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            let liveWorkedMs = 0;

            const punchInTime = summary.punch_in_time ? new Date(summary.punch_in_time).getTime() : 0;
            const totalBreakMs = (summary.total_break_minutes || 0) * 60 * 1000;
            const isOnBreak = summary.active_session_type === 'break';

            if (punchInTime > 0) {
                // Update timer loop logic
                // ... (I need to replace the updateTimer function body or specific section)

                // Actually, I'll replace the full updateTimer function logic or the block inside.

                // Let's replace lines 36-62 logic.

                /* Timer Logic Replacement */
                if (isOnBreak && summary.break_start_time) {
                    // Break Countdown Logic
                    let targetEnd = 0;
                    if (summary.strict_return && summary.strict_return_time) {
                        targetEnd = new Date(summary.strict_return_time).getTime();
                    } else {
                        const duration = summary.break_approved_duration || 60;
                        const start = new Date(summary.break_start_time).getTime();
                        targetEnd = start + duration * 60000;
                    }

                    const diff = targetEnd - now;
                    const isOverdue = diff < 0;
                    const absMs = Math.abs(diff);

                    const h = Math.floor(absMs / 3600000);
                    const m = Math.floor((absMs % 3600000) / 60000);
                    const s = Math.floor((absMs % 60000) / 1000);

                    setElapsed(`${isOverdue ? '-' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);

                    // Progress for break (optional, or just set 0/100)
                    setProgress(isOverdue ? 100 : 50); // Simplified
                } else {
                    // Working live
                    liveWorkedMs = Math.max(0, (now - punchInTime) - totalBreakMs);

                    const totalSec = Math.floor(liveWorkedMs / 1000);
                    const h = Math.floor(totalSec / 3600);
                    const m = Math.floor((totalSec % 3600) / 60);
                    const s = totalSec % 60;

                    setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);

                    if (summary.expected_minutes > 0) {
                        const p = Math.min(100, (liveWorkedMs / (summary.expected_minutes * 60 * 1000)) * 100);
                        setProgress(p);
                    }
                }
            } else {
                // Fallback (Not checked in)
                liveWorkedMs = (summary.total_work_minutes || 0) * 60 * 1000;
                const totalSec = Math.floor(liveWorkedMs / 1000);
                // ... (Format logic repeated? I should reuse formatting if possible)
                // Just keep existing fallback logic structure
                const totalSec2 = Math.floor(liveWorkedMs / 1000);
                const h = Math.floor(totalSec2 / 3600);
                const m = Math.floor((totalSec2 % 3600) / 60);
                const s = totalSec2 % 60;
                setElapsed(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
            }

        };

        const interval = setInterval(updateTimer, 1000);
        updateTimer(); // Initial call

        return () => clearInterval(interval);
    }, [summary]);

    const getStatusColor = () => {
        if (summary.status_label.includes('Late')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if (summary.status_label.includes('Overtime')) return 'bg-purple-100 text-purple-700 border-purple-200';
        if (summary.status_label.includes('Present') || summary.status_label.includes('Working')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (summary.status_label === 'Week Off' || summary.status_label === 'Holiday') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (summary.status_label === 'Absent') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const isWorking = summary.checked_in && !summary.checked_out && summary.active_session_type !== 'break';
    const isOnBreak = summary.active_session_type === 'break';
    const isOffDay = summary.status_label === 'Week Off' || summary.status_label === 'Holiday';

    // Helper to safely format time or return fallback
    const formatTime = (isoString: string | null | undefined, fallback: string = '--:--') => {
        if (!isoString) return fallback;
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return fallback;
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Safe Shift End handling
    const shiftEndDisplay = (() => {
        // 1. Try expected_shift_end (dynamic adjustment)
        if (summary.expected_shift_end) return formatTime(summary.expected_shift_end); // e.g. "06:30 PM"

        // 2. Try static shift_end (could be '18:30:00' or ISO)
        if (summary.shift_end) {
            // Check if it's a full ISO string
            if (summary.shift_end.includes('T')) return formatTime(summary.shift_end);
            // If it's just 'HH:MM:SS', prepend dummy date
            return formatTime(`1970-01-01T${summary.shift_end}`);
        }
        return '--:--';
    })();

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-md">

            {/* Animated Pulse for working state */}
            {isWorking && (
                <span className="absolute top-6 right-6 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            )}

            {/* Status Badge */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Today's Attendance</h2>
                    <p className="text-sm text-gray-500">{new Date(summary.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()} transition-colors duration-300`}>
                    {summary.status_label}
                </span>
            </div>

            {/* Timer Circle */}
            <div className="flex flex-col items-center justify-center mb-8 relative">

                {/* SVG Progress Circle */}
                <div className="relative w-48 h-48 transition-all duration-500 transform scale-100 hover:scale-105">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke="#f1f5f9"
                            strokeWidth="8"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={isOffDay ? "#cbd5e1" : (isWorking ? "#3b82f6" : (isOnBreak ? "#a855f7" : "#64748b"))}
                            strokeWidth="8"
                            strokeDasharray="283"
                            strokeDashoffset={283 - (283 * progress) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                            style={{ filter: isWorking ? 'drop-shadow(0px 0px 4px rgba(59, 130, 246, 0.5))' : 'none' }}
                        />
                    </svg>

                    {/* Timer Text Centered */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-4xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${isWorking ? 'text-gray-900' : 'text-gray-400'}`}>
                            {elapsed}
                        </span>
                        <span className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">
                            {isOnBreak ? (summary.strict_return ? 'STRICT RETURN' : 'ON BREAK') : (isOffDay ? 'DAY OFF' : 'WORK HOURS')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 transition-colors hover:bg-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Punch In</div>
                    <div className="font-semibold text-gray-900">
                        {formatTime(summary.punch_in_time)}
                    </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 transition-colors hover:bg-gray-100">
                    <div className="text-xs text-gray-500 mb-1">Punch Out</div>
                    <div className="font-semibold text-gray-900">
                        {formatTime(summary.punch_out_time)}
                    </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 col-span-2 flex justify-between items-center transition-colors hover:bg-gray-100">
                    <div>
                        <div className="text-xs text-gray-500">Shift End</div>
                        <div className="font-medium text-gray-900">
                            {shiftEndDisplay}
                        </div>
                    </div>
                    {summary.late_by_minutes > 0 && (
                        <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded animate-pulse">
                            Late by {summary.late_by_minutes}m
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default AttendanceTimer;

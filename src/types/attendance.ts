export interface AttendanceSummary {
    attendance_id: number | null;
    date: string;
    effective_attendance_date: string;
    status_label: string;
    status_timeline: any[]; // You can refine this if timeline structure is known

    // Active session info
    active_session_type: string | null;
    break_start_time: string | null;
    active_session_start: string | null;
    total_break_minutes: number;
    total_outside_work_minutes: number;
    break_timeline: any[];

    // Shift information
    shift_start: string | null;
    shift_end: string | null;
    grace_minutes: number;
    expected_shift_end: string | null;
    expected_end: string | null;

    // Work calculations
    expected_minutes: number;
    total_work_minutes: number;
    remaining_minutes: number;
    extra_work_minutes: number;

    // Late/Redeem
    late_by_minutes: number;
    adjusted_late_by: number;
    redeem_applied_minutes: number;

    // Status flags
    checked_in: boolean;
    checked_out: boolean;

    // Punch details
    punch_in_time: string | null;
    punch_out_time: string | null;
    punch_in_image: string | null;
    punch_out_image: string | null;
    punch_in_lat: number | null;
    punch_in_lng: number | null;
    punch_out_lat: number | null;
    punch_out_lng: number | null;
    punch_in_site_name: string | null;
    punch_out_site_name: string | null;

    // Holiday/Weekly Off
    is_holiday_today: boolean;
    is_weekly_off_today: boolean;
    holiday_name: string | null;
}

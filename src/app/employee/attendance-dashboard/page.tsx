"use client";

import AttendanceDashboard from "@/components/attendance/AttendanceDashboard";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeAttendanceDashboardPage() {
    return (
        <RouteGuard requiredPermissions={["ATTEND_VIEW"]} requireAny>
            <AttendanceDashboard />
        </RouteGuard>
    );
}

"use client";

import EmployeeAttendance from "@/components/attendance/EmployeeAttendance";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeAttendancePage() {
  return (
    <RouteGuard requiredPermissions={["ATTEND_VIEW", "ATTEND_ADD", "ATTEND_EDIT"]} requireAny>
      <EmployeeAttendance defaultHQ={false} showHQToggle={true} />
    </RouteGuard>
  );
}
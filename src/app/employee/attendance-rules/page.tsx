"use client";

import AttendanceRulesManager from "@/components/org/AttendanceRulesManager";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeAttendanceRulesPage() {
  return (
    <RouteGuard requiredPermissions={["ATTENDCONFIG_VIEW", "ATTENDCONFIG_ADD", "ATTENDCONFIG_EDIT", "ATTENDCONFIG_DELETE"]} requireAny>
      <AttendanceRulesManager />
    </RouteGuard>
  );
}
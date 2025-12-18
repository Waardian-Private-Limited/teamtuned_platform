"use client";

import AttendanceRulesManager from "@/components/org/AttendanceRulesManager";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeAttendanceRulesPage() {
  return (
    <RouteGuard requiredPermissions={["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE"]} requireAny>
      <AttendanceRulesManager />
    </RouteGuard>
  );
}
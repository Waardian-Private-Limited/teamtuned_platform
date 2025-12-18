"use client";

import AttendanceConfig from "@/components/org/AttendanceConfig";
import RouteGuard from "@/components/auth/RouteGuard";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["ATTENDCONFIG_VIEW", "ATTENDCONFIG_ADD", "ATTENDCONFIG_EDIT", "ATTENDCONFIG_DELETE"]} requireAny>
      <AttendanceConfig />
    </RouteGuard>
  );
}
"use client";

import { ShiftTemplatesPage } from "@/features/shift-templates/components/ShiftTemplatesPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeShiftTemplatesPage() {
  return (
    <RouteGuard
      requiredPermissions={["ATTENDCONFIG_VIEW", "ATTENDCONFIG_ADD", "ATTENDCONFIG_EDIT", "ATTENDCONFIG_DELETE"]}
      requireAny
    >
      <ShiftTemplatesPage />
    </RouteGuard>
  );
}

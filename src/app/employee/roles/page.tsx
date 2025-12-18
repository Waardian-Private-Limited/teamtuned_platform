"use client";

import RolesManager from "@/components/org/RolesManager";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeRolesPage() {
  return (
    <RouteGuard requiredPermissions={["ROLE_VIEW", "ROLE_ADD", "ROLE_EDIT", "ROLE_DELETE"]} requireAny>
      <RolesManager />
    </RouteGuard>
  );
}
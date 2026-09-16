"use client";

import { RolesPage } from "@/features/roles/components/RolesPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeRolesPage() {
  return (
    <RouteGuard requiredPermissions={["ROLE_VIEW", "ROLE_ADD", "ROLE_EDIT", "ROLE_DELETE"]} requireAny>
      <RolesPage />
    </RouteGuard>
  );
}

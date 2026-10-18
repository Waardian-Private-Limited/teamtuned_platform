"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { PositionCreatePage } from "@/features/recruitment/positions/components/PositionCreatePage";

export default function EmployeeNewPositionPage() {
  return (
    <RouteGuard requiredPermissions={["RECRUIT_MANAGE"]} requireAny fallbackPath="/employee/recruitment/positions">
      <PositionCreatePage />
    </RouteGuard>
  );
}

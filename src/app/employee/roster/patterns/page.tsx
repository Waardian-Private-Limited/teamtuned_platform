"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { ROSTER_ANY_PERMISSIONS } from "@/features/roster/constants/roster.constants";
import { PatternsPage } from "@/features/roster/components/patterns/PatternsPage";

export default function RosterPatternsPage() {
  return (
    <RouteGuard requiredPermissions={[...ROSTER_ANY_PERMISSIONS]} requireAny>
      <PatternsPage />
    </RouteGuard>
  );
}

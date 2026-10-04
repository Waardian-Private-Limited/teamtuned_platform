"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { ROSTER_ANY_PERMISSIONS } from "@/features/roster/constants/roster.constants";
import { InsightsPage } from "@/features/roster/components/insights/InsightsPage";

export default function RosterInsightsPage() {
  return (
    <RouteGuard requiredPermissions={[...ROSTER_ANY_PERMISSIONS]} requireAny>
      <InsightsPage />
    </RouteGuard>
  );
}

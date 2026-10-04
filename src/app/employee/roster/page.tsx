"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { ROSTER_ANY_PERMISSIONS } from "@/features/roster/constants/roster.constants";
import { RostersPage } from "@/features/roster/components/planner/RostersPage";

export default function RosterPlannerPage() {
  return (
    <RouteGuard requiredPermissions={[...ROSTER_ANY_PERMISSIONS]} requireAny>
      <RostersPage />
    </RouteGuard>
  );
}

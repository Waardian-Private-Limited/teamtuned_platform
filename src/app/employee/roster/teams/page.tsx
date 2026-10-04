"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { ROSTER_ANY_PERMISSIONS } from "@/features/roster/constants/roster.constants";
import { TeamsPage } from "@/features/roster/components/teams/TeamsPage";

export default function RosterTeamsPage() {
  return (
    <RouteGuard requiredPermissions={[...ROSTER_ANY_PERMISSIONS]} requireAny>
      <TeamsPage />
    </RouteGuard>
  );
}

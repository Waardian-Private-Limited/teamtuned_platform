"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { ROSTER_ANY_PERMISSIONS } from "@/features/roster/constants/roster.constants";
import { SkillsPage } from "@/features/roster/components/skills/SkillsPage";

export default function RosterSkillsPage() {
  return (
    <RouteGuard requiredPermissions={[...ROSTER_ANY_PERMISSIONS]} requireAny>
      <SkillsPage />
    </RouteGuard>
  );
}

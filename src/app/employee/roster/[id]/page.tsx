"use client";

import { useParams } from "next/navigation";
import RouteGuard from "@/components/auth/RouteGuard";
import { ROSTER_ANY_PERMISSIONS } from "@/features/roster/constants/roster.constants";
import { RosterBoardPage } from "@/features/roster/components/planner/RosterBoardPage";

export default function EmployeeRosterBoardRoute() {
  const params = useParams<{ id: string }>();
  return (
    <RouteGuard requiredPermissions={[...ROSTER_ANY_PERMISSIONS]} requireAny>
      <RosterBoardPage key={params.id} rosterId={Number(params.id)} />
    </RouteGuard>
  );
}

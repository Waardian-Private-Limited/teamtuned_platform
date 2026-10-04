"use client";

import { useParams } from "next/navigation";
import { RosterBoardPage } from "@/features/roster/components/planner/RosterBoardPage";

export default function OrgAdminRosterBoardRoute() {
  const params = useParams<{ id: string }>();
  return <RosterBoardPage key={params.id} rosterId={Number(params.id)} />;
}

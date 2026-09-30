"use client";

import { useParams } from "next/navigation";
import RouteGuard from "@/components/auth/RouteGuard";
import { CyclePage } from "@/features/compensation/components/cycles/CyclePage";

export default function EmployeeCyclePage() {
  const params = useParams<{ id: string }>();
  return (
    <RouteGuard requiredPermissions={["COMP_VIEW", "COMP_ADD", "COMP_EDIT", "COMP_APPROVE", "HR_MODE"]} requireAny>
      <CyclePage key={params.id} cycleId={Number(params.id)} basePath="/employee/compensation?tab=appraisals" />
    </RouteGuard>
  );
}

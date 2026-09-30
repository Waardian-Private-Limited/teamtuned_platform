"use client";

import { useParams } from "next/navigation";
import { CyclePage } from "@/features/compensation/components/cycles/CyclePage";

export default function OrgAdminCyclePage() {
  const params = useParams<{ id: string }>();
  return <CyclePage key={params.id} cycleId={Number(params.id)} basePath="/org-admin/compensation?tab=appraisals" />;
}

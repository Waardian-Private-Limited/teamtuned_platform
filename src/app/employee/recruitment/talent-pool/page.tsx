"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { TalentPoolPage } from "@/features/recruitment/pool/components/TalentPoolPage";

export default function EmployeeTalentPoolPage() {
  return (
    <RouteGuard requiredFeature="TALENT_POOL_FEATURE" requiredPermissions={["RECRUIT_VIEW", "RECRUIT_MANAGE"]} requireAny>
      <TalentPoolPage />
    </RouteGuard>
  );
}

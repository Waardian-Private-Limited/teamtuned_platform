"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { TalentPoolPage } from "@/features/recruitment/pool/components/TalentPoolPage";

export default function OrgAdminTalentPoolPage() {
  return (
    <RouteGuard requiredFeature="TALENT_POOL_FEATURE">
      <TalentPoolPage />
    </RouteGuard>
  );
}

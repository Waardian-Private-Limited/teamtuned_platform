"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { OffersPage } from "@/features/recruitment/offers/components/OffersPage";

export default function EmployeeRecruitmentOffersPage() {
  return (
    <RouteGuard requiredPermissions={["RECRUIT_VIEW", "RECRUIT_OFFER", "RECRUIT_HIRE"]} requireAny>
      <OffersPage />
    </RouteGuard>
  );
}

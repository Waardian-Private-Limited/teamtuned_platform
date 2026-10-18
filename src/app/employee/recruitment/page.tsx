"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { RecruitmentOverviewPage } from "@/features/recruitment/overview/components/RecruitmentOverviewPage";

export default function EmployeeRecruitmentOverviewPage() {
  return (
    <RouteGuard requiredPermissions={["RECRUIT_VIEW", "RECRUIT_MANAGE", "RECRUIT_OFFER", "RECRUIT_HIRE", "RECRUIT_SETTINGS"]} requireAny>
      <RecruitmentOverviewPage />
    </RouteGuard>
  );
}

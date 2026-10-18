"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { RecruitmentSettingsPage } from "@/features/recruitment/settings/components/RecruitmentSettingsPage";

export default function EmployeeRecruitmentSettingsPage() {
  return (
    <RouteGuard requiredPermissions={["RECRUIT_SETTINGS"]} requireAny>
      <RecruitmentSettingsPage />
    </RouteGuard>
  );
}

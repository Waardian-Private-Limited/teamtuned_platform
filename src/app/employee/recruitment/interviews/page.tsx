"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import { InterviewsPage } from "@/features/recruitment/interviews/components/InterviewsPage";

export default function EmployeeRecruitmentInterviewsPage() {
  return (
    <RouteGuard requiredPermissions={["RECRUIT_VIEW", "RECRUIT_MANAGE"]} requireAny>
      <InterviewsPage />
    </RouteGuard>
  );
}

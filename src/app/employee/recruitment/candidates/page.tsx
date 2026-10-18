"use client";

import { Suspense } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import { CandidatesPage } from "@/features/recruitment/candidates/components/CandidatesPage";

export default function EmployeeCandidatesPage() {
  return (
    <RouteGuard requiredPermissions={["RECRUIT_VIEW", "RECRUIT_MANAGE", "RECRUIT_OFFER", "RECRUIT_HIRE", "RECRUIT_SETTINGS"]} requireAny>
      <Suspense fallback={null}>
        <CandidatesPage />
      </Suspense>
    </RouteGuard>
  );
}

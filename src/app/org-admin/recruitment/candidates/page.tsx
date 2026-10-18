"use client";

import { Suspense } from "react";
import { CandidatesPage } from "@/features/recruitment/candidates/components/CandidatesPage";

export default function OrgAdminCandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesPage />
    </Suspense>
  );
}

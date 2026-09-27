"use client";

import { Suspense } from "react";
import { PoliciesPage } from "@/features/policies/components/PoliciesPage";

export default function OrgAdminPoliciesPage() {
  return (
    <Suspense fallback={null}>
      <PoliciesPage />
    </Suspense>
  );
}

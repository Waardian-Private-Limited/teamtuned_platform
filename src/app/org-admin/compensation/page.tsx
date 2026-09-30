"use client";

import { Suspense } from "react";
import { CompensationPage } from "@/features/compensation/components/CompensationPage";

export default function OrgAdminCompensationPage() {
  return (
    <Suspense>
      <CompensationPage />
    </Suspense>
  );
}

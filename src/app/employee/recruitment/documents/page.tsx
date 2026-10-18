"use client";

import { Suspense } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import { DocumentCentrePage } from "@/features/document-centre/components/DocumentCentrePage";

// HR only: DOC_GENERATE or DOC_TEMPLATES_MANAGE (HR mode passes both).
export default function EmployeeDocumentCentrePage() {
  return (
    <RouteGuard requiredPermissions={["DOC_GENERATE", "DOC_TEMPLATES_MANAGE", "HR_MODE"]} requireAny>
      <Suspense fallback={null}>
        <DocumentCentrePage />
      </Suspense>
    </RouteGuard>
  );
}

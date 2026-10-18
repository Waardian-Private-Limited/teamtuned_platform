"use client";

import { Suspense } from "react";
import { DocumentCentrePage } from "@/features/document-centre/components/DocumentCentrePage";

export default function OrgAdminDocumentCentrePage() {
  return (
    <Suspense fallback={null}>
      <DocumentCentrePage />
    </Suspense>
  );
}

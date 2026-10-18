"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PositionPage } from "@/features/recruitment/positions/components/PositionPage";

// Not route-guarded: a hiring manager may open their own position; the API
// answers 403/404 otherwise and the page shows an empty state.
export default function EmployeePositionPage() {
  const { id } = useParams<{ id: string }>();
  const positionId = Number(id);
  return (
    <Suspense fallback={null}>
      <PositionPage key={positionId} positionId={positionId} />
    </Suspense>
  );
}

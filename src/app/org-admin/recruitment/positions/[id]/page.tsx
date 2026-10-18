"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { PositionPage } from "@/features/recruitment/positions/components/PositionPage";

export default function OrgAdminPositionPage() {
  const { id } = useParams<{ id: string }>();
  const positionId = Number(id);
  return (
    <Suspense fallback={null}>
      <PositionPage key={positionId} positionId={positionId} />
    </Suspense>
  );
}

"use client";

import { Suspense } from "react";
import { TimelinePage } from "@/features/tracking/components/TimelinePage";

export default function OrgAdminTrackingTimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelinePage />
    </Suspense>
  );
}

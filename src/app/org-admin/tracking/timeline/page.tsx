"use client";

import { Suspense } from "react";
import { TimelinePage } from "@/features/tracking/components/TimelinePage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingTimelinePage() {
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.VIEW]}>
      <Suspense fallback={null}>
        <TimelinePage />
      </Suspense>
    </TrackingAccessGate>
  );
}

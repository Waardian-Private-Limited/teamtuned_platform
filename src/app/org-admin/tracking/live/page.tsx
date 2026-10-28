"use client";

import { LiveMapPage } from "@/features/tracking/components/LiveMapPage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingLivePage() {
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.VIEW]}>
      <LiveMapPage />
    </TrackingAccessGate>
  );
}

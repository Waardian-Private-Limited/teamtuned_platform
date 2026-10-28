"use client";

import { VisitsPage } from "@/features/tracking/components/VisitsPage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingVisitsPage() {
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.TRIP_REVIEW, TRACKING_PERMISSIONS.VIEW]}>
      <VisitsPage />
    </TrackingAccessGate>
  );
}

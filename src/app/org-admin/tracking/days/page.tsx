"use client";

import { DaySummariesPage } from "@/features/tracking/components/DaySummariesPage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingDaysPage() {
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.VIEW]}>
      <DaySummariesPage />
    </TrackingAccessGate>
  );
}

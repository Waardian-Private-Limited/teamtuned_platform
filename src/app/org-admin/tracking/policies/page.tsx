"use client";

import { PoliciesPage } from "@/features/tracking/components/PoliciesPage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingPoliciesPage() {
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.POLICY, TRACKING_PERMISSIONS.ASSIGN, TRACKING_PERMISSIONS.VIEW]}>
      <PoliciesPage />
    </TrackingAccessGate>
  );
}

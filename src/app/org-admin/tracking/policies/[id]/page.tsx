"use client";

import { use } from "react";
import { PolicyEditorPage } from "@/features/tracking/components/PolicyEditorPage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.POLICY, TRACKING_PERMISSIONS.ASSIGN, TRACKING_PERMISSIONS.VIEW]}>
      <PolicyEditorPage policyId={Number(id)} />
    </TrackingAccessGate>
  );
}

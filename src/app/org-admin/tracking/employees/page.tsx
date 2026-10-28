"use client";

import { EmployeesAssignPage } from "@/features/tracking/components/EmployeesAssignPage";
import { TrackingAccessGate } from "@/features/tracking/components/TrackingAccessGate";
import { TRACKING_PERMISSIONS } from "@/features/tracking/constants/tracking.constants";

export default function OrgAdminTrackingEmployeesPage() {
  return (
    <TrackingAccessGate anyOf={[TRACKING_PERMISSIONS.ASSIGN, TRACKING_PERMISSIONS.VIEW]}>
      <EmployeesAssignPage />
    </TrackingAccessGate>
  );
}

"use client";

import { EmployeeDevicesPage } from "@/features/employee-devices/components/EmployeeDevicesPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeDeviceManagementPage() {
  return (
    <RouteGuard requiredPermissions={["EMP_DEVICE_MANAGEMENT"]}>
      <EmployeeDevicesPage />
    </RouteGuard>
  );
}

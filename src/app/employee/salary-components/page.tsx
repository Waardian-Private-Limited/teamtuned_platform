"use client";

import { PayrollSetupPage } from "@/features/payroll-setup/components/PayrollSetupPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function LegacyPayrollSetupPage() {
  return (
    <RouteGuard requiredPermissions={["SALARY_CONFIG_VIEW", "SALARY_CONFIG_ADD", "HR_MODE", "PAYROLL_ADMIN"]} requireAny>
      <PayrollSetupPage initialTab="components" />
    </RouteGuard>
  );
}

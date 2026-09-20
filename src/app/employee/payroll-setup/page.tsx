"use client";

import { PayrollSetupPage } from "@/features/payroll-setup/components/PayrollSetupPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeePayrollSetupPage() {
  return (
    <RouteGuard requiredPermissions={["SALARY_CONFIG_VIEW", "SALARY_CONFIG_ADD", "DEBIT_RULE_VIEW", "DEBIT_RULE_ADD", "HR_MODE", "PAYROLL_ADMIN"]} requireAny>
      <PayrollSetupPage />
    </RouteGuard>
  );
}

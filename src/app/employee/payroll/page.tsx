"use client";

import React from "react";
import PayrollManagement from "@/components/payroll/PayrollManagement";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeePayrollPage() {
  return (
    <RouteGuard requiredPermissions={["PAYROLL_VIEW", "HR_MODE"]} requireAny>
      <PayrollManagement />
    </RouteGuard>
  );
}
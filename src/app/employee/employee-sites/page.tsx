"use client";

import React from "react";
import EmployeeSiteAssignment from "@/components/employee/EmployeeSiteAssignment";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSitesPage() {
  return (
    <RouteGuard requiredPermissions={["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]} requireAny>
      <EmployeeSiteAssignment />
    </RouteGuard>
  );
}
"use client";

import React from "react";
import PettyCash from "@/components/org/PettyCash";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeePettyCashPage() {
  return (
    <RouteGuard requiredPermissions={["PETTY_CASH_ADMIN", "PETTY_CASH_VIEW", "PETTY_CASH_ADD"]} requireAny>
      <PettyCash />
    </RouteGuard>
  );
}
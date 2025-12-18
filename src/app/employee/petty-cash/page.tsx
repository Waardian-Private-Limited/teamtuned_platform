"use client";

import React from "react";
import PettyCash from "@/components/org/PettyCash";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeePettyCashPage() {
  return (
    <RouteGuard requiredPermissions={["WALLET_ADMIN", "WALLET_VIEW", "WALLET_ADD"]} requireAny>
      <PettyCash />
    </RouteGuard>
  );
}
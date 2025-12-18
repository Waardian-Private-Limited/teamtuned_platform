"use client";

import React from "react";
import WalletOverview from "@/components/org/WalletsOverview";
import RouteGuard from "@/components/auth/RouteGuard";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["WALLET_ADMIN", "EXPENSE_VIEW", "EXPENSE_ADD", "EXPENSE_EDIT", "EXPENSE_DELETE"]} requireAny>
      <WalletOverview />
    </RouteGuard>
  );
}

"use client";

import React from "react";
import WalletOverview from "@/components/org/WalletsOverview";
import RouteGuard from "@/components/auth/RouteGuard";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["WALLET_VIEW", "WALLET_ADD", "WALLET_TOPUP", "WALLET_WITHDRAW", "WALLET_TRANSFER", "EXPENSE_VIEW", "EXPENSE_ADD", "EXPENSE_EDIT", "EXPENSE_DELETE", "WALLET_ADMIN"]} requireAny>
      <WalletOverview />
    </RouteGuard>
  );
}

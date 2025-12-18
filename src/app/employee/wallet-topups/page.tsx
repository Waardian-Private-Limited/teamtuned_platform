"use client";

import React from "react";
import WalletTopups from "@/components/org/WalletTopups";
import RouteGuard from "@/components/auth/RouteGuard";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["WALLET_ADMIN", "WALLET_TOPUP"]} requireAny>
      <WalletTopups />
    </RouteGuard>
  );
}
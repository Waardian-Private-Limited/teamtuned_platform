"use client";

import React from "react";
import WalletConfig from "@/components/org/WalletConfig";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeWalletConfigPage() {
  return (
    <RouteGuard requiredPermissions={["WALLET_ADMIN"]} requireAny>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Wallet Configuration</h1>
        <p className="text-gray-600 mb-4">Manage wallet categories and settings.</p>
        <WalletConfig />
      </div>
    </RouteGuard>
  );
}

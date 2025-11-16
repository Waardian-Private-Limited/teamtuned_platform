"use client";

import React from "react";
import WalletExpenses from "@/components/org/WalletExpenses";
import { OrgProvider } from "@/components/shared/OrgContext";

export default function Page() {
  return (
    <OrgProvider>
      <div className="min-h-screen bg-slate-50">
        <WalletExpenses />
      </div>
    </OrgProvider>
  );
}
"use client";

import React, { Suspense } from "react";
import WalletExpenses from "@/components/org/WalletExpenses";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-0">Loading...</div>}>
      <WalletExpenses showBackButton={true} />
    </Suspense>
  );
}

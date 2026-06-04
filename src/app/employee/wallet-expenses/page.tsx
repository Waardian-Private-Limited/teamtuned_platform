import React, { Suspense } from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import WalletExpenses from "@/components/org/WalletExpenses";

export default function Page() {
  return (
    <RouteGuard requiredPermissions={["EXPENSE_VIEW", "EXPENSE_ADD", "EXPENSE_EDIT", "EXPENSE_DELETE"]} requireAny>
      <Suspense fallback={<div className="p-0">Loading...</div>}>
        <WalletExpenses showBackButton={true} />
      </Suspense>
    </RouteGuard>
  );
}

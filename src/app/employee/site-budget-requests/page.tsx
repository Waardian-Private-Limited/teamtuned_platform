"use client";

import SiteBudgetRequests from "@/components/site-budget/SiteBudgetRequests";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSiteBudgetRequestsPage() {
    return (
        <RouteGuard requiredPermissions={["BUDGET_REQUEST", "BUDGET_APPROVE"]} requireAny>
            <SiteBudgetRequests />
        </RouteGuard>
    );
}

"use client";

import SiteBudgetRequests from "@/components/site-budget/SiteBudgetRequests";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSiteBudgetRequestsPage() {
    return (
        <RouteGuard requiredPermissions={["SITE_BUDGET_VIEW", "SITE_BUDGET_REQUEST", "SITE_BUDGET_APPROVE"]} requireAny>
            <SiteBudgetRequests />
        </RouteGuard>
    );
}

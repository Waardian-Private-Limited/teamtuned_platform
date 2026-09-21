"use client";

import { SubOrganizationsPage } from "@/features/sub-organizations/components/SubOrganizationsPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeSubOrganizationsPage() {
    return (
        <RouteGuard requiredPermissions={["SITE_VIEW", "SITE_ADD", "SITE_EDIT", "SITE_DELETE"]} requireAny>
            <SubOrganizationsPage />
        </RouteGuard>
    );
}

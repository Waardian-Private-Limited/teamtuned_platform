"use client";

import OtherLocationsPage from "@/features/other-locations/components/OtherLocationsPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function OtherLocationsRoute() {
    return (
        <RouteGuard requiredPermissions={["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]} requireAny>
            <OtherLocationsPage />
        </RouteGuard>
    );
}

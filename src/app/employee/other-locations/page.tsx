"use client";

import OtherLocations from "@/components/org/OtherLocations";
import RouteGuard from "@/components/auth/RouteGuard";

export default function OtherLocationsPage() {
    return (
        <RouteGuard requiredPermissions={["EMPSITE_VIEW", "EMPLOYEE_ASSIGN_SITE"]} requireAny>
            <OtherLocations />
        </RouteGuard>
    );
}

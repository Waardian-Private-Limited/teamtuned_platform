"use client";

import CompOffRequests from "@/components/requests/CompOffRequests";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeCompOffsPage() {
    return (
        <RouteGuard requiredPermissions={["LEAVE_VIEW", "LEAVE_ADD", "LEAVE_EDIT", "LEAVE_APPROVE"]} requireAny>
            <CompOffRequests />
        </RouteGuard>
    );
}

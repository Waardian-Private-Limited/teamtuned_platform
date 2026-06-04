import RouteGuard from "@/components/auth/RouteGuard";
import NightOTRequests from "@/components/requests/NightOTRequests";

export default function EmployeeNightOTRequestsPage() {
    return (
        <RouteGuard requiredPermissions={["ATTREG_VIEW", "ATTREG_APPROVE"]} requireAny>
            <NightOTRequests defaultHQ={false} />
        </RouteGuard>
    );
}

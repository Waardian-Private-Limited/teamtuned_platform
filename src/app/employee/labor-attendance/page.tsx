import RouteGuard from "@/components/auth/RouteGuard";
import LaborAttendanceDashboard from "@/components/labor/LaborAttendanceDashboard";

export default function LaborAttendancePage() {
    return (
        <RouteGuard requiredPermissions={["LABOR_ATTEND_VIEW"]} requireAny>
            <LaborAttendanceDashboard />
        </RouteGuard>
    );
}

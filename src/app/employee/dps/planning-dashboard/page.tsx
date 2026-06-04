import RouteGuard from '@/components/auth/RouteGuard';
import DpsPlanningDashboard from '@/components/dps/DpsPlanningDashboard';

export default function EmployeePlanningDashboardPage() {
    return (
        <RouteGuard requiredPermissions={["DPR_VIEW", "DPR_ADMIN", "DPR_ADD", "DPR_EDIT"]} requireAny>
            <DpsPlanningDashboard />
        </RouteGuard>
    );
}

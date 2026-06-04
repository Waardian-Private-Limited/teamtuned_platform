import RouteGuard from '@/components/auth/RouteGuard';
import DpsCbdDashboard from '@/components/dps/DpsCbdDashboard';

export default function EmployeeCbdDashboardPage() {
    return (
        <RouteGuard requiredPermissions={["DPR_VIEW", "DPR_ADMIN", "DPR_ADD", "DPR_EDIT"]} requireAny>
            <DpsCbdDashboard />
        </RouteGuard>
    );
}

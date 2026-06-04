import RouteGuard from '@/components/auth/RouteGuard';
import DpsSchedule from '@/components/dps/DpsSchedule';

export default function EmployeeDpsSchedulePage() {
    return (
        <RouteGuard requiredPermissions={["DPR_VIEW", "DPR_ADMIN", "DPR_ADD", "DPR_EDIT"]} requireAny>
            <DpsSchedule basePath="/employee/dps" />
        </RouteGuard>
    );
}

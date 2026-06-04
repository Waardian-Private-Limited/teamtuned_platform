import RouteGuard from '@/components/auth/RouteGuard';
import DpsAssignments from '@/components/dps/DpsAssignments';

export default function EmployeeDpsAssignmentsPage() {
    return (
        <RouteGuard requiredPermissions={["DPR_VIEW", "DPR_ADMIN", "DPR_ADD", "DPR_EDIT"]} requireAny>
            <DpsAssignments />
        </RouteGuard>
    );
}

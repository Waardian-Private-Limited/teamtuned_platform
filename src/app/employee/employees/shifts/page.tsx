import RouteGuard from '@/components/auth/RouteGuard';
import ShiftManagement from '@/components/employee/ShiftManagement';

export default function ShiftsPage() {
    return (
        <RouteGuard requiredPermissions={["EMP_VIEW", "EMP_EDIT"]} requireAny>
            <ShiftManagement />
        </RouteGuard>
    );
}

import RouteGuard from '@/components/auth/RouteGuard';
import DepartmentMapper from '@/components/hr-operation/DepartmentMapper';

export const metadata = {
    title: 'Department Mapper | TeamTuned HR',
    description: 'Map departments to heads and approval workflows',
};

export default function EmployeeDepartmentMapperPage() {
    return (
        <RouteGuard requiredPermissions={["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE", "HR_MODE"]} requireAny>
            <div className="min-h-screen bg-gray-50/50">
                <DepartmentMapper />
            </div>
        </RouteGuard>
    );
}

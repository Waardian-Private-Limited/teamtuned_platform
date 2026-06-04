import RouteGuard from '@/components/auth/RouteGuard';
import OperationManagement from '@/components/hr-operation/OperationManagement';

export const metadata = {
    title: 'Operation Round | TeamTuned HR',
    description: 'Process assigned operation round interviews',
};

export default function EmployeeOperationRoundPage() {
    return (
        <RouteGuard requiredPermissions={["HR_VIEW", "RECRUITER_MODE", "HR_MODE"]} requireAny>
            <div className="min-h-screen bg-gray-50/50">
                <OperationManagement myOnly={true} />
            </div>
        </RouteGuard>
    );
}

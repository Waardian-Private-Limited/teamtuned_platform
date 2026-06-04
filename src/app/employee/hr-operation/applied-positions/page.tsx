import RouteGuard from '@/components/auth/RouteGuard';
import OrgAppliedPositions from '@/components/hr-operation/OrgAppliedPositions';

export default function Page() {
    return (
        <RouteGuard requiredPermissions={["HR_VIEW", "RECRUITER_MODE", "HR_MODE"]} requireAny>
            <OrgAppliedPositions />
        </RouteGuard>
    );
}

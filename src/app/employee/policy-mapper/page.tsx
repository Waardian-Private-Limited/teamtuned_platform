import RouteGuard from '@/components/auth/RouteGuard';
import PolicyMapper from '@/components/org/PolicyMapper';

export default function PolicyMapperPage() {
    return (
        <RouteGuard requiredPermissions={["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE"]} requireAny>
            <PolicyMapper />
        </RouteGuard>
    );
}

import RouteGuard from '@/components/auth/RouteGuard';
import DpsSubmissionsList from '@/components/dps/DpsSubmissionsList';

export default function CBDSubmissionsPage() {
    return (
        <RouteGuard requiredPermissions={["DPR_VIEW", "DPR_ADMIN", "DPR_ADD", "DPR_EDIT"]} requireAny>
            <DpsSubmissionsList formType="cbd" />
        </RouteGuard>
    );
}

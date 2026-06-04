import RouteGuard from '@/components/auth/RouteGuard';
import InterviewManagement from "@/components/hr-operation/InterviewManagement";

export default function OperationalInterviewsPage() {
    return (
        <RouteGuard requiredPermissions={["HR_VIEW", "RECRUITER_MODE", "HR_MODE"]} requireAny>
            <InterviewManagement myOnly={true} />
        </RouteGuard>
    );
}

import RouteGuard from '@/components/auth/RouteGuard';
import TechnicalQuestions from '@/components/hr-operation/TechnicalQuestions';

export default function TechnicalQuestionsPage() {
    return (
        <RouteGuard requiredPermissions={["HR_VIEW", "RECRUITER_MODE", "HR_MODE"]} requireAny>
            <TechnicalQuestions />
        </RouteGuard>
    );
}

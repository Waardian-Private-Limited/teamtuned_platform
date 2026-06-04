import RouteGuard from '@/components/auth/RouteGuard';
import OnboardingManagement from '@/components/hr-operation/OnboardingManagement';

export const metadata = {
    title: 'Onboarding | TeamTuned HR',
};

export default function EmployeeOnboardingPage() {
    return (
        <RouteGuard requiredPermissions={["HR_VIEW", "RECRUITER_MODE", "HR_MODE"]} requireAny>
            <div className="min-h-screen bg-gray-50/50">
                <OnboardingManagement />
            </div>
        </RouteGuard>
    );
}

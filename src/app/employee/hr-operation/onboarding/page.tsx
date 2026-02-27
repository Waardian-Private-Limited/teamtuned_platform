import React from 'react';
import OnboardingManagement from '@/components/hr-operation/OnboardingManagement';

export const metadata = {
    title: 'Onboarding | TeamTuned HR',
};

export default function EmployeeOnboardingPage() {
    return (
        <div className="min-h-screen bg-gray-50/50">
            <OnboardingManagement />
        </div>
    );
}

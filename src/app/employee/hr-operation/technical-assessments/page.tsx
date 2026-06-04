"use client";

import RouteGuard from "@/components/auth/RouteGuard";
import TechnicalAssessments from "@/components/hr-operation/TechnicalAssessments";

export default function TechnicalAssessmentsPage() {
    return (
        <RouteGuard requiredPermissions={["HR_VIEW", "RECRUITER_MODE", "HR_MODE"]} requireAny>
            <div className="p-8">
                <TechnicalAssessments />
            </div>
        </RouteGuard>
    );
}

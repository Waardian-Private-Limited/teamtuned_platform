"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import ApprovalWorkflowConfig from "@/components/org/ApprovalWorkflowConfig";
import { useAuth } from "@/context/AuthContext";
import TeamTunedLoader from "@/components/common/TeamTunedLoader";

export default function EmployeeApprovalWorkflowsPage() {
    const router = useRouter();
    const { permissions, loading, role } = useAuth();

    useEffect(() => {
        if (!loading) {
            // Check permissions
            // Allow OrgAdmin (though Layout might redirect them, checking here is safe)
            // Allow HR_MODE
            const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
            const hasHRMode = (permissions || []).some((p: string) => p === "HR_MODE");

            if (!isOrgAdmin && !hasHRMode) {
                router.push("/employee"); // Redirect unauthorized
            }
        }
    }, [loading, permissions, role, router]);

    if (loading) return <TeamTunedLoader />;

    // Double check render
    const isOrgAdmin = (role || "").toLowerCase() === "orgadmin";
    const hasHRMode = (permissions || []).some((p: string) => p === "HR_MODE");
    if (!isOrgAdmin && !hasHRMode) return null;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
                <p className="text-gray-500">Configure approval workflows for different request types.</p>
            </div>
            <ApprovalWorkflowConfig />
        </div>
    );
}

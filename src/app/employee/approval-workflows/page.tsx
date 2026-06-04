"use client";

import React from "react";
import ApprovalWorkflowConfig from "@/components/org/ApprovalWorkflowConfig";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeApprovalWorkflowsPage() {
    return (
        <RouteGuard requiredPermissions={["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE", "HR_MODE"]} requireAny requireOrgAdmin>
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Approval Workflows</h1>
                    <p className="text-gray-500">Configure approval workflows for different request types.</p>
                </div>
                <ApprovalWorkflowConfig />
            </div>
        </RouteGuard>
    );
}

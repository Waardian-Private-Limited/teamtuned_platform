"use client";
import React from 'react';
import ApprovalWorkflowConfig from "@/components/org/ApprovalWorkflowConfig";

export default function ApprovalWorkflowsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Approval Workflows</h1>
            <p className="text-gray-500 mb-6">
                Configure approval levels, approvers, and timelines for various request types.
            </p>
            <ApprovalWorkflowConfig />
        </div>
    );
}

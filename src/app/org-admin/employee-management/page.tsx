"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import EmployeeManagement from "@/components/employee/EmployeeManagement";

export default function EmployeeManagementPage() {
  const { organization, loading } = useAuth();

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Check if payroll feature is enabled
  const features = organization?.organization_features || [];
  const hasPayrollFeature = features.some((f) => f.code.toLowerCase() === "payroll_feature");

  if (!hasPayrollFeature) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">This feature is not enabled for your organization.</p>
        </div>
      </div>
    );
  }

  return <EmployeeManagement />;
}
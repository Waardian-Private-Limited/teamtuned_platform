"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import EmployeeSiteAssignment from "@/components/employee/EmployeeSiteAssignment";

export default function OrgAdminEmployeeSitesPage() {
  const router = useRouter();
  const { permissions, isAuthenticated, loading } = useAuth();

  // Handle loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.replace("/login");
    return null;
  }

  // Check permissions
  const isOrgAdmin = (useAuth().role || "").toLowerCase() === "orgadmin";
  const hasPermission = isOrgAdmin || permissions.includes("view_employee_sites") || permissions.includes("manage_employee_sites");

  if (!hasPermission) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <EmployeeSiteAssignment />;
}
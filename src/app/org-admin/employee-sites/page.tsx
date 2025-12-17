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

  return <EmployeeSiteAssignment />;
}
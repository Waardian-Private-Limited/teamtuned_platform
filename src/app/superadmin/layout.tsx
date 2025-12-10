"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import SuperadminShell from "@/components/superadmin/SuperadminShell";
import { useAuth } from "@/context/AuthContext";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, role, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    // Only superadmins allowed
    if (role !== "superAdmin") {
      const roleRoutes: Record<string, string> = {
        OrgAdmin: "/org-admin",
        Employee: "/employee",
      };

      const userRoute = role ? roleRoutes[role] : undefined;
      if (userRoute) {
        router.replace(userRoute);
      } else {
        logout();
      }
    }
  }, [isAuthenticated, role, loading, router, logout]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return <SuperadminShell>{children}</SuperadminShell>;
}
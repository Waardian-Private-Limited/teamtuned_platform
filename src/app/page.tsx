"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, role, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const roleRoutes: Record<string, string> = {
      superAdmin: "/superadmin",
      OrgAdmin: "/org-admin",
      Employee: "/employee",
    };

    const targetRoute = roleRoutes[role ?? ""] ?? "/login";
    router.push(targetRoute);
  }, [isAuthenticated, role, loading, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return null;
}
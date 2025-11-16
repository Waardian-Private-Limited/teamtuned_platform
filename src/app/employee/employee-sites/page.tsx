"use client";

import React from "react";
import dynamic from "next/dynamic";
import { apiClient } from "@/lib/apiClient";

const EmployeeSiteAssignment = dynamic(() => import("@/components/employee/EmployeeSiteAssignment"), { ssr: false });

export default function EmployeeSitesPage() {
  const [role, setRole] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{ authenticated: boolean; role?: string; employee?: { permissions?: string[] } | null }>("/auth/session", { method: "GET" });
        if (session?.authenticated) {
          setRole((session.role || null) as string | null);
          setPermissions(session.employee?.permissions || []);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const isEmployee = (role || "").toLowerCase() === "employee";
  const hasPerm = (code: string) => !isEmployee || (permissions || []).some((p) => (p || "").toUpperCase() === code.toUpperCase());

  if (loading) return <div className="text-sm text-gray-600">Loading...</div>;
  if (isEmployee && !hasPerm("EMPLOYEE_ASSIGN_SITE")) {
    return <div className="text-sm text-red-600">You do not have permission to assign sites to employees.</div>;
  }

  return <EmployeeSiteAssignment />;
}
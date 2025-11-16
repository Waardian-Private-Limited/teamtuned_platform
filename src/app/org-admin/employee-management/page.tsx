"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";
import EmployeeManagement from "@/components/employee/EmployeeManagement";

export default function EmployeeManagementPage() {
  const [features, setFeatures] = React.useState<{ id: number; code: string; name: string }[]>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const session = await apiClient<{ authenticated: boolean; organization_features?: { id: number; code: string; name: string }[] }>(
          "/auth/session",
          { method: "GET" }
        );
        if (session?.authenticated && session?.organization_features) {
          setFeatures(session.organization_features);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const hasFeature = (code: string) => {
    const lc = code.toLowerCase();
    return features.some((f) => (f.code || "").toLowerCase() === lc);
  };

  const enabled = hasFeature("payroll_system");

  return (
    <div>
      {!enabled ? (
        <div className="text-sm text-gray-600">This feature is not enabled for your organization.</div>
      ) : (
        <EmployeeManagement />
      )}
    </div>
  );
}
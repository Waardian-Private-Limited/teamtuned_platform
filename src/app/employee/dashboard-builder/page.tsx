"use client";

import React, { Suspense } from "react";
import DashboardBuilder from "@/components/tasks/DashboardBuilder";
import { useRouter } from "next/navigation";

import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeDashboardBuilderPage() {
  const router = useRouter();

  return (
    <RouteGuard requiredPermissions={["TASK_VIEW", "TASK_ADD", "TASK_EDIT", "TASK_DELETE"]} requireAny>
      <div className="min-h-screen bg-slate-50">
        <Suspense fallback={<div className="p-6">Loading dashboard builder...</div>}>
          <DashboardBuilder
            onBack={() => router.push('/employee/task-dashboard')}
          />
        </Suspense>
      </div>
    </RouteGuard>
  );
}
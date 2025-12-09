"use client";

import React, { Suspense } from "react";
import DashboardBuilder from "@/components/tasks/DashboardBuilder";
import { useRouter } from "next/navigation";

export default function EmployeeDashboardBuilderPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense fallback={<div className="p-6">Loading dashboard builder...</div>}>
        <DashboardBuilder
          onBack={() => router.push('/employee/task-dashboard')}
        />
      </Suspense>
    </div>
  );
}
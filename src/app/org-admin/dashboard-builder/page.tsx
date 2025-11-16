"use client";

import React from "react";
import DashboardBuilder from "@/components/tasks/DashboardBuilder";
import { useRouter } from "next/navigation";

export default function OrgAdminDashboardBuilderPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardBuilder 
        onBack={() => router.push('/org-admin/task-dashboard')}
      />
    </div>
  );
}
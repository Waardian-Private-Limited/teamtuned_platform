"use client";

import React from "react";
import TaskDashboard from "@/components/tasks/TaskDashboard";

export default function OrgTaskDashboardPage() {
  return (
    <div className="p-3">
      <TaskDashboard scope="org" />
    </div>
  );
}


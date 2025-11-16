"use client";

import React from "react";
import TaskDashboard from "@/components/tasks/TaskDashboard";

export default function EmployeeTaskDashboardPage() {
  return (
    <div className="p-3">
      <TaskDashboard scope="my" />
    </div>
  );
}


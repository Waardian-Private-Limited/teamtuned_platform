"use client";

import React from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import TaskAssignments from "@/components/tasks/TaskAssignments";

export default function EmployeeTaskAssignmentsPage() {
  return (
    <RouteGuard requiredPermissions={["TASK_VIEW", "TASK_ADD", "TASK_EDIT", "TASK_DELETE"]} requireAny>
      <TaskAssignments role="employee" />
    </RouteGuard>
  );
}
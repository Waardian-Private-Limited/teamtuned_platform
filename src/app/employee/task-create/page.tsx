"use client";
import React from "react";
import RouteGuard from "@/components/auth/RouteGuard";
import TaskCreate from "@/components/tasks/TaskCreate";

export default function EmployeeTaskCreatePage() {
  return (
    <RouteGuard requiredPermissions={["TASK_VIEW", "TASK_ADD", "TASK_EDIT", "TASK_DELETE"]} requireAny>
      <div>
        <TaskCreate />
      </div>
    </RouteGuard>
  );
}
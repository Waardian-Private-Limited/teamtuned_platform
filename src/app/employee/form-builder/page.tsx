"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FormBuilder from "@/components/formbuilder/FormBuilder";

function FormBuilderContent() {
  const router = useRouter();
  const params = useSearchParams();
  const templateId = params.get("id") || undefined;
  const templateName = params.get("name") || "Form Builder";
  const templateDescription = params.get("description") || "";

  return (
    <FormBuilder
      templateId={templateId}
      templateName={templateName}
      templateDescription={templateDescription}
      onBack={() => {
        router.push(`/employee/tasks`);
      }}
      onDirtyChange={() => { }}
    />
  );
}

import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeFormBuilderPage() {
  return (
    <RouteGuard requiredPermissions={["TASK_VIEW", "TASK_ADD", "TASK_EDIT", "TASK_DELETE"]} requireAny>
      <Suspense fallback={<div className="p-6">Loading form builder...</div>}>
        <FormBuilderContent />
      </Suspense>
    </RouteGuard>
  );
}
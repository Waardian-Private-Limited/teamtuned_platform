"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FormBuilder from "@/components/formbuilder/FormBuilder";

export default function EmployeeFormBuilderPage() {
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
      onDirtyChange={() => {}}
    />
  );
}
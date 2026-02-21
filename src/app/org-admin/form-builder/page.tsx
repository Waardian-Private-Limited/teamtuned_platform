"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FormBuilder from "@/components/formbuilder/FormBuilder";

export default function FormBuilderPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [dirty, setDirty] = React.useState(false);
  const id = params.get("id") || undefined;
  const isAnalyzed = params.get("analyzed") === "true";
  const name = params.get("name") || "Untitled Template";
  const description = params.get("description") || "";

  return (
    <div className="h-screen w-full bg-slate-50">
      <FormBuilder
        templateId={id}
        templateName={name}
        templateDescription={description}
        onDirtyChange={setDirty}
        onBack={() => router.push("/org-admin/form-builder/library")}
        customApiUrl={isAnalyzed ? `/form-builder/templates/${id}` : undefined}
        customSaveUrl={isAnalyzed ? `/form-builder/templates/${id}` : undefined}
      />
    </div>
  );
}
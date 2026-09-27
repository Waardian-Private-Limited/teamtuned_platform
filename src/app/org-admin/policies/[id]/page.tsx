"use client";

import { use } from "react";
import { PolicyEditorPage } from "@/features/policies/components/editor/PolicyEditorPage";

export default function OrgAdminPolicyEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PolicyEditorPage policyId={Number(id)} />;
}

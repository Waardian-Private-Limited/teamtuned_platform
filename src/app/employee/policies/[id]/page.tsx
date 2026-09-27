"use client";

import { use } from "react";
import { PolicyEditorPage } from "@/features/policies/components/editor/PolicyEditorPage";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeePolicyEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <RouteGuard requiredPermissions={["POLICY_VIEW", "POLICY_ADD", "POLICY_EDIT", "POLICY_DELETE"]} requireAny>
      <PolicyEditorPage policyId={Number(id)} />
    </RouteGuard>
  );
}

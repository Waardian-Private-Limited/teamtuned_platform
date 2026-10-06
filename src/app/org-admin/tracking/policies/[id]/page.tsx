"use client";

import { use } from "react";
import { PolicyEditorPage } from "@/features/tracking/components/PolicyEditorPage";

export default function OrgAdminTrackingPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PolicyEditorPage policyId={Number(id)} />;
}

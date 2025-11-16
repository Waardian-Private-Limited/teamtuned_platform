import React from "react";
import SuperadminOrganizations from "@/components/superadmin/SuperadminOrganizations";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <SuperadminOrganizations />;
}
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Replaced by the versioned policy platform. Kept as a redirect so old
// bookmarks/links land on the new page instead of 404ing.
export default function OrgAdminAttendanceRulesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/org-admin/policies");
  }, [router]);
  return null;
}

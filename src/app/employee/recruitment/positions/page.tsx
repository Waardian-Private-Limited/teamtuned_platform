"use client";

import { PositionsPage } from "@/features/recruitment/positions/components/PositionsPage";

// Not route-guarded: hiring managers without RECRUIT_* reach their own
// positions here ("Mine"); the API decides and a 403 renders an empty state.
export default function EmployeePositionsPage() {
  return <PositionsPage />;
}

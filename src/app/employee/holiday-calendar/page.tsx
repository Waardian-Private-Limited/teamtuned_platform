"use client";

import HolidayCalendarManager from "@/components/org/HolidayCalendarManager";
import RouteGuard from "@/components/auth/RouteGuard";

export default function EmployeeHolidayCalendarPage() {
  return (
    <RouteGuard requiredPermissions={["HOLIDAY_VIEW", "HOLIDAY_ADD", "HOLIDAY_EDIT", "HOLIDAY_DELETE"]} requireAny>
      <HolidayCalendarManager />
    </RouteGuard>
  );
}
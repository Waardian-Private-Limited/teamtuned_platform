import EmployeeAttendance from "@/components/attendance/EmployeeAttendance";

export default function EmployeeAttendancePage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">Attendance</h1>
        <p className="mt-1 text-sm text-gray-600">Your site-based employee attendance management.</p>
      </div>
      <EmployeeAttendance defaultHQ={false} showHQToggle={true} />
    </div>
  );
}
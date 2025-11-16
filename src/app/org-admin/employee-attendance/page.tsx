import EmployeeAttendance from "@/components/attendance/EmployeeAttendance";

export default function EmployeeAttendancePage() {
  return (
    <div>
      <div>
        <h1 className="text-2xl font-semibold">Employee Attendance</h1>
        <p className="mt-1 text-sm text-gray-600">View and manage employee attendance records across sites.</p>
        <p className="mt-1 text-sm text-gray-600"></p>
      </div>
      <EmployeeAttendance defaultHQ={true} showHQToggle={true} />
    </div>
  );
}
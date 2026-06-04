import RouteGuard from "@/components/auth/RouteGuard";
import TaskDashboard from "@/components/tasks/TaskDashboard";

export default function EmployeeTaskDashboardPage() {
  return (
    <RouteGuard requiredPermissions={["TASK_VIEW", "TASK_ADD", "TASK_EDIT", "TASK_DELETE"]} requireAny>
      <div className="p-3">
        <TaskDashboard scope="my" />
      </div>
    </RouteGuard>
  );
}


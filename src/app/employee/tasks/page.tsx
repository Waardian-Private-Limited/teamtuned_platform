import RouteGuard from "@/components/auth/RouteGuard";
import TaskTemplates from "@/components/formbuilder/TaskTemplates";

export default function EmployeeTasksPage() {
  return (
    <RouteGuard requiredPermissions={["TASK_VIEW", "TASK_ADD", "TASK_EDIT", "TASK_DELETE"]} requireAny>
      <TaskTemplates basePath="/employee" />
    </RouteGuard>
  );
}

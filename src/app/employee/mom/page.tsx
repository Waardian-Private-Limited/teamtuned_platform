import RouteGuard from '@/components/auth/RouteGuard';
import MomDashboardComponent from "@/components/mom/MomDashboard";

export default function EmployeeMomDashboard() {
    return (
        <RouteGuard requiredPermissions={["MOM_VIEW", "MOM_ADD", "MOM_EDIT"]} requireAny>
            <MomDashboardComponent basePath="/employee/mom" />
        </RouteGuard>
    );
}

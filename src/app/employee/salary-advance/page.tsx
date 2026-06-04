import RouteGuard from "@/components/auth/RouteGuard";
import SalaryAdvanceDashboard from "@/components/salary-advance/SalaryAdvanceDashboard";

export default function EmployeeSalaryAdvancePage() {
    return (
        <RouteGuard requiredPermissions={["SALADV_VIEW", "SALADV_PAY"]} requireAny>
            <SalaryAdvanceDashboard />
        </RouteGuard>
    );
}

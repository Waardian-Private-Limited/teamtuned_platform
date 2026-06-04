import RouteGuard from "@/components/auth/RouteGuard";
import SalarySlipGenerator from "@/components/payroll/SalarySlipGenerator";

export default function EmployeeSalarySlipsPage() {
    return (
        <RouteGuard requiredPermissions={["SLIP_VIEW", "SLIP_ADD", "SLIP_EDIT", "SLIP_DELETE"]} requireAny>
            <SalarySlipGenerator />
        </RouteGuard>
    );
}

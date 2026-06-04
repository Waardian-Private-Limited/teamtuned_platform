import RouteGuard from "@/components/auth/RouteGuard";
import SalaryBulkImport from "@/components/employee/SalaryBulkImport";

export default function SalaryImportPage() {
    return (
        <RouteGuard 
            requiredFeature="PAYROLL_FEATURE"
            requiredPermissions={["PAYROLL_VIEW", "PAYROLL_ADD", "PAYROLL_EDIT", "PAYROLL_DELETE", "HR_MODE"]} 
            requireAny
        >
            <SalaryBulkImport />
        </RouteGuard>
    );
}

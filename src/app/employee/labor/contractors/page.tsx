import RouteGuard from "@/components/auth/RouteGuard";
import LaborContractorsManager from "@/components/org/labor/LaborContractorsManager";

export default function LaborContractorsPage() {
    return (
        <RouteGuard requiredPermissions={["LABOR_CONTRACTOR_VIEW", "LABOR_CONTRACTOR_ADD", "LABOR_CONTRACTOR_EDIT", "LABOR_CONTRACTOR_DELETE"]} requireAny>
            <div>
                <LaborContractorsManager />
            </div>
        </RouteGuard>
    );
}

import RouteGuard from "@/components/auth/RouteGuard";
import LaborCategoriesManager from "@/components/org/labor/LaborCategoriesManager";

export default function LaborCategoriesPage() {
    return (
        <RouteGuard requiredPermissions={["LABOR_CAT_VIEW", "LABOR_CAT_ADD", "LABOR_CAT_EDIT", "LABOR_CAT_DELETE"]} requireAny>
            <div>
                <LaborCategoriesManager />
            </div>
        </RouteGuard>
    );
}

import RouteGuard from "@/components/auth/RouteGuard";
import LaborSubcategoriesManager from "@/components/org/labor/LaborSubcategoriesManager";

export default function LaborSubcategoriesPage() {
    return (
        <RouteGuard requiredPermissions={["LABOR_CAT_VIEW", "LABOR_CAT_ADD", "LABOR_CAT_EDIT", "LABOR_CAT_DELETE"]} requireAny>
            <LaborSubcategoriesManager />
        </RouteGuard>
    );
}

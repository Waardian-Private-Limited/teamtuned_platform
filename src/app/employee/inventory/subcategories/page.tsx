import RouteGuard from "@/components/auth/RouteGuard";
import SubcategoryList from "@/components/inventory/SubcategoryList";

export default function EmployeeSubcategoriesPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <SubcategoryList />
        </RouteGuard>
    );
}

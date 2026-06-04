import RouteGuard from "@/components/auth/RouteGuard";
import LaborersManager from "@/components/org/labor/LaborersManager";

export default function LaborersPage() {
    return (
        <RouteGuard requiredPermissions={["LABORER_VIEW", "LABORER_ADD", "LABORER_EDIT", "LABORER_DELETE"]} requireAny>
            <div>
                <LaborersManager />
            </div>
        </RouteGuard>
    );
}

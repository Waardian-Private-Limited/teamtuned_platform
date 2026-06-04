import RouteGuard from "@/components/auth/RouteGuard";
import PrList from "@/components/pr/PrList";

export default function PrPage() {
    return (
        <RouteGuard requiredPermissions={["PR_VIEW"]} requireAny>
            <PrList />
        </RouteGuard>
    );
}

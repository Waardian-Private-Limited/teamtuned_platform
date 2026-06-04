import RouteGuard from "@/components/auth/RouteGuard";
import LaborRateCardsManager from "@/components/org/labor/LaborRateCardsManager";

export default function LaborRateCardsPage() {
    return (
        <RouteGuard requiredPermissions={["LABOR_RATE_VIEW", "LABOR_RATE_ADD", "LABOR_RATE_EDIT", "LABOR_RATE_DELETE", "LABOR_RATE_BULK_UPDATE"]} requireAny>
            <div>
                <LaborRateCardsManager />
            </div>
        </RouteGuard>
    );
}

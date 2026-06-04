import RouteGuard from "@/components/auth/RouteGuard";
import StockLedger from "@/components/inventory/StockLedger";

export default function StockLedgerPage() {
    return (
        <RouteGuard requiredPermissions={["INV_VIEW"]} requireAny>
            <StockLedger />
        </RouteGuard>
    );
}

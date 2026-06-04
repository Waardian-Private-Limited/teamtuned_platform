import LaborWalletLedger from "@/components/org/labor/LaborWalletLedger";
import RouteGuard from "@/components/auth/RouteGuard";

export const metadata = {
    title: "Labor Wallet Ledger | TeamTuned",
    description: "Monitor labor wallet balances and transactions",
};

export default function Page() {
    return (
        <RouteGuard requiredPermissions={["LABOR_ADMIN"]} requireAny>
            <LaborWalletLedger />
        </RouteGuard>
    );
}

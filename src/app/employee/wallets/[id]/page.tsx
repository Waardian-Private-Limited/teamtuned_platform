import RouteGuard from "@/components/auth/RouteGuard";
import WalletDetails from "@/components/org/WalletDetails";

export default async function WalletDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return (
        <RouteGuard requiredPermissions={["WALLET_VIEW", "WALLET_ADMIN"]} requireAny>
            <WalletDetails walletId={id} />
        </RouteGuard>
    );
}

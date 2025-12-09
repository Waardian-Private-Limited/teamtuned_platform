import WalletDetails from "@/components/org/WalletDetails";

export default async function WalletDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <WalletDetails walletId={id} />;
}

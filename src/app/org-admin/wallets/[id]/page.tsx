import WalletDetails from "@/components/org/WalletDetails";

export default function WalletDetailsPage({ params }: { params: { id: string } }) {
    return <WalletDetails walletId={params.id} />;
}

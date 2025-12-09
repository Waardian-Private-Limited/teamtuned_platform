import WalletTransactions from "@/components/org/WalletTransactions";

export default async function WalletTransactionsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <WalletTransactions walletId={id} />;
}

import WalletTransactions from "@/components/org/WalletTransactions";

export default function WalletTransactionsPage({ params }: { params: { id: string } }) {
    return <WalletTransactions walletId={params.id} />;
}

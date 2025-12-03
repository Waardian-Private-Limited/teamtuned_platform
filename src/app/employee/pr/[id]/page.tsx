"use client";
import PrView from "@/components/pr/PrView";
import { use } from "react";

export default function PrDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <PrView prId={id} />;
}

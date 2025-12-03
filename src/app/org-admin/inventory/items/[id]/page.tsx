"use client";

import React from "react";
import ItemForm from "@/components/inventory/ItemForm";
import { useParams } from "next/navigation";

export default function EditItemPage() {
    const params = useParams();
    const itemId = params.id as string;

    return <ItemForm itemId={itemId} />;
}

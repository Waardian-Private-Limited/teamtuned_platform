"use client";

import React from "react";
import CategoryForm from "@/components/inventory/CategoryForm";
import { useParams } from "next/navigation";

export default function EditCategoryPage() {
    const params = useParams();
    const categoryId = params.id as string;

    return <CategoryForm categoryId={categoryId} />;
}

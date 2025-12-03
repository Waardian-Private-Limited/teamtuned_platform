"use client";

import React from "react";
import SubcategoryForm from "@/components/inventory/SubcategoryForm";
import { useParams } from "next/navigation";

export default function EditSubcategoryPage() {
    const params = useParams();
    const subcategoryId = params.id as string;

    return <SubcategoryForm subcategoryId={subcategoryId} />;
}

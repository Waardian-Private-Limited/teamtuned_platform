"use client";

import React from "react";
import VendorForm from "@/components/inventory/VendorForm";
import { useParams } from "next/navigation";

export default function EditVendorPage() {
    const params = useParams();
    const vendorId = params.id as string;

    return <VendorForm vendorId={vendorId} />;
}

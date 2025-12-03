"use client";

import React from "react";
import SiteInventoryConfig from "@/components/inventory/SiteInventoryConfig";
import { useParams } from "next/navigation";

export default function OrgAdminSiteInventoryConfigPage() {
    const params = useParams();
    const siteId = params.siteId as string;

    return <SiteInventoryConfig siteId={siteId} />;
}

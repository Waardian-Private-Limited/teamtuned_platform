"use client";

import React from "react";
import SuperadminSidebar from "@/components/superadmin/SuperadminSidebar";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";

export default function SuperadminView() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleLogout = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {}
    router.replace("/login");
  };

  return (
    <div className="min-h-screen flex bg-white">
      <SuperadminSidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        handleLogout={handleLogout}
      />

      <main className="flex-1 p-6">
        <section>
          <h1 className="text-2xl font-semibold text-black">Dashboard</h1>
          <p className="mt-2 text-black">Quick overview for Superadmin.</p>
        </section>
      </main>
    </div>
  );
}
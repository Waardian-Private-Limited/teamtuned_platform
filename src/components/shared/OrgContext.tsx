"use client";

import React from "react";
import { apiClient } from "@/lib/apiClient";

export type Site = { id: number; name?: string } & Record<string, any>;

type OrgContextType = {
  hqMode: boolean;
  setHqMode: (v: boolean) => void;
  sites: Site[];
  selectedSiteId: number | null;
  setSelectedSiteId: (id: number | null) => void;
  loadingSites: boolean;
};

const OrgContext = React.createContext<OrgContextType | null>(null);

export function useOrgContext(): OrgContextType {
  const ctx = React.useContext(OrgContext);
  if (!ctx) throw new Error("OrgContext not found");
  return ctx;
}

export function OrgProvider({ children, defaultHQ = false }: { children: React.ReactNode; defaultHQ?: boolean }) {
  const [hqMode, setHqMode] = React.useState<boolean>(defaultHQ);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState<number | null>(null);
  const [loadingSites, setLoadingSites] = React.useState<boolean>(false);

  React.useEffect(() => {
    (async () => {
      try {
        setLoadingSites(true);
        const res = await apiClient<{ sites?: any[] }>("/attendance/incharge-sites", { withAuth: true });
        const list = Array.isArray(res?.sites) ? res!.sites! : [];
        const mapped: Site[] = list.map((s: any) => ({ id: Number(s.id), name: String(s.name || s.site_name || s.id), ...s }));
        setSites(mapped);
        if (mapped.length > 0 && selectedSiteId == null) {
          setSelectedSiteId(mapped[0].id);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoadingSites(false);
      }
    })();
  }, []);

  const value: OrgContextType = {
    hqMode,
    setHqMode: (v) => setHqMode(v),
    sites,
    selectedSiteId,
    setSelectedSiteId: (id) => setSelectedSiteId(id),
    loadingSites,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}
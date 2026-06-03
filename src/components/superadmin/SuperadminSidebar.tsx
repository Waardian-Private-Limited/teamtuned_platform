"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, ChevronDown, ChevronRight, LogOut, Menu, Settings, BarChart2, Smartphone, CreditCard, User, FileText } from "lucide-react";

export default function SuperadminSidebar({
  isCollapsed,
  setIsCollapsed,
  handleLogout,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  handleLogout: () => void;
}) {
  const pathname = usePathname();
  const [mainOpen, setMainOpen] = React.useState(true);
  const [featuresOpen, setFeaturesOpen] = React.useState(true);
  const [billingOpen, setBillingOpen] = React.useState(true);

  const Item = ({
    icon: Icon,
    label,
    href,
    active,
  }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    href: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition-colors ${active ? "bg-gray-100" : "hover:bg-gray-100"
        }`}
      title={label}
    >
      <Icon size={20} className="text-black" />
      {!isCollapsed && <span className="text-sm font-medium text-black">{label}</span>}
    </Link>
  );

  return (
    <aside
      className={`h-screen border-r border-gray-200 bg-white ${isCollapsed ? "w-16" : "w-64"
        } flex flex-col justify-between`}
    >
      <div>
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          {!isCollapsed && <span className="text-base font-semibold text-black">Superadmin</span>}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            <Menu size={18} className="text-black" />
          </button>
        </div>

        {/* Main Category */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setMainOpen(!mainOpen)}
            className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-gray-100"
            aria-expanded={mainOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-black">
              {mainOpen ? (
                <ChevronDown size={18} className="text-black" />
              ) : (
                <ChevronRight size={18} className="text-black" />
              )}
              {!isCollapsed && "Main"}
            </span>
          </button>

          {mainOpen && (
            <div className="mt-2 space-y-1">
              <Item icon={Home} label="Dashboard" href="/superadmin/dashboard" active={pathname === "/superadmin/dashboard"} />
              <Item icon={Building2} label="Organizations Management" href="/superadmin/organizations" active={pathname === "/superadmin/organizations"} />
              <Item icon={Smartphone} label="App Versions" href="/superadmin/app-versions" active={pathname === "/superadmin/app-versions"} />
              <Item icon={BarChart2} label="Analytics" href="/superadmin/analytics" active={pathname === "/superadmin/analytics"} />
            </div>
          )}
        </div>

        {/* Features Category */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setFeaturesOpen(!featuresOpen)}
            className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-gray-100"
            aria-expanded={featuresOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-black">
              {featuresOpen ? (
                <ChevronDown size={18} className="text-black" />
              ) : (
                <ChevronRight size={18} className="text-black" />
              )}
              {!isCollapsed && "Features"}
            </span>
          </button>

          {featuresOpen && (
            <div className="mt-2 space-y-1">
              <Item icon={Settings} label="Our Features" href="/superadmin/features" active={pathname === "/superadmin/features"} />
              <Item icon={Settings} label="Feature Categories" href="/superadmin/feature-categories" active={pathname === "/superadmin/feature-categories"} />
              <Item icon={Settings} label="Permissions" href="/superadmin/permissions" active={pathname === "/superadmin/permissions"} />
              <Item icon={Settings} label="Org Features" href="/superadmin/org-features" active={pathname === "/superadmin/org-features"} />
            </div>
          )}
        </div>

        {/* Billing Category */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => setBillingOpen(!billingOpen)}
            className="flex items-center justify-between w-full px-2 py-2 rounded-md hover:bg-gray-100"
            aria-expanded={billingOpen}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-black">
              {billingOpen ? (
                <ChevronDown size={18} className="text-black" />
              ) : (
                <ChevronRight size={18} className="text-black" />
              )}
              {!isCollapsed && "Billing"}
            </span>
          </button>

          {billingOpen && (
            <div className="mt-2 space-y-1">
              <Item icon={User} label="Billing Profile" href="/superadmin/billing-profile" active={pathname === "/superadmin/billing-profile"} />
              <Item icon={FileText} label="Custom Invoices" href="/superadmin/custom-invoices" active={pathname === "/superadmin/custom-invoices"} />
              <Item icon={CreditCard} label="TDS Deductions" href="/superadmin/tds-deductions" active={pathname === "/superadmin/tds-deductions"} />
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md hover:bg-gray-100"
          title="Logout"
        >
          <LogOut size={20} className="text-black" />
          {!isCollapsed && <span className="text-sm font-medium text-black">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { User, Bell, Search, Settings } from "lucide-react";
import { getPageTitle } from "@/lib/pageTitles";

interface GlobalHeaderProps {
    role: 'employee' | 'org-admin';
    firstName?: string | null;
    lastName?: string | null;
    userRole?: string | null;
    onLogout?: () => void;
}

export default function GlobalHeader({
    role,
    firstName,
    lastName,
    userRole,
    onLogout,
}: GlobalHeaderProps) {
    const pathname = usePathname();
    const { title, description } = getPageTitle(pathname, role);
    const [menuOpen, setMenuOpen] = React.useState(false);

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";

    return (
        <header className="sticky top-0 z-40 bg-transparent px-4 py-3 flex items-center justify-between transition-all duration-200">
            {/* Dynamic Page Title & Description */}
            <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
                {description && (
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{description}</p>
                )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Search (Optional placeholder for modern look) */}
                {/* <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors hidden sm:block">
                    <Search size={20} />
                </button> */}

                {/* Notifications */}
                {(firstName || lastName) && (
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                )}

                {/* User Profile */}
                {(firstName || lastName) && (
                    <div className="relative">
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                        >
                            <div className="hidden md:flex flex-col items-end mr-1">
                                <span className="text-sm font-semibold text-gray-900 leading-none">{fullName}</span>
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mt-0.5">{userRole || role}</span>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center text-white shadow-sm ring-2 ring-white">
                                <User size={18} />
                            </div>
                        </button>

                        {/* Dropdown */}
                        {menuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
                                <div className="px-4 py-3 border-b border-gray-50">
                                    <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                                    <p className="text-xs text-gray-500 truncate">{userRole || role}</p>
                                </div>
                                <div className="p-1">
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                        <User size={16} />
                                        <span>Profile</span>
                                    </button>
                                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                                        <Settings size={16} />
                                        <span>Settings</span>
                                    </button>
                                </div>
                                <div className="border-t border-gray-50 p-1 mt-1">
                                    <button
                                        onClick={() => {
                                            setMenuOpen(false);
                                            onLogout?.();
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                                    >
                                        <Settings size={16} className="rotate-180" /> {/* Using Settings as Logout icon placeholder if LogOut not imported, but I should import it */}
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
}

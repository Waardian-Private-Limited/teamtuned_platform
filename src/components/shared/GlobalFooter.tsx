import React from "react";

interface GlobalFooterProps {
    orgName?: string | null;
}

export default function GlobalFooter({ orgName }: GlobalFooterProps) {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="px-4 py-2 bg-transparent mt-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-0 text-xs font-medium text-gray-400 h-full">
                <div className="flex-1 flex items-center">
                    <span>Licensed for <span className="text-gray-600 font-semibold">{orgName || "Organization"}</span></span>
                </div>

                <div className="text-center flex items-center justify-center">
                    <span className="text-gray-500 mr-1">TeamTuned</span> © {currentYear} All rights reserved
                </div>

                <div className="flex-1 flex justify-end items-center">
                    <span className="flex items-center gap-1.5 hover:text-gray-600 transition-colors cursor-default">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        A Waardian Product
                    </span>
                </div>
            </div>
        </footer>
    );
}

"use client";

import React from "react";

export default function TeamTunedLoader() {
    return (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4 border border-gray-100">
                {/* TeamTuned Text */}
                <h3 className="text-2xl font-bold text-blue-600">TeamTuned</h3>

                {/* 3 Bouncing Dots */}
                <div className="flex items-center space-x-2">
                    <div
                        className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0s", animationDuration: "0.6s" }}
                    ></div>
                    <div
                        className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s", animationDuration: "0.6s" }}
                    ></div>
                    <div
                        className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: "0.4s", animationDuration: "0.6s" }}
                    ></div>
                </div>

                {/* Loading Text */}
                <p className="text-sm text-gray-600">Loading...</p>
            </div>
        </div>
    );
}

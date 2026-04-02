"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { apiClient } from "@/lib/apiClient";
import BiometricPunchScreen from "@/components/labor/BiometricPunchScreen";
import { Lock, User, RefreshCw, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

export default function BiometricPublicPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [siteData, setSiteData] = useState<{ id: number; name: string } | null>(null);
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Check if already authenticated via site token
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("token");
            const isSite = localStorage.getItem("authRole") === "Site";
            if (token && isSite) {
                try {
                    const storedSite = localStorage.getItem("siteInfo");
                    if (storedSite) {
                        setSiteData(JSON.parse(storedSite));
                        setIsAuthenticated(true);
                    }
                } catch (e) {
                    processLogout();
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!username || !password) return;

        setIsLoggingIn(true);
        try {
            const res = await apiClient<any>("/auth/site-login", {
                method: "POST",
                body: { username, password }
            });

            if (res.success && res.token) {
                localStorage.setItem("token", res.token);
                localStorage.setItem("authRole", "Site");
                const info = { id: res.user.site_id, name: res.user.site_name || res.user.collection_name };
                localStorage.setItem("siteInfo", JSON.stringify(info));
                setSiteData(info);
                setIsAuthenticated(true);
                toast.success("Kiosk activated");
            } else {
                toast.error(res.message || "Invalid credentials");
            }
        } catch (err: any) {
            toast.error(err.message || "Login failed");
        } finally {
            setIsLoggingIn(false);
        }
    };

    const processLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("authRole");
        localStorage.removeItem("siteInfo");
        setIsAuthenticated(false);
        setSiteData(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isAuthenticated && siteData) {
        return (
            <div className="h-screen w-full bg-[#0B0B0D] overflow-hidden">
                <BiometricPunchScreen
                    siteId={siteData.id}
                    siteName={siteData.name}
                    isKiosk={true}
                    onLogout={processLogout}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.06)] p-10 border border-gray-100 flex flex-col items-center">
                <div className="mb-10 text-center">
                    <Image
                        src="/assets/LogoBlackText.png"
                        alt="TeamTuned Logo"
                        width={220}
                        height={60}
                        className="h-14 w-auto object-contain mx-auto mb-4"
                        priority
                    />

                </div>

                <form onSubmit={handleLogin} className="w-full space-y-7">


                    <div className="space-y-4">
                        <InputWithIcon
                            label="Site Username"
                            icon={<User size={18} />}
                            type="text"
                            placeholder="Enter site UID"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoggingIn}
                        />

                        <InputWithIcon
                            label="Security Password"
                            icon={<Lock size={18} />}
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoggingIn}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoggingIn || !username || !password}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-4.5 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] mt-4"
                    >
                        {isLoggingIn ? (
                            <RefreshCw className="animate-spin" size={20} />
                        ) : (
                            <>
                                <span>Activate Station</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>

                    <div className="pt-6 border-t border-gray-100 text-center">
                        <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-medium">
                            &copy; 2026 Waardian Private Limited
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

function InputWithIcon({ label, icon, type, placeholder, value, onChange, disabled }: { label: string; icon: React.ReactNode; type: string; placeholder: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean }) {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] ml-1">{label}</label>
            <div className={`relative flex items-center px-4 py-4 bg-gray-50 rounded-2xl border transition-all duration-300 ${isFocused ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/5' : 'border-gray-50 hover:border-gray-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span className={`mr-3 transition-colors duration-300 ${isFocused ? 'text-blue-500' : 'text-gray-300'}`}>{icon}</span>
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="flex-1 bg-transparent text-gray-900 placeholder-gray-300 text-sm outline-none border-none focus:ring-0 focus:outline-none"
                />
            </div>
        </div>
    );
}

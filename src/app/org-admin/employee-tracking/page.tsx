"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiClient } from "@/lib/apiClient";
import { 
    Search, 
    MapPin, 
    User, 
    Navigation, 
    Compass, 
    Calendar as CalendarIcon, 
    RefreshCw, 
    Shield, 
    ToggleLeft, 
    ToggleRight, 
    Loader2, 
    CheckCircle2, 
    XCircle,
    Activity,
    Sliders,
    ChevronRight,
    Map
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Dynamic import for Leaflet MovementMap to avoid SSR issues
const MovementMap = dynamic(() => import("@/components/attendance/MovementMap"), { ssr: false });

type Employee = {
    id: number;
    name: string;
    designation?: string;
    department_name?: string;
    track_location_movement: number | boolean;
    status: string;
    email?: string;
};

export default function EmployeeTrackingPage() {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    });
    const [togglingId, setTogglingId] = useState<number | null>(null);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const res = await apiClient<any>("/organization/employees?limit=1000", { withAuth: true });
            const list = res.data || res.items || (Array.isArray(res) ? res : []);
            const mapped = list.map((e: any) => {
                const isEnabled = e.track_location_movement === 1 || 
                                  e.track_location_movement === true || 
                                  String(e.track_location_movement) === '1' ||
                                  String(e.track_location_movement).toLowerCase() === 'enabled';
                return {
                    ...e,
                    name: e.name || `${e.first_name || ""} ${e.last_name || ""}`.trim() || "Employee",
                    track_location_movement: isEnabled ? 1 : 0
                };
            });
            setEmployees(mapped);
        } catch (err: any) {
            toast.error(err.message || "Failed to load employees list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleToggleTracking = async (emp: Employee) => {
        const nextState = !emp.track_location_movement;
        try {
            setTogglingId(emp.id);
            const res = await apiClient<any>("/attendance/toggle-tracking", {
                method: "POST",
                body: { employee_id: emp.id, enabled: nextState },
                withAuth: true
            });

            if (res.success) {
                // Update local employee lists
                const updatedList = employees.map(e => {
                    if (e.id === emp.id) {
                        return { ...e, track_location_movement: nextState ? 1 : 0 };
                    }
                    return e;
                });
                setEmployees(updatedList);
                
                if (selectedEmployee && selectedEmployee.id === emp.id) {
                    setSelectedEmployee({ ...selectedEmployee, track_location_movement: nextState ? 1 : 0 });
                }

                toast.success(
                    nextState 
                        ? `Continuous GPS tracking activated for ${emp.name}` 
                        : `GPS tracking deactivated for ${emp.name}`,
                    { duration: 4000 }
                );
            } else {
                toast.error(res.message || "Failed to update tracking settings");
            }
        } catch (err: any) {
            toast.error(err.message || "An error occurred while updating settings");
        } finally {
            setTogglingId(null);
        }
    };

    // Filter employees based on search query
    const filteredEmployees = employees.filter(e => {
        const q = searchQuery.toLowerCase();
        const name = e.name || "";
        const email = e.email || "";
        return (
            name.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q)
        );
    });

    return (
        <div className="min-h-screen bg-slate-50/50 text-slate-800 p-6 flex flex-col font-sans relative overflow-hidden">
            <Toaster position="top-right" />
            
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-100/30 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-10 left-10 w-80 h-80 bg-purple-100/30 rounded-full blur-[100px] pointer-events-none"></div>

            {/* Premium Header */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 shrink-0 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-[0_4px_12px_rgba(37,99,235,0.2)] border border-blue-400/10">
                        <Map className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">
                            Continuous GPS Travel Tracking
                        </h1>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Real-time shift timeline visualizer & continuous background travel monitoring controls.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                    <button 
                        onClick={fetchEmployees}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5 backdrop-blur-md shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh List
                    </button>
                </div>
            </header>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 min-h-[calc(100vh-170px)] relative z-10">
                
                {/* Left Panel: Employee Control Center */}
                <div className="xl:col-span-4 flex flex-col bg-white/90 border border-slate-200/80 rounded-2xl backdrop-blur-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search employees name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 transition-all outline-none shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Employee Directory */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 max-h-[30rem] xl:max-h-[calc(100vh-270px)]">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                                <span className="text-xs font-semibold text-slate-500">Fetching directory context...</span>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center p-6">
                                <User className="w-10 h-10 text-slate-300 mb-3" />
                                <p className="text-sm font-bold text-slate-600">No employees found</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Refine your search keywords or sync context.</p>
                            </div>
                        ) : (
                            filteredEmployees.map((emp) => {
                                const isSelected = selectedEmployee?.id === emp.id;
                                const isTrackingEnabled = emp.track_location_movement === 1;
                                const isToggling = togglingId === emp.id;
                                
                                return (
                                    <div 
                                        key={emp.id}
                                        onClick={() => setSelectedEmployee(emp)}
                                        className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-slate-50/50 ${
                                            isSelected ? 'bg-blue-50/60 border-l-[3.5px] border-blue-600' : 'border-l-[3.5px] border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Photo Placeholder */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                                                isTrackingEnabled 
                                                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {(emp.name || "Employee").split(" ").map(w => w ? w[0] : "").join("").slice(0, 2).toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-800 truncate">
                                                    {emp.name}
                                                </h3>
                                                {emp.department_name && (
                                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                                        {emp.department_name}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    {emp.status === "active" || emp.status === "Active" ? (
                                                        <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                                            <CheckCircle2 className="w-2.5 h-2.5" />
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                                            <XCircle className="w-2.5 h-2.5" />
                                                            {emp.status || "Inactive"}
                                                        </span>
                                                    )}

                                                    {isTrackingEnabled && (
                                                        <span className="flex items-center gap-1 text-[8px] font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide animate-pulse">
                                                            <Compass className="w-2.5 h-2.5" />
                                                            GPS On
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Toggle Switch */}
                                        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleToggleTracking(emp)}
                                                disabled={isToggling}
                                                className={`focus:outline-none transition-opacity ${isToggling ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                                title={isTrackingEnabled ? "Deactivate continuous background GPS tracking" : "Activate continuous background GPS tracking"}
                                            >
                                                {isToggling ? (
                                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                                ) : isTrackingEnabled ? (
                                                    <ToggleRight className="w-9 h-9 text-blue-600 transition-all drop-shadow-sm" />
                                                ) : (
                                                    <ToggleLeft className="w-9 h-9 text-slate-400 hover:text-slate-500 transition-all" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Panel: Map & Journey Timeline Panel */}
                <div className="xl:col-span-8 flex flex-col bg-white/90 border border-slate-200/80 rounded-2xl backdrop-blur-xl overflow-hidden shadow-sm relative min-h-[450px]">
                    
                    {selectedEmployee ? (
                        <div className="p-5 flex flex-col h-full space-y-4">
                            {/* Selected Employee Info & Date Filter */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center font-extrabold text-sm text-white shadow-md shrink-0">
                                        {(selectedEmployee.name || "Employee").split(" ").map(w => w ? w[0] : "").join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h2 className="text-base font-bold text-slate-850 leading-tight">{selectedEmployee.name || "Employee"}</h2>
                                            {selectedEmployee.track_location_movement === 1 ? (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 border border-blue-100 text-blue-600 flex items-center gap-1 animate-pulse">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                                    Tracking Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                                    Tracking Disabled
                                                </span>
                                            )}
                                        </div>
                                        {selectedEmployee.department_name && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                {selectedEmployee.department_name}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Premium Date Picker */}
                                <div className="flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 px-3 py-2 rounded-xl transition-all self-start sm:self-center shadow-sm">
                                    <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        max={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-transparent text-xs text-slate-700 border-none outline-none focus:ring-0 cursor-pointer w-28 font-bold"
                                    />
                                </div>
                            </div>

                            {/* Active Dynamic Leaflet Timeline Map */}
                            <div className="flex-1 w-full bg-slate-50 rounded-xl overflow-hidden min-h-[350px] border border-slate-100">
                                <MovementMap 
                                    employeeId={selectedEmployee.id}
                                    date={selectedDate}
                                    employeeName={selectedEmployee.name}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Premium Gorgeous Light Mode SVG Placeholder */
                        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center select-none py-28 relative overflow-hidden">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-blue-100/10 rounded-full blur-[70px] pointer-events-none"></div>
                            
                            <div className="relative mb-6">
                                <div className="w-20 h-20 bg-gradient-to-tr from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-3xl flex items-center justify-center shadow-md relative z-10 animate-bounce duration-[2.5s]">
                                    <MapPin className="w-9 h-9 text-blue-600 drop-shadow-[0_4px_10px_rgba(37,99,235,0.2)]" />
                                </div>
                                <div className="w-20 h-20 border border-blue-500/20 rounded-3xl absolute top-1.5 left-1.5 blur-[2px] animate-pulse"></div>
                            </div>

                            <h3 className="text-lg font-black text-slate-800 tracking-wide uppercase">Journey Panel Screen</h3>
                            <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed font-medium">
                                Select an employee from the directory list on the left to display their continuous GPS timeline itinerary, battery health logs, and interactive travel map.
                            </p>
                            
                            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/60 text-[10px] text-slate-500 font-bold rounded-lg shadow-sm">
                                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                                    Configure Indiv. Flags
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-400 hidden sm:block" />
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/60 text-[10px] text-slate-500 font-bold rounded-lg shadow-sm">
                                    <Compass className="w-3.5 h-3.5 text-purple-500 animate-spin duration-[6s]" />
                                    Draw OpenStreetMap Routes
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

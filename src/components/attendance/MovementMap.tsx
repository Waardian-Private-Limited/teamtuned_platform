"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiClient } from "@/lib/apiClient";
import { 
    Loader2, 
    MapPin, 
    AlertTriangle, 
    Clock, 
    Battery, 
    Activity,
    Compass,
    Navigation,
    WifiOff,
    ShieldAlert,
    ShieldCheck,
    Wifi
} from "lucide-react";
import "leaflet/dist/leaflet.css";

// Dynamic imports for Leaflet to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false }) as any;
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false }) as any;
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), { ssr: false }) as any;
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false }) as any;
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false }) as any;

type Point = {
    lat: number | null;
    lng: number | null;
    accuracy: number;
    speed?: number;
    battery_level?: number;
    timestamp: string;
    is_mocked: boolean;
    event_type: string; // 'location_point' | 'location_disabled' | 'location_enabled' | 'permission_denied' | 'permission_granted'
};

type Props = {
    attendanceId?: number;
    employeeId?: number;
    date?: string;
    employeeName?: string;
};

// Haversine Distance helper
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Bearing between two coordinates (degrees)
function getBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Component to render directional arrow decorators on map
// This is rendered inside MapContainer so useMap hook works
function ArrowDecorators({ segments, L }: { segments: [number, number][][]; L: any }) {
    // Dynamically import useMap at runtime inside the component
    const [useMapFn, setUseMapFn] = React.useState<any>(null);

    useEffect(() => {
        import("react-leaflet").then((mod) => {
            setUseMapFn(() => mod.useMap);
        });
    }, []);

    // We can't call a hook conditionally, so delegate to a sub-component
    return useMapFn ? <ArrowDecoratorsInner segments={segments} L={L} useMap={useMapFn} /> : null;
}

function ArrowDecoratorsInner({ segments, L, useMap: useMapFn }: { segments: [number, number][][]; L: any; useMap: any }) {
    const map = useMapFn();

    useEffect(() => {
        if (!map || !L || segments.length === 0) return;

        // We use L.SVGOverlay approach via SVG arrow heads on mid-points
        // Clean up old arrow markers
        map.eachLayer((layer: any) => {
            if (layer._isArrowMarker) map.removeLayer(layer);
        });

        segments.forEach((seg) => {
            if (seg.length < 2) return;
            // Place arrows at every ~3rd segment step, or min 1
            const step = Math.max(1, Math.floor(seg.length / 8));
            for (let i = step; i < seg.length; i += step) {
                const from = seg[i - 1];
                const to = seg[i];
                const bearing = getBearing(from[0], from[1], to[0], to[1]);
                const midLat = (from[0] + to[0]) / 2;
                const midLng = (from[1] + to[1]) / 2;

                const arrowIcon = L.divIcon({
                    className: "",
                    html: `<div style="
                        width: 0; height: 0;
                        border-left: 5px solid transparent;
                        border-right: 5px solid transparent;
                        border-bottom: 11px solid #2563eb;
                        transform: rotate(${bearing}deg);
                        transform-origin: center center;
                        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
                    "></div>`,
                    iconSize: [10, 11],
                    iconAnchor: [5, 5.5],
                });

                const marker = L.marker([midLat, midLng], { icon: arrowIcon, interactive: false });
                (marker as any)._isArrowMarker = true;
                marker.addTo(map);
            }
        });

        return () => {
            map.eachLayer((layer: any) => {
                if (layer._isArrowMarker) map.removeLayer(layer);
            });
        };
    }, [map, L, segments]);

    return null;
}

// Event config for GPS status events
const eventConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string; borderColor: string; dotColor: string }> = {
    location_disabled: {
        icon: <WifiOff className="w-3 h-3" />,
        label: "GPS Turned Off",
        color: "text-rose-700",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
        dotColor: "bg-rose-500",
    },
    location_enabled: {
        icon: <Wifi className="w-3 h-3" />,
        label: "GPS Re-enabled",
        color: "text-emerald-700",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-400",
    },
    permission_denied: {
        icon: <ShieldAlert className="w-3 h-3" />,
        label: "Location Permission Revoked",
        color: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
    },
    permission_granted: {
        icon: <ShieldCheck className="w-3 h-3" />,
        label: "Location Permission Restored",
        color: "text-sky-700",
        bgColor: "bg-sky-50",
        borderColor: "border-sky-200",
        dotColor: "bg-sky-400",
    },
};

export default function MovementMap({ attendanceId, employeeId, date, employeeName }: Props) {
    const [points, setPoints] = useState<Point[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [L, setL] = useState<any>(null);

    useEffect(() => {
        import("leaflet").then((mod) => {
            setL(mod.default);
        });

        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                let url = "";
                if (employeeId && date) {
                    url = `/attendance/employee-location-history?employeeId=${employeeId}&date=${date}`;
                } else if (attendanceId) {
                    url = `/attendance/location-history/${attendanceId}`;
                } else {
                    setPoints([]);
                    setLoading(false);
                    return;
                }
                const res = await apiClient<any>(url, { withAuth: true });
                if (res.success) {
                    const parsedPoints = (res.points || []).map((p: any) => ({
                        ...p,
                        lat: p.lat != null ? Number(p.lat) : null,
                        lng: p.lng != null ? Number(p.lng) : null,
                        accuracy: p.accuracy ? Number(p.accuracy) : 0,
                        speed: p.speed !== undefined ? Number(p.speed) : undefined,
                        battery_level: p.battery_level !== undefined ? Number(p.battery_level) : undefined,
                        event_type: p.event_type || "location_point",
                    }));
                    setPoints(parsedPoints);
                } else {
                    setError("Failed to load movement history");
                }
            } catch (err: any) {
                setError(err.message || "Error fetching location data");
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [attendanceId, employeeId, date]);

    if (loading) {
        return (
            <div className="h-72 bg-slate-50 flex items-center justify-center rounded-lg border border-slate-200">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
                <span className="text-sm text-slate-600 font-medium">Loading movement data...</span>
            </div>
        );
    }

    // Separate GPS events from actual location points
    const locationPoints = points.filter(p => p.event_type === "location_point" && p.lat != null && p.lng != null);
    const gpsEvents = points.filter(p => p.event_type !== "location_point");

    if (error || locationPoints.length === 0) {
        return (
            <div className="h-72 bg-slate-50 flex flex-col items-center justify-center rounded-lg border border-slate-200 p-6 text-center">
                <MapPin className="w-10 h-10 text-slate-400 mb-3" />
                <p className="text-sm text-slate-700 font-semibold">
                    {locationPoints.length === 0 && gpsEvents.length === 0
                        ? "No continuous background movement logs recorded."
                        : error ?? "No GPS coordinates logged yet."}
                </p>
                {/* Show GPS events even if no coordinates */}
                {gpsEvents.length > 0 && (
                    <div className="mt-4 w-full max-w-sm space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">GPS Status Events</p>
                        {gpsEvents.map((ev, idx) => {
                            const cfg = eventConfig[ev.event_type];
                            if (!cfg) return null;
                            return (
                                <div key={idx} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bgColor} ${cfg.borderColor}`}>
                                    <span className={cfg.color}>{cfg.icon}</span>
                                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                    <span className="text-[10px] text-slate-400 ml-auto">{new Date(ev.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <p className="text-xs text-slate-500 mt-3 max-w-sm">
                    Background tracking logs coordinates every 50m of movement or every 5 minutes when stationary.
                </p>
            </div>
        );
    }

    // Calculations using real location points only
    let totalDistMetres = 0;
    let mockDetections = 0;
    let sumSpeed = 0;
    let validSpeedCounts = 0;

    locationPoints.forEach((p, idx) => {
        if (p.is_mocked) mockDetections++;
        if (p.speed && p.speed > 0) {
            sumSpeed += p.speed;
            validSpeedCounts++;
        }
        if (idx > 0) {
            const prev = locationPoints[idx - 1];
            totalDistMetres += calculateDistance(prev.lat!, prev.lng!, p.lat!, p.lng!);
        }
    });

    const totalDistKm = totalDistMetres / 1000;
    const avgSpeedKmh = validSpeedCounts > 0 ? (sumSpeed / validSpeedCounts) * 3.6 : 0;
    const latestBattery = locationPoints[locationPoints.length - 1].battery_level ?? 100;

    // Build arrow-decorated segments (split by time gaps > 15 min)
    const segments: [number, number][][] = [];
    let currentSegment: [number, number][] = [];
    const GAP_THRESHOLD_MS = 15 * 60 * 1000;

    locationPoints.forEach((p, i) => {
        const coords: [number, number] = [p.lat!, p.lng!];
        if (i > 0) {
            const prev = locationPoints[i - 1];
            const diff = new Date(p.timestamp).getTime() - new Date(prev.timestamp).getTime();
            if (diff > GAP_THRESHOLD_MS) {
                if (currentSegment.length > 0) segments.push(currentSegment);
                currentSegment = [];
            }
        }
        currentSegment.push(coords);
    });
    if (currentSegment.length > 0) segments.push(currentSegment);

    const center: [number, number] = [locationPoints[0].lat!, locationPoints[0].lng!];

    // Icon Factory
    const createIcon = (color: string, size: number = 14) => {
        if (!L) return null;
        return L.divIcon({
            className: "custom-div-icon",
            html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);"></div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2]
        });
    };

    const formatTime = (ts: string) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Merge timeline: all points + GPS events, sorted by timestamp
    const timelineItems = [...locationPoints, ...gpsEvents].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <Compass className="w-5 h-5 text-blue-600 animate-pulse" />
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Shift Journey & GPS Timeline</h4>
                        {employeeName && <p className="text-[10px] text-slate-500 font-medium">Tracking route for {employeeName}</p>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {mockDetections > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            MOCK GPS DETECTED ({mockDetections})
                        </div>
                    )}
                    {gpsEvents.filter(e => e.event_type === "location_disabled" || e.event_type === "permission_denied").length > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold shadow-sm">
                            <WifiOff className="w-3.5 h-3.5" />
                            GPS DISABLED ({gpsEvents.filter(e => e.event_type === "location_disabled" || e.event_type === "permission_denied").length}x)
                        </div>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Navigation className="w-4 h-4" /></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance Covered</div>
                        <div className="text-sm font-extrabold text-slate-800">{totalDistKm.toFixed(2)} km</div>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Clock className="w-4 h-4" /></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Duration</div>
                        <div className="text-sm font-extrabold text-slate-800">
                            {(() => {
                                const diffMs = new Date(locationPoints[locationPoints.length - 1].timestamp).getTime() - new Date(locationPoints[0].timestamp).getTime();
                                const hrs = Math.floor(diffMs / 3600000);
                                const mins = Math.round((diffMs % 3600000) / 60000);
                                return `${hrs}h ${mins}m`;
                            })()}
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Activity className="w-4 h-4" /></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Velocity</div>
                        <div className="text-sm font-extrabold text-slate-800">{avgSpeedKmh > 0 ? `${avgSpeedKmh.toFixed(1)} km/h` : "Stationary"}</div>
                    </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Battery className="w-4 h-4" /></div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device Battery</div>
                        <div className="text-sm font-extrabold text-slate-800">{latestBattery}%</div>
                    </div>
                </div>
            </div>

            {/* Map + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Map */}
                <div className="lg:col-span-2">
                    <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-200 shadow-md relative z-0">
                        <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />

                            {/* Render directional path segments */}
                            {segments.map((seg, idx) => (
                                <Polyline
                                    key={idx}
                                    positions={seg}
                                    pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.85 }}
                                />
                            ))}

                            {/* Directional arrow decorators */}
                            {L && <ArrowDecorators segments={segments} L={L} />}

                            {/* Gap lines (dotted) between disconnected segments */}
                            {segments.length > 1 && segments.map((seg, idx) => {
                                if (idx === 0) return null;
                                const prevSeg = segments[idx - 1];
                                const gapLine = [prevSeg[prevSeg.length - 1], seg[0]];
                                return (
                                    <Polyline
                                        key={`gap-${idx}`}
                                        positions={gapLine as [number, number][]}
                                        pathOptions={{ color: "#f43f5e", weight: 2.5, dashArray: "6, 12", opacity: 0.55 }}
                                    />
                                );
                            })}

                            {/* Start Marker */}
                            <Marker position={[locationPoints[0].lat!, locationPoints[0].lng!]} icon={createIcon("#10b981", 16)}>
                                <Popup>
                                    <div className="p-1 space-y-1">
                                        <div className="text-xs font-bold text-slate-800">Check-In Starting Point</div>
                                        <div className="text-[10px] text-slate-500">{new Date(locationPoints[0].timestamp).toLocaleString()}</div>
                                        {locationPoints[0].battery_level && <div className="text-[10px] text-slate-500">🔋 {locationPoints[0].battery_level}%</div>}
                                    </div>
                                </Popup>
                            </Marker>

                            {/* End Marker */}
                            <Marker position={[locationPoints[locationPoints.length - 1].lat!, locationPoints[locationPoints.length - 1].lng!]} icon={createIcon("#f43f5e", 16)}>
                                <Popup>
                                    <div className="p-1 space-y-1">
                                        <div className="text-xs font-bold text-slate-800">Latest Position</div>
                                        <div className="text-[10px] text-slate-500">{new Date(locationPoints[locationPoints.length - 1].timestamp).toLocaleString()}</div>
                                        {locationPoints[locationPoints.length - 1].battery_level && <div className="text-[10px] text-slate-500">🔋 {locationPoints[locationPoints.length - 1].battery_level}%</div>}
                                    </div>
                                </Popup>
                            </Marker>

                            {/* Mock GPS Markers */}
                            {locationPoints.filter(p => p.is_mocked).map((p, i) => (
                                <Marker key={`mock-${i}`} position={[p.lat!, p.lng!]} icon={createIcon("#000000", 14)}>
                                    <Popup>
                                        <div className="p-1 text-center space-y-1">
                                            <div className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                                <AlertTriangle className="w-3.5 h-3.5" /> MOCK GPS
                                            </div>
                                            <div className="text-[10px] text-slate-500">{new Date(p.timestamp).toLocaleString()}</div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div>
                </div>

                {/* Timeline Panel — merged GPS events + location points */}
                <div className="lg:col-span-1 flex flex-col max-h-[24rem]">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col flex-1 overflow-hidden">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 shrink-0 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" />
                            Movement Itinerary
                        </div>

                        <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                            <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-3 py-1">

                                {/* Start event */}
                                <div className="relative">
                                    <div className="absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Session Start</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">{formatTime(locationPoints[0].timestamp)}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {locationPoints[0].lat!.toFixed(4)}, {locationPoints[0].lng!.toFixed(4)}
                                            {locationPoints[0].battery_level && <span className="ml-1 bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-600">🔋 {locationPoints[0].battery_level}%</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* All middle events merged and sorted */}
                                {timelineItems.slice(1, timelineItems.length - 1).map((item, idx) => {
                                    const isEvent = item.event_type !== "location_point";
                                    if (isEvent) {
                                        const cfg = eventConfig[item.event_type];
                                        if (!cfg) return null;
                                        return (
                                            <div key={`evt-${idx}`} className="relative">
                                                <div className={`absolute -left-[20px] top-0.5 w-2.5 h-2.5 rounded-full ${cfg.dotColor} border-2 border-white ring-2 ring-offset-0`} />
                                                <div className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border ${cfg.bgColor} ${cfg.borderColor}`}>
                                                    <span className={`mt-0.5 shrink-0 ${cfg.color}`}>{cfg.icon}</span>
                                                    <div>
                                                        <div className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</div>
                                                        <div className="text-[9px] text-slate-400">{formatTime(item.timestamp)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // Skip non-sampled regular points for brevity
                                    const locationIdx = locationPoints.indexOf(item as any);
                                    const sampleStep = Math.max(1, Math.floor(locationPoints.length / 5));
                                    if (locationIdx % sampleStep !== 0) return null;

                                    return (
                                        <div key={`pt-${idx}`} className="relative">
                                            <div className={`absolute -left-[20px] top-0.5 w-2.5 h-2.5 rounded-full ${item.is_mocked ? 'bg-black' : 'bg-blue-400'} border-2 border-white ring-2 ${item.is_mocked ? 'ring-rose-200' : 'ring-blue-100'}`} />
                                            <div>
                                                <div className="text-xs font-bold text-slate-700">
                                                    {item.is_mocked ? "⚠️ Tampered Location" : `Tracked Point #${locationIdx}`}
                                                </div>
                                                <div className="text-[10px] text-slate-400">{formatTime(item.timestamp)}</div>
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                                                    <span>{item.lat!.toFixed(4)}, {item.lng!.toFixed(4)}</span>
                                                    {item.battery_level && <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded text-slate-500">🔋 {item.battery_level}%</span>}
                                                </div>
                                                {item.speed !== undefined && item.speed > 0 && (
                                                    <div className="text-[9px] text-slate-500">{(item.speed * 3.6).toFixed(1)} km/h</div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* End event */}
                                <div className="relative">
                                    <div className="absolute -left-[22px] top-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white ring-2 ring-rose-100" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">Latest Position</div>
                                        <div className="text-[10px] text-slate-400">{formatTime(locationPoints[locationPoints.length - 1].timestamp)}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {locationPoints[locationPoints.length - 1].lat!.toFixed(4)}, {locationPoints[locationPoints.length - 1].lng!.toFixed(4)}
                                            {locationPoints[locationPoints.length - 1].battery_level && <span className="ml-1 bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-600">🔋 {locationPoints[locationPoints.length - 1].battery_level}%</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-500 font-medium px-1 pt-1.5 border-t border-slate-100">
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white shadow-sm" />
                    Start
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-sm" />
                    Latest Position
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-black border border-white shadow-sm animate-pulse" />
                    Mock GPS
                </div>
                <div className="flex items-center gap-1">
                    <div className="flex items-center">
                        <div className="w-4 h-0.5 bg-blue-500 opacity-60" />
                        <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderBottom: "7px solid #2563eb", marginLeft: "1px" }} />
                    </div>
                    Directional Route
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-6 h-0.5 border-t-2 border-dashed border-rose-400" />
                    GPS Gap / Offline
                </div>
                <div className="flex items-center gap-1">
                    <WifiOff className="w-3 h-3 text-rose-500" />
                    GPS Disabled
                </div>
            </div>
        </div>
    );
}

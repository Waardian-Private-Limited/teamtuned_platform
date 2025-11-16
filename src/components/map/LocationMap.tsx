"use client";

import React from "react";
import { bboxAround, isValidLatLon } from "@/lib/location";

export type LocationMapProps = {
  pin?: { lat: number; lon: number; label?: string };
  zoom?: number;
  height?: number | string;
  radiusMeters?: number; // reserved for future overlays
  className?: string;
};

/**
 * Lightweight, dependency-free map preview using OpenStreetMap embed with a marker.
 * Designed for reuse across pages. Pass `pin` to render the marker.
 */
export default function LocationMap({ pin, zoom = 16, height = 280, className }: LocationMapProps) {
  if (!pin || !isValidLatLon(pin.lat, pin.lon)) {
    return (
      <div
        className={
          "flex items-center justify-center rounded border border-gray-200 bg-gray-50 text-gray-500 " +
          (className ?? "")
        }
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        No location selected
      </div>
    );
  }

  const bbox = bboxAround(pin.lat, pin.lon, zoom);
  const src = `https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${pin.lat},${pin.lon}&bbox=${bbox.join(",")}`;
  const viewUrl = `https://www.openstreetmap.org/?mlat=${pin.lat}&mlon=${pin.lon}#map=${zoom}/${pin.lat}/${pin.lon}`;

  return (
    <div className={"space-y-2 " + (className ?? "")}>
      <div className="relative overflow-hidden rounded border border-gray-200">
        <iframe
          title={pin.label ? `Map: ${pin.label}` : "Location Map"}
          src={src}
          style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%" }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{pin.label ?? "Selected location"}</span>
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-gray-700"
        >
          View larger map
        </a>
      </div>
    </div>
  );
}
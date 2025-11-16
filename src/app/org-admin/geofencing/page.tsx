'use client';
import React, { useEffect, useState } from 'react';

export default function GeofencingPreviewPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState<number>(200);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setError(err.message || 'Failed to get location');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const mapSrc = coords
    ? `https://maps.google.com/maps?q=${coords.lat},${coords.lng}&z=16&output=embed`
    : undefined;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Geofencing Registration (Preview)</h1>
      {error && (
        <div className="border border-red-300 bg-red-50 text-red-700 p-3 rounded">{error}</div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Radius (meters)</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              min={50}
              max={1000}
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value || '0', 10))}
            />
            <p className="text-xs text-gray-500 mt-1">Preview-only; Flutter app handles registration.</p>
          </div>
          <div>
            <p className="text-sm text-gray-700">Captured Coords:</p>
            <p className="text-sm text-gray-900">
              {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Capturing...'}
            </p>
          </div>
        </div>
        <div className="border rounded overflow-hidden min-h-[320px] flex items-center justify-center">
          {mapSrc ? (
            <iframe title="map" src={mapSrc} className="w-full h-[320px]" />
          ) : (
            <div className="text-gray-600">Waiting for location...</div>
          )}
        </div>
      </div>
    </div>
  );
}
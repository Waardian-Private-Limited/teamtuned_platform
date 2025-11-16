export type LocationPin = {
  lat: number;
  lon: number;
  label?: string;
};

export function isValidLatLon(lat?: number | null, lon?: number | null): boolean {
  if (lat == null || lon == null) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function toNumberOrUndefined(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function bboxAround(lat: number, lon: number, zoom: number = 16) {
  // Approximate deltas based on zoom; simple heuristic good enough for OSM embed
  // Base delta for ~zoom 16
  const baseDeltaLat = 0.005;
  const deltaLat = baseDeltaLat * Math.pow(2, 16 - zoom);
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.0001);
  const deltaLon = deltaLat / cosLat;
  return [lon - deltaLon, lat - deltaLat, lon + deltaLon, lat + deltaLat];
}
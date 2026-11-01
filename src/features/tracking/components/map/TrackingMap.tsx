'use client';

import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { formatDateTime } from '@/lib/datetime';
import { MAP_STYLE_URL, STATE_COLOR, STATE_LABEL } from '../../constants/tracking.constants';
import type { FenceDto, TrackingState } from '../../types/tracking.dto';
import { routeBreaks } from '../../utils/routeGaps';

export interface MapEmployee {
  id: number;
  name: string;
  lat: number;
  lng: number;
  state: TrackingState;
  /** The last fix is too old to trust; drawn faded. */
  stale?: boolean;
  /** Tracking is on and the fix is fresh: the pin pulses. */
  live?: boolean;
  code?: string | null;
  siteName?: string | null;
  battery?: number | null;
  recordedAt?: string | null;
  accuracy?: number | null;
}

export interface MapStop {
  lat: number;
  lng: number;
  label: string;
}

interface Props {
  employees?: MapEmployee[];
  sites?: FenceDto[];
  route?: Array<{ lat: number; lng: number; at?: string }>;
  /** Stretches with no track (timeline gap segments); the route is not joined across them. */
  gaps?: Array<{ from: string; to: string }>;
  stops?: MapStop[];
  playhead?: { lat: number; lng: number } | null;
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  /**
   * Changes when the view should refit to the data (a new filter, employee or date). Pass the key of the
   * data actually shown, not of the request in flight: the map fits once there is something to fit.
   */
  fitKey?: string;
  /** Pans and zooms to this point whenever `seq` changes (a click on a list row). */
  focus?: { lat: number; lng: number; seq: number } | null;
}

// Muted, non-blue palette; a site keeps its colour by id.
const SITE_COLORS = ['#e11d48', '#16a34a', '#d97706', '#9333ea', '#0f766e', '#c2410c', '#be185d', '#4d7c0f', '#854d0e', '#7c3aed'];
const siteColor = (id: number) => SITE_COLORS[Math.abs(id) % SITE_COLORS.length];

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
// Popup body: bold title, then label/value rows. Values are escaped.
const popupHtml = (title: string, rows: Array<[string, string | null | undefined]>) =>
  `<div style="font-family:inherit;min-width:150px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${esc(title)}</div>${rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#4b5563"><span>${esc(k)}</span><span style="color:#111;font-weight:600">${esc(v as string)}</span></div>`)
    .join('')}</div>`;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const GLIDE_MS = 1200;

const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

// A circle on the ground as a polygon, for the site boundaries.
function circle(lat: number, lng: number, radiusM: number) {
  const steps = 48;
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    const dLat = (radiusM / 111320) * Math.sin(a);
    const dLng = (radiusM / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.cos(a);
    ring.push([lng + dLng, lat + dLat]);
  }
  return ring;
}

const colorExpression = ['match', ['get', 'state'], ...Object.entries(STATE_COLOR).flat(), '#111111'] as unknown as maplibregl.ExpressionSpecification;

// The route as separate lines broken at gaps, plus the gaps as their own (dashed) lines.
function routeLines(route: Array<{ lat: number; lng: number; at?: string }>, gaps: Array<{ from: string; to: string }>) {
  const breaks = routeBreaks(route, gaps);
  const lines: Array<Array<[number, number]>> = [];
  const jumps: Array<Array<[number, number]>> = [];
  let current: Array<[number, number]> = [];
  route.forEach((p, i) => {
    const c: [number, number] = [p.lng, p.lat];
    if (breaks[i]) {
      if (current.length > 1) lines.push(current);
      jumps.push([current[current.length - 1], c]);
      current = [];
    }
    current.push(c);
  });
  if (current.length > 1) lines.push(current);
  const feature = (coordinates: Array<[number, number]>) => ({ type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates }, properties: {} });
  return { lines: lines.map(feature), jumps: jumps.map(feature) };
}

export default function TrackingMap({ employees = [], sites = [], route = [], gaps = [], stops = [], playhead = null, selectedId = null, onSelect, fitKey, focus = null }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const raf = useRef(0);
  const glide = useRef(0);
  const shown = useRef(new Map<number, [number, number]>());
  const lastFit = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const latest = useRef({ employees, sites, route, gaps, stops, playhead, selectedId, fitKey });
  latest.current = { employees, sites, route, gaps, stops, playhead, selectedId, fitKey };
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  const paint = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const { employees: e, sites: s, route: r, gaps: g, stops: st, playhead: p, selectedId: sel } = latest.current;
    const set = (id: string, data: GeoJSON.GeoJSON) => (map.getSource(id) as maplibregl.GeoJSONSource | undefined)?.setData(data);

    // Pins glide from where they were to the new fix instead of jumping.
    cancelAnimationFrame(glide.current);
    const from = new Map(shown.current);
    const start = performance.now();
    const draw = (k: number) => {
      const pos = (x: MapEmployee): [number, number] => {
        const f = from.get(x.id);
        return f ? [f[0] + (x.lng - f[0]) * k, f[1] + (x.lat - f[1]) * k] : [x.lng, x.lat];
      };
      shown.current = new Map(e.map((x) => [x.id, pos(x)]));
      set('employees', { type: 'FeatureCollection', features: e.map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: pos(x) }, properties: { id: x.id, name: x.name, state: x.state, stale: !!x.stale, live: !!x.live && !x.stale } })) });
      set('selected', { type: 'FeatureCollection', features: e.filter((x) => x.id === sel).map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: pos(x) }, properties: {} })) });
    };
    const moving = e.some((x) => { const f = from.get(x.id); return f && (f[0] !== x.lng || f[1] !== x.lat); });
    if (!moving) draw(1);
    else {
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / GLIDE_MS);
        draw(ease(k));
        if (k < 1) glide.current = requestAnimationFrame(step);
      };
      glide.current = requestAnimationFrame(step);
    }
    set('sites', { type: 'FeatureCollection', features: s.map((x) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [circle(x.lat, x.lng, x.radius)] }, properties: { name: x.name, color: siteColor(x.id) } })) });
    set('route-points', { type: 'FeatureCollection', features: r.map((x, i) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lng, x.lat] }, properties: { i } })) });
    const { lines, jumps } = routeLines(r, g);
    set('route', { type: 'FeatureCollection', features: lines });
    set('route-gaps', { type: 'FeatureCollection', features: jumps });
    set('stops', { type: 'FeatureCollection', features: st.map((x) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [x.lng, x.lat] }, properties: { label: x.label } })) });
    set('playhead', { type: 'FeatureCollection', features: p ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: {} }] : [] });
  };

  // Fits once per fitKey, and only when there is data: an empty first paint must not use up the fit.
  const fit = () => {
    const map = mapRef.current;
    const { employees: e, route: r, sites: s, stops: st, fitKey: key } = latest.current;
    if (!map || !ready.current || key === lastFit.current) return;
    const coords: Array<[number, number]> = [...r.map((x) => [x.lng, x.lat] as [number, number]), ...e.map((x) => [x.lng, x.lat] as [number, number]), ...st.map((x) => [x.lng, x.lat] as [number, number])];
    if (!coords.length) s.forEach((x) => coords.push([x.lng, x.lat]));
    if (!coords.length) return;
    lastFit.current = key;
    const bounds = coords.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 400 });
  };

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({ container: container.current, style: MAP_STYLE_URL, center: [78.96, 20.59], zoom: 4, attributionControl: { compact: true } });
    } catch {
      // No WebGL in this browser.
      setFailed(true);
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // A style or tile failure before the first load leaves a blank box; say so instead.
    map.on('error', () => {
      if (!ready.current) setFailed(true);
    });

    map.on('load', () => {
      map.addSource('sites', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'sites-fill', type: 'fill', source: 'sites', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.16 } });
      map.addLayer({ id: 'sites-line', type: 'line', source: 'sites', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });
      map.addLayer({ id: 'sites-name', type: 'symbol', source: 'sites', layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Noto Sans Regular'], 'text-max-width': 8 }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': '#ffffff', 'text-halo-width': 2 } });

      map.addSource('route', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#111111', 'line-width': 3, 'line-opacity': 0.85 } });
      map.addSource('route-gaps', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'route-gap-line', type: 'line', source: 'route-gaps', paint: { 'line-color': '#9ca3af', 'line-width': 2, 'line-dasharray': [1.5, 2] } });

      map.addSource('route-points', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'route-points-dot', type: 'circle', source: 'route-points', minzoom: 9, paint: { 'circle-radius': 4, 'circle-color': '#ffffff', 'circle-stroke-color': '#111111', 'circle-stroke-width': 1.5 } });

      map.addSource('stops', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'stops-dot', type: 'circle', source: 'stops', paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': '#111111', 'circle-stroke-width': 2 } });

      map.addSource('employees', { type: 'geojson', data: EMPTY, cluster: true, clusterRadius: 42, clusterMaxZoom: 14 });
      map.addLayer({ id: 'clusters', type: 'circle', source: 'employees', filter: ['has', 'point_count'], paint: { 'circle-color': '#111111', 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26] } });
      map.addLayer({ id: 'cluster-count', type: 'symbol', source: 'employees', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#ffffff' } });
      map.addLayer({ id: 'employee-pulse', type: 'circle', source: 'employees', filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'live'], true]], paint: { 'circle-radius': 8, 'circle-color': colorExpression, 'circle-opacity': 0 } });
      map.addLayer({ id: 'employee-dot', type: 'circle', source: 'employees', filter: ['!', ['has', 'point_count']], paint: { 'circle-radius': 8, 'circle-color': colorExpression, 'circle-opacity': ['case', ['get', 'stale'], 0.4, 1], 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'employee-name', type: 'symbol', source: 'employees', filter: ['!', ['has', 'point_count']], minzoom: 12, layout: { 'text-field': ['get', 'name'], 'text-size': 11, 'text-offset': [0, 1.4], 'text-font': ['Noto Sans Regular'] }, paint: { 'text-color': '#111111', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });

      map.addSource('selected', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'selected-ring', type: 'circle', source: 'selected', paint: { 'circle-radius': 14, 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': '#111111', 'circle-stroke-width': 2 } });

      map.addSource('playhead', { type: 'geojson', data: EMPTY });
      map.addLayer({ id: 'playhead-pulse', type: 'circle', source: 'playhead', paint: { 'circle-radius': 7, 'circle-color': '#111111', 'circle-opacity': 0 } });
      map.addLayer({ id: 'playhead-dot', type: 'circle', source: 'playhead', paint: { 'circle-radius': 7, 'circle-color': '#111111', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });

      map.on('click', 'employee-dot', (ev) => {
        const id = ev.features?.[0]?.properties?.id;
        if (id !== undefined) selectRef.current?.(Number(id));
      });
      map.on('click', 'clusters', async (ev) => {
        const feature = map.queryRenderedFeatures(ev.point, { layers: ['clusters'] })[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId === undefined) return;
        const zoom = await (map.getSource('employees') as maplibregl.GeoJSONSource).getClusterExpansionZoom(clusterId);
        map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      });
      const popup = new maplibregl.Popup({ closeButton: false, offset: 12, maxWidth: '260px' });
      const show = (lngLat: maplibregl.LngLatLike, html: string) => popup.setLngLat(lngLat).setHTML(html).addTo(map);
      map.on('click', 'employee-dot', (ev) => {
        const id = Number(ev.features?.[0]?.properties?.id);
        const x = latest.current.employees.find((m) => m.id === id);
        if (!x) return;
        show([x.lng, x.lat], popupHtml(x.name, [
          ['Code', x.code],
          ['Status', STATE_LABEL[x.state]],
          ['Site', x.siteName],
          ['Last fix', x.recordedAt ? formatDateTime(x.recordedAt) : 'none'],
          ['Accuracy', x.accuracy != null && x.recordedAt ? `±${Math.round(x.accuracy)} m` : null],
          ['Battery', x.battery != null ? `${x.battery}%` : null],
        ]));
      });
      map.on('click', 'route-points-dot', (ev) => {
        const i = Number(ev.features?.[0]?.properties?.i);
        const pt = latest.current.route[i];
        if (!pt) return;
        const ext = pt as { acc?: number | null; battery?: number | null };
        show([pt.lng, pt.lat], popupHtml(pt.at ? formatDateTime(pt.at) : `Point ${i + 1}`, [
          ['Point', `${i + 1} of ${latest.current.route.length}`],
          ['Accuracy', ext.acc != null ? `±${Math.round(ext.acc)} m` : null],
          ['Battery', ext.battery != null ? `${ext.battery}%` : null],
        ]));
      });
      map.on('click', 'sites-fill', (ev) => {
        // A pin or route dot on top of the site wins.
        if (map.queryRenderedFeatures(ev.point, { layers: ['employee-dot', 'route-points-dot', 'clusters'] }).length) return;
        const name = String(ev.features?.[0]?.properties?.name ?? '');
        const site = latest.current.sites.find((f) => f.name === name);
        show(ev.lngLat, popupHtml(name, [['Radius', site ? `${Math.round(site.radius)} m` : null]]));
      });
      for (const layer of ['employee-dot', 'clusters', 'route-points-dot', 'sites-fill']) {
        map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
      }

      // Pulse rings for live pins and the playhead, ~30 fps; skipped when the user prefers less motion.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        let last = 0;
        const tick = (now: number) => {
          raf.current = requestAnimationFrame(tick);
          if (now - last < 33 || !mapRef.current) return;
          last = now;
          const t = (now % 1600) / 1600;
          map.setPaintProperty('employee-pulse', 'circle-radius', 8 + 18 * t);
          map.setPaintProperty('employee-pulse', 'circle-opacity', 0.45 * (1 - t));
          map.setPaintProperty('playhead-pulse', 'circle-radius', 7 + 16 * t);
          map.setPaintProperty('playhead-pulse', 'circle-opacity', 0.4 * (1 - t));
        };
        raf.current = requestAnimationFrame(tick);
      }

      ready.current = true;
      setFailed(false);
      paint();
      fit();
    });

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      cancelAnimationFrame(glide.current);
      ready.current = false;
      map.remove();
      mapRef.current = null;
    };
    // The map is created once; data flows in through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, sites, route, gaps, stops, playhead, selectedId]);

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, employees.length, route.length, stops.length, sites.length]);

  const focusSeq = focus?.seq;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready.current || !focus) return;
    map.easeTo({ center: [focus.lng, focus.lat], zoom: Math.max(map.getZoom(), 15), duration: 500 });
    // Only a new request moves the map, not a refreshed position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSeq]);

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" />
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-subtle p-4 text-center text-xs text-fg-muted">
          The map could not load. Check the connection and reload the page; the list still works.
        </div>
      )}
    </div>
  );
}

import { ROUTE_GAP_MS } from '../constants/tracking.constants';

interface Timed {
  at?: string;
}

/**
 * For each route point, whether the line from the previous point is a gap: the timeline marks a gap
 * segment over it, or (without segments) the two fixes are more than ROUTE_GAP_MS apart.
 * breaks[0] is always false.
 */
export function routeBreaks(route: Timed[], gaps: Array<{ from: string; to: string }> = []): boolean[] {
  const times = route.map((p) => (p.at ? new Date(p.at).getTime() : NaN));
  const spans = gaps.map((g) => [new Date(g.from).getTime(), new Date(g.to).getTime()] as const);
  return times.map((t, i) => {
    if (i === 0) return false;
    const prev = times[i - 1];
    if (!Number.isFinite(t) || !Number.isFinite(prev)) return false;
    if (t - prev > ROUTE_GAP_MS) return true;
    return spans.some(([from, to]) => from < t && to > prev);
  });
}

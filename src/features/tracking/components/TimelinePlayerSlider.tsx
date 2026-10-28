'use client';

import { useEffect, useRef, useState } from 'react';
import { Battery, ChevronLeft, ChevronRight, Clock, FastForward, Pause, Play } from 'lucide-react';
import { timeText } from '../constants/tracking.constants';
import type { RoutePointDto } from '../types/tracking.dto';

interface TimelinePlayerSliderProps {
  route: RoutePointDto[];
  /** Epoch ms of each route point, same order as `route`. */
  times: number[];
  /** breaks[i]: no track between point i-1 and point i (a gap). */
  breaks: boolean[];
  currentIndex: number;
  /** Playhead time in epoch ms. */
  currentTime: number;
  /** A new playhead time; null follows the latest point as the day refreshes. */
  onTimeChange: (time: number | null) => void;
  isToday?: boolean;
}

// Replay runs on route time: 1x plays two minutes of the day per second. Gaps are skipped at once.
const BASE_RATE = 120;
const TICK_MS = 100;
const SPEEDS = [
  { label: '1x', rate: BASE_RATE },
  { label: '2x', rate: BASE_RATE * 2 },
  { label: '4x', rate: BASE_RATE * 4 },
];

// Index of the last point at or before `t`.
export function indexAt(times: number[], t: number) {
  let lo = 0;
  let hi = times.length - 1;
  if (hi < 0 || t <= times[0]) return 0;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (times[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Typing in a field must not drive the player.
function isEditable(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && target.type !== 'range';
}

export function TimelinePlayerSlider({
  route,
  times,
  breaks,
  currentIndex,
  currentTime,
  onTimeChange,
  isToday = false,
}: TimelinePlayerSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalPoints = route.length;
  const maxIndex = Math.max(0, totalPoints - 1);
  const safeIndex = Math.min(Math.max(0, currentIndex), maxIndex);
  const currentPoint = route[safeIndex] ?? null;
  const start = times[0] ?? 0;
  const end = times[maxIndex] ?? 0;
  const span = Math.max(1, end - start);
  const isAtLastPoint = safeIndex === maxIndex;
  const isAtFirstPoint = safeIndex === 0 && currentTime <= start;

  const currentSpeed = SPEEDS[speedIndex];

  const state = useRef({ currentTime, times, breaks, onTimeChange });
  state.current = { currentTime, times, breaks, onTimeChange };

  // Time-based replay: advance the playhead clock, jump straight over gaps.
  useEffect(() => {
    if (!isPlaying || totalPoints <= 1) return;
    const interval = setInterval(() => {
      const { currentTime: now, times: ts, breaks: br, onTimeChange: emit } = state.current;
      const last = ts.length - 1;
      let next = now + TICK_MS * currentSpeed.rate;
      const i = indexAt(ts, now);
      if (i < last && br[i + 1] && next < ts[i + 1]) next = ts[i + 1];
      if (next >= ts[last]) {
        setIsPlaying(false);
        emit(null);
      } else {
        emit(next);
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [isPlaying, totalPoints, currentSpeed.rate]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (isAtLastPoint) onTimeChange(start);
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length);
  };

  const stepPrev = () => {
    setIsPlaying(false);
    // From between two points, the previous point is the one the playhead sits on.
    const target = currentTime > times[safeIndex] ? safeIndex : Math.max(0, safeIndex - 1);
    onTimeChange(times[target]);
  };

  const stepNext = () => {
    setIsPlaying(false);
    const target = Math.min(maxIndex, safeIndex + 1);
    onTimeChange(target === maxIndex ? null : times[target]);
  };

  const jumpToLatest = () => {
    setIsPlaying(false);
    onTimeChange(null);
  };

  // Space plays / pauses, Left / Right step one point, unless the focus is in a text field.
  const keys = useRef({ togglePlay, stepPrev, stepNext });
  keys.current = { togglePlay, stepPrev, stepNext };
  useEffect(() => {
    if (totalPoints <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isEditable(e.target)) return;
      // Space on a focused button already clicks that button.
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        keys.current.togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        keys.current.stepPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        keys.current.stepNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalPoints]);

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || maxIndex === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(start + ratio * span);
  };

  const progressPercent = Math.max(0, Math.min(100, ((currentTime - start) / span) * 100));
  const hoverPercent = hoverTime !== null ? ((hoverTime - start) / span) * 100 : 0;

  if (totalPoints <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-line bg-surface p-2.5 shadow-2xs">
      {/* Top Controls & Metadata Row - Strictly Monochrome Black & White Theme */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          {/* Step Back */}
          <button
            type="button"
            onClick={stepPrev}
            disabled={isAtFirstPoint}
            title="Previous point (←)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface text-fg shadow-2xs transition-colors hover:bg-bg-subtle active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Play / Pause Main Button */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Pause replay (Space)' : 'Play route replay (Space)'}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-fg text-surface shadow-2xs transition-all hover:bg-neutral-800 active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
            )}
          </button>

          {/* Step Forward */}
          <button
            type="button"
            onClick={stepNext}
            disabled={isAtLastPoint}
            title="Next point (→)"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface text-fg shadow-2xs transition-colors hover:bg-bg-subtle active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={cycleSpeed}
            title="Toggle speed"
            className="flex h-7 items-center gap-1 rounded-lg border border-line bg-surface px-1.5 text-[11px] font-semibold text-fg shadow-2xs transition-colors hover:bg-bg-subtle active:scale-95"
          >
            <FastForward className="h-3 w-3 text-fg-muted" />
            <span>{currentSpeed.label}</span>
          </button>
        </div>

        {/* Current Time Badge & Metadata */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Playhead time; the map shows the last fix at or before it */}
          <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg shadow-2xs">
            <Clock className="h-3 w-3 text-fg-muted" />
            <span>{timeText(new Date(currentTime).toISOString())}</span>
          </div>

          {/* Point Counter */}
          <div className="rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-muted shadow-2xs" title={currentPoint ? `Fix at ${timeText(currentPoint.at)}` : undefined}>
            Point <span className="font-semibold text-fg">{safeIndex + 1}</span> /{' '}
            <span className="font-medium text-fg">{totalPoints}</span>
          </div>

          {/* Battery if available */}
          {currentPoint?.battery !== null && currentPoint?.battery !== undefined && (
            <div className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-muted shadow-2xs">
              <Battery className="h-3 w-3 text-fg-muted" />
              <span>{currentPoint.battery}%</span>
            </div>
          )}

          {/* Jump to Latest / Last Point Button - Monochrome Black & White */}
          <button
            type="button"
            onClick={jumpToLatest}
            title="Jump to latest point"
            className={`flex h-6.5 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-all ${
              isAtLastPoint
                ? 'border-fg bg-fg text-surface shadow-2xs'
                : 'border-line bg-surface text-fg hover:border-line-strong hover:bg-bg-subtle active:scale-95'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAtLastPoint ? 'bg-surface' : 'bg-fg-muted'
              }`}
            />
            <span>{isToday ? 'Latest' : 'Last'}</span>
          </button>
        </div>
      </div>

      {/* Modern Scrubber Track Area: positions are by time, so gaps take their real width */}
      <div className="relative pt-1">
        {/* Floating Tooltip */}
        {hoverTime !== null && (
          <div
            className="pointer-events-none absolute -top-5 z-20 -translate-x-1/2 rounded bg-fg px-1.5 py-0.5 text-[10px] font-medium text-surface shadow-md transition-all duration-75"
            style={{ left: `${hoverPercent}%` }}
          >
            {timeText(new Date(hoverTime).toISOString())}
          </div>
        )}

        <div
          ref={trackRef}
          onMouseLeave={() => setHoverTime(null)}
          onMouseMove={handleTrackMouseMove}
          className="relative flex h-5 w-full cursor-pointer items-center"
        >
          {/* Visual Track Rail */}
          <div className="relative h-1.5 w-full rounded-full bg-line transition-colors">
            {/* Progress Fill - Monochrome */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-fg transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />

            {/* Hover ghost marker */}
            {hoverTime !== null && (
              <div
                className="absolute top-0 h-full w-0.5 rounded-full bg-fg-muted"
                style={{ left: `${hoverPercent}%` }}
              />
            )}
          </div>

          {/* Visual Thumb - Monochrome */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-fg bg-surface shadow-xs transition-transform duration-75 group-hover:scale-125"
            style={{ left: `${progressPercent}%` }}
          />

          {/* Accessible Functional Range Input */}
          <input
            type="range"
            min={start}
            max={end}
            step={1000}
            value={Math.min(end, Math.max(start, currentTime))}
            onChange={(e) => {
              setIsPlaying(false);
              const t = Number(e.target.value);
              onTimeChange(t >= end ? null : t);
            }}
            aria-label="Timeline scrubber"
            aria-valuetext={timeText(new Date(currentTime).toISOString())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Start & End Timestamp Labels */}
        <div className="flex items-center justify-between text-[10px] font-medium text-fg-muted">
          <span>Start: {timeText(route[0]?.at)}</span>
          <span className="text-fg-subtle">{Math.round(progressPercent)}%</span>
          <span>End: {timeText(route[maxIndex]?.at)}</span>
        </div>
      </div>
    </div>
  );
}

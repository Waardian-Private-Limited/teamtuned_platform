'use client';

import { useEffect, useRef, useState } from 'react';
import { Battery, ChevronLeft, ChevronRight, Clock, FastForward, Pause, Play } from 'lucide-react';
import { timeText } from '../constants/tracking.constants';
import type { RoutePointDto } from '../types/tracking.dto';

interface TimelinePlayerSliderProps {
  route: RoutePointDto[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  isToday?: boolean;
}

const SPEEDS = [
  { label: '1x', ms: 400 },
  { label: '2x', ms: 200 },
  { label: '4x', ms: 100 },
];

export function TimelinePlayerSlider({
  route,
  currentIndex,
  onIndexChange,
  isToday = false,
}: TimelinePlayerSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isHoveringTrack, setIsHoveringTrack] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const totalPoints = route.length;
  const maxIndex = Math.max(0, totalPoints - 1);
  const safeIndex = Math.min(Math.max(0, currentIndex), maxIndex);
  const currentPoint = route[safeIndex] ?? null;
  const isAtLastPoint = safeIndex === maxIndex;
  const isAtFirstPoint = safeIndex === 0;

  const currentSpeed = SPEEDS[speedIndex];

  const currentIndexRef = useRef(safeIndex);
  currentIndexRef.current = safeIndex;

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying || totalPoints <= 1) return;

    const interval = setInterval(() => {
      const next = currentIndexRef.current + 1;
      if (next >= maxIndex) {
        setIsPlaying(false);
        onIndexChange(maxIndex);
      } else {
        onIndexChange(next);
      }
    }, currentSpeed.ms);

    return () => clearInterval(interval);
  }, [isPlaying, maxIndex, totalPoints, currentSpeed.ms, onIndexChange]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (isAtLastPoint) {
        onIndexChange(0);
      }
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    setSpeedIndex((prev) => (prev + 1) % SPEEDS.length);
  };

  const stepPrev = () => {
    setIsPlaying(false);
    onIndexChange(Math.max(0, safeIndex - 1));
  };

  const stepNext = () => {
    setIsPlaying(false);
    onIndexChange(Math.min(maxIndex, safeIndex + 1));
  };

  const jumpToLatest = () => {
    setIsPlaying(false);
    onIndexChange(maxIndex);
  };

  const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || maxIndex === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * maxIndex));
  };

  const progressPercent = maxIndex > 0 ? (safeIndex / maxIndex) * 100 : 0;
  const hoverPoint = hoverIndex !== null && route[hoverIndex] ? route[hoverIndex] : null;
  const hoverPercent = hoverIndex !== null && maxIndex > 0 ? (hoverIndex / maxIndex) * 100 : 0;

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
          {/* Exact Timestamp */}
          <div className="flex items-center gap-1 rounded-lg border border-line bg-bg-subtle px-2 py-0.5 text-xs font-semibold text-fg shadow-2xs">
            <Clock className="h-3 w-3 text-fg-muted" />
            <span>{timeText(currentPoint?.at)}</span>
          </div>

          {/* Point Counter */}
          <div className="rounded-lg border border-line bg-surface px-2 py-0.5 text-[11px] text-fg-muted shadow-2xs">
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

      {/* Modern Scrubber Track Area */}
      <div className="relative pt-1">
        {/* Floating Tooltip */}
        {isHoveringTrack && hoverPoint && (
          <div
            className="pointer-events-none absolute -top-5 z-20 -translate-x-1/2 rounded bg-fg px-1.5 py-0.5 text-[10px] font-medium text-surface shadow-md transition-all duration-75"
            style={{ left: `${hoverPercent}%` }}
          >
            {timeText(hoverPoint.at)}
          </div>
        )}

        <div
          ref={trackRef}
          onMouseEnter={() => setIsHoveringTrack(true)}
          onMouseLeave={() => {
            setIsHoveringTrack(false);
            setHoverIndex(null);
          }}
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
            {isHoveringTrack && hoverIndex !== null && (
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
            min={0}
            max={maxIndex}
            value={safeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onIndexChange(Number(e.target.value));
            }}
            aria-label="Timeline scrubber"
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

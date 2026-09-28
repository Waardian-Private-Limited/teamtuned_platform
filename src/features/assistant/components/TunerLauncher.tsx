'use client';

import { X } from 'lucide-react';

interface TunerLauncherProps {
  open: boolean;
  onClick: () => void;
}

// Fixed circular launcher, bottom-right, on every authenticated page.
// Pure white background for the black animated chat bot SVG, no beta tag on launcher.
export function TunerLauncher({ open, onClick }: TunerLauncherProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close Tuner' : 'Open Tuner'}
      aria-expanded={open}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full
        bg-white border border-zinc-200/90 shadow-xl
        transition-all duration-200 hover:scale-105 active:scale-95
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)]"
    >
      {open ? (
        <X size={22} className="text-zinc-900" />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden">
          <img
            src="/chat-bot-animation.svg"
            alt="Tuner Assistant"
            className="h-full w-full object-contain pointer-events-none"
          />
        </div>
      )}
    </button>
  );
}

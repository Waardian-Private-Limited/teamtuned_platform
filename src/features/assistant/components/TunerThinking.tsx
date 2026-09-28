import { motion } from 'framer-motion';

// Opacity-only animation per the platform's motion rule (no transforms
// beyond what framer-motion needs internally, no decorative movement).
const dotTransition = (delay: number) => ({
  duration: 0.9,
  repeat: Infinity,
  ease: 'easeInOut' as const,
  delay,
});

export function TunerThinking() {
  return (
    <div className="flex w-full justify-start">
      <div className="flex items-center gap-1.5 rounded-[var(--tt-radius-md)] bg-bg-subtle px-3.5 py-3">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-fg-subtle"
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={dotTransition(delay)}
          />
        ))}
      </div>
    </div>
  );
}

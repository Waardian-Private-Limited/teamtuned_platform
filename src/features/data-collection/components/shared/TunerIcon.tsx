/** Tuner's own mark (the assistant's bot), used wherever Tuner drafts something. */
export function TunerIcon({ className = 'h-4 w-4' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/chat-bot-animation.svg" alt="" aria-hidden className={className} />;
}

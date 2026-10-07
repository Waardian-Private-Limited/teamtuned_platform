import { UserRound } from 'lucide-react';

/** A round photo, or a person icon when there is none. */
export function Avatar({ src, size = 9 }: { src: string | null; size?: 8 | 9 }) {
  const box = size === 8 ? 'h-8 w-8' : 'h-9 w-9';
  return src
    ? <img src={src} alt="" className={`${box} shrink-0 rounded-full border border-line object-cover`} loading="lazy" />
    : <span className={`flex ${box} shrink-0 items-center justify-center rounded-full border border-line bg-bg-subtle text-fg-muted`}><UserRound className="h-4 w-4" /></span>;
}

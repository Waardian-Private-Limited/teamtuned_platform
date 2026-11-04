'use client';

import React from 'react';
import { cx } from '@/theme/tokens';

const SIZE = { sm: 'h-9 w-9 text-xs', md: 'h-12 w-12 text-sm', lg: 'h-16 w-16 text-base', xl: 'h-40 w-40 text-3xl' } as const;

/** A labourer's registered face; the initials stand in when there is none or the short-lived link no longer loads. */
export function FaceAvatar({ name, url, size = 'sm', className }: { name: string; url?: string | null; size?: keyof typeof SIZE; className?: string }) {
  const [failed, setFailed] = React.useState<string | null>(null);
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  const box = cx('shrink-0 rounded-xl', SIZE[size], className);
  if (url && failed !== url) {
    // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link, not an optimisable asset
    return <img src={url} alt="" onError={() => setFailed(url)} className={cx(box, 'border border-line bg-bg-subtle object-cover')} />;
  }
  return <span aria-hidden className={cx(box, 'flex items-center justify-center border border-line bg-bg-subtle font-bold text-fg-muted')}>{letters}</span>;
}

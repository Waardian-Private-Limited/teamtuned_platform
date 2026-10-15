'use client';

import { useState } from 'react';
import { cx } from '@/theme/tokens';

const SIZES = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-20 w-20 text-2xl sm:h-24 sm:w-24 sm:text-3xl',
};

export function ProfileAvatar({
  name,
  initials,
  photoUrl,
  size = 'md',
}: {
  name: string;
  initials: string;
  photoUrl: string | null;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(photoUrl) && !failed;
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-bg-subtle font-extrabold text-fg',
        SIZES[size]
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl!} alt={name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <span aria-label={name}>{initials}</span>
      )}
    </div>
  );
}

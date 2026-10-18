'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { cx } from '@/theme/tokens';
import type { DevicePlatform } from '../../types/employeeDevices.model';
import { platformLabel } from '../../utils/deviceFormat';

// Platform icon plus its name. Android and iPhone share the phone glyph; the
// label tells them apart (the screen stays monochrome).
export function PlatformIcon({ platform, className }: { platform: DevicePlatform; className?: string }) {
  const Icon = platform === 'web' ? Monitor : Smartphone;
  return <Icon className={cx('h-3.5 w-3.5 shrink-0', className)} aria-hidden="true" />;
}

export function PlatformLabel({ platform, className }: { platform: DevicePlatform; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-xs text-fg-muted', className)}>
      <PlatformIcon platform={platform} />
      <span>{platformLabel(platform)}</span>
    </span>
  );
}

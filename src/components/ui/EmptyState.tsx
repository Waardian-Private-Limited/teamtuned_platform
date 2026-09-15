import Image from 'next/image';
import { cx, heading, text, button } from '@/theme/tokens';

interface EmptyStateProps {
  illustration?: { src: string; width: number; height: number; alt: string };
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'link' };
  /** Compact skips the illustration and tightens the padding — for a filtered-to-nothing state. */
  compact?: boolean;
}

export function EmptyState({ illustration, title, description, action, compact }: EmptyStateProps) {
  const actionVariant = action?.variant ?? 'primary';
  return (
    <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-16')}>
      {illustration && !compact && (
        <div className="mb-6 w-full max-w-[280px]">
          <Image
            src={illustration.src}
            alt={illustration.alt}
            width={illustration.width}
            height={illustration.height}
            className="h-auto w-full object-contain"
            priority={false}
          />
        </div>
      )}
      <h3 className={heading.sm}>{title}</h3>
      {description && <p className={cx(text.body, 'mt-1 max-w-sm')}>{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={cx(
            'mt-5',
            actionVariant === 'primary' ? cx(button.primary, 'w-auto px-5') : button.link
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

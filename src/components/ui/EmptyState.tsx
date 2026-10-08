import Image from 'next/image';
import { cx, heading, text, button } from '@/theme/tokens';

interface EmptyStateProps {
  illustration?: { src: string; width: number; height: number; alt: string; className?: string };
  illustrationClassName?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; variant?: 'primary' | 'link' };
  /** Compact skips the illustration and tightens the padding — for a filtered-to-nothing state. */
  compact?: boolean;
}

export function EmptyState({ illustration, illustrationClassName, title, description, action, compact }: EmptyStateProps) {
  const actionVariant = action?.variant ?? 'primary';
  return (
    <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'py-8' : 'py-10')}>
      {illustration && !compact && (
        <div
          style={{ maxWidth: illustration.width ? `${illustration.width}px` : undefined }}
          className={cx('mb-4 flex w-full max-w-[180px] justify-center sm:max-w-[220px]', illustrationClassName || illustration.className)}
        >
          <Image
            src={illustration.src}
            alt={illustration.alt}
            width={illustration.width}
            height={illustration.height}
            className="h-auto w-auto max-h-[140px] object-contain sm:max-h-[160px]"
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
            'mt-4 inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] sm:text-sm',
            actionVariant === 'primary'
              ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]'
              : button.link
          )}
        >
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
}

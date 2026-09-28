import { cx } from '@/theme/tokens';
import type { ChatMessage } from '../types/assistant.types';

export function TunerMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cx('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[85%] whitespace-pre-line break-words rounded-[var(--tt-radius-md)] px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-[var(--tt-primary)] text-[var(--tt-on-primary)]'
            : 'bg-bg-subtle text-fg'
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

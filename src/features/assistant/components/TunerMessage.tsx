import Link from 'next/link';
import { cx } from '@/theme/tokens';
import type { ChatMessage } from '../types/assistant.types';

// App paths Tuner mentions ("/employee/leave") become links; everything else stays plain text.
const APP_PATH = /(\/(?:employee|org-admin|org|superadmin)(?:\/[A-Za-z0-9\-_]+)*)/g;

function withLinks(text: string) {
  return text.split(APP_PATH).map((part, i) =>
    i % 2 === 1 ? (
      <Link key={i} href={part} className="font-medium underline underline-offset-2">
        {part}
      </Link>
    ) : (
      part
    )
  );
}

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
        {isUser ? message.text : withLinks(message.text)}
      </div>
    </div>
  );
}

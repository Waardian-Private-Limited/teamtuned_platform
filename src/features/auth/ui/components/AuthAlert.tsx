import { alert } from '@/theme/tokens';

// Inline feedback for a step. Renders nothing when there is no message.
export function AuthAlert({ message, tone = 'error' }: { message?: string; tone?: 'error' | 'success' | 'info' }) {
  if (!message) return null;
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={alert[tone]}>
      {message}
    </p>
  );
}

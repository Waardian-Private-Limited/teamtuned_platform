import { alert } from '@/theme/tokens';

export function AuthAlert({ message, tone = 'error' }: { message?: string; tone?: 'error' | 'success' | 'info' }) {
  if (!message) return null;
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={alert[tone]}>
      {message}
    </p>
  );
}

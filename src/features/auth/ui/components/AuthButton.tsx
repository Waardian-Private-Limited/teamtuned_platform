import { button } from '@/theme/tokens';

type Variant = keyof typeof button;

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
}

// Single button used across every auth step; variants come from the theme.
export function AuthButton({
  variant = 'primary',
  loading = false,
  loadingLabel,
  disabled,
  children,
  className,
  ...rest
}: AuthButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={[button[variant], className].filter(Boolean).join(' ')}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {loading ? loadingLabel || children : children}
    </button>
  );
}

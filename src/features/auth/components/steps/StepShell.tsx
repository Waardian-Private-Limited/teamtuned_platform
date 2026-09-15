import { heading, text } from '@/theme/tokens';

/**
 * Wrapper every step shares: optional title block, then the step's own
 * controls on one rhythm. 16px between controls — enough that a 52px field and
 * the button under it stay distinct, tight enough that they still read as one
 * form.
 */
export function StepShell({
  title,
  subtitle,
  children,
  onSubmit,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
}) {
  const content = (
    <>
      {(title || subtitle) && (
        <header className="space-y-1 text-center">
          {title && <h2 className={heading.sm}>{title}</h2>}
          {subtitle && <p className={text.body}>{subtitle}</p>}
        </header>
      )}
      {children}
    </>
  );

  if (!onSubmit) return <div className="space-y-4">{content}</div>;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {content}
    </form>
  );
}

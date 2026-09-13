import { heading, text } from '@/theme/tokens';

// Common frame for a step: optional title/subtitle, then the step's own content.
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
        <header className="space-y-1">
          {title && <h2 className={heading.sm}>{title}</h2>}
          {subtitle && <p className={text.body}>{subtitle}</p>}
        </header>
      )}
      {children}
    </>
  );

  if (!onSubmit) return <div className="space-y-2.5 sm:space-y-3">{content}</div>;

  return (
    <form
      noValidate
      className="space-y-2.5 sm:space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {content}
    </form>
  );
}

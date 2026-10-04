export function Spinner({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`} />;
}

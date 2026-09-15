/**
 * Component recipes built on the CSS tokens in src/app/globals.css.
 *
 * Colors, radii and shadows are defined once in globals.css; this file turns
 * them into the class strings screens actually use. Restyle a button or heading
 * for the whole platform by editing it here — never by hand-rolling classes in
 * a page.
 */

// Type ramp. Sizes step up at sm/lg so one heading works on phone and desktop.
export const heading = {
  xl: 'text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-fg leading-[1.1]',
  lg: 'text-2xl sm:text-3xl font-bold tracking-tight text-fg leading-tight',
  md: 'text-xl sm:text-2xl font-semibold tracking-tight text-fg',
  sm: 'text-base sm:text-lg font-semibold text-fg',
} as const;

export const text = {
  lead: 'text-sm sm:text-base text-fg-muted leading-relaxed',
  body: 'text-sm text-fg-muted leading-relaxed',
  label: 'text-sm font-medium text-fg',
  caption: 'text-xs text-slate-500',
  overline: 'text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-subtle',
  /** Validation message shown under a field, in place of its hint. */
  error: 'text-xs font-medium text-[var(--tt-danger)]',
} as const;

// Shared button geometry; variants only swap color. Height and radius match
// `field.wrapper` exactly, so a button stacked under an input reads as one
// control family rather than two.
const buttonBase =
  'inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--tt-radius-control)] ' +
  'px-4 text-[15px] font-semibold tracking-[-0.01em] transition-all duration-150 ' +
  'active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--tt-ring)] ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';

export const button = {
  primary: `${buttonBase} bg-[var(--tt-primary)] text-[var(--tt-on-primary)] hover:bg-[var(--tt-primary-hover)]`,
  secondary: `${buttonBase} border border-line-strong bg-surface text-fg hover:bg-bg-subtle`,
  ghost: `${buttonBase} h-11 text-fg-muted hover:bg-bg-subtle hover:text-fg`,
  link: 'text-sm font-semibold text-fg underline-offset-4 transition-opacity hover:underline disabled:opacity-50',
} as const;

export const surface = {
  card: 'bg-surface rounded-[var(--tt-radius-lg)] border border-line shadow-[var(--tt-shadow-sm)]',
  panel: 'bg-surface-raised rounded-md border border-line',
  shell: 'bg-surface rounded-none sm:rounded-[var(--tt-radius-xl)] sm:shadow-[var(--tt-shadow-lg)]',
} as const;

export const field = {
  // Wrapper flips border color on focus; the input itself stays transparent.
  wrapper:
    'flex h-[52px] items-center gap-3 rounded-[var(--tt-radius-control)] border bg-surface px-4 transition-all duration-150',
  wrapperIdle: 'border-line hover:border-line-strong',
  wrapperFocused: 'border-[var(--tt-primary)] ring-4 ring-[var(--tt-ring)]',
  wrapperDisabled: 'opacity-50 bg-bg-subtle cursor-not-allowed',
  // Validation is shown on the field itself — a red border plus the message
  // underneath — never as a banner above the form.
  wrapperError: 'border-[var(--tt-danger)] ring-4 ring-[var(--tt-danger)]/10',
  // 16px minimum stops iOS Safari zooming the page on focus.
  input:
    'flex-1 min-w-0 bg-transparent text-base text-fg placeholder:text-fg-subtle outline-none border-none focus:ring-0',
  // Label sits tight above its control, not floating a full line away.
  label: 'mb-2 block text-[13px] font-semibold text-fg',
} as const;

export const scroll = {
  /** Scrolls normally; the scrollbar itself is not painted. */
  hidden: 'overflow-y-auto tt-scroll-hidden',
} as const;

export const alert = {
  error: 'rounded-[var(--tt-radius-md)] border border-[var(--tt-danger)]/25 bg-[var(--tt-danger-soft)] px-4 py-3 text-sm text-[var(--tt-danger)]',
  success: 'rounded-[var(--tt-radius-md)] border border-[var(--tt-success)]/25 bg-[var(--tt-success-soft)] px-4 py-3 text-sm text-[var(--tt-success)]',
  info: 'rounded-[var(--tt-radius-md)] border border-line bg-bg-subtle px-4 py-3 text-sm text-fg-muted',
} as const;

// Raw values for the few places that need a color in JS rather than a class.
export const palette = {
  fg: 'var(--tt-fg)',
  primary: 'var(--tt-primary)',
  accent: 'var(--tt-accent)',
  surface: 'var(--tt-surface)',
  muted: 'var(--tt-fg-muted)',
} as const;

// Joins conditional class names without pulling in a dependency.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

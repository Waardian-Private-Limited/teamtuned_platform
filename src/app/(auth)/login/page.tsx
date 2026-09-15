'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LoginCard } from '@/features/auth/components/LoginCard';
import { useSessionRedirect } from '@/features/auth/hooks/useSessionRedirect';

/**
 * Sign-in.
 *
 * One centred column, on the page's own ground — no split panel, no card
 * floating on a dark sheet. Everything sits on a single vertical axis: mark,
 * title, then the form, each centred on the one below it. On sm and up the
 * column gets a hairline and a soft shadow so it reads as a surface; on a
 * phone it stays flush, because a bordered box inside a 360px screen is just
 * two wasted gutters.
 */
export default function LoginPage() {
  const isCheckingSession = useSessionRedirect();

  if (isCheckingSession) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-bg-subtle">
        <span className="h-7 w-7 animate-spin rounded-full border-2 border-line-strong border-t-fg" />
      </main>
    );
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-bg px-5 py-8 sm:bg-bg-subtle sm:px-6 sm:py-10">
      <div className="w-full max-w-[420px]">
        <div className="rounded-none bg-transparent px-0 py-0 sm:rounded-[var(--tt-radius-xl)] sm:border sm:border-line sm:bg-surface sm:px-9 sm:py-10 sm:shadow-[var(--tt-shadow-md)]">
          <div className="flex flex-col items-center text-center">
            <Link href="/" className="transition-opacity hover:opacity-80">
              <Image
                src="/assets/LogoBlackText.png"
                alt="TeamTuned"
                width={1929}
                height={410}
                className="h-8 w-auto object-contain"
                priority
                quality={100}
              />
            </Link>
            <h1 className="mt-8 text-[1.6rem] font-bold leading-tight tracking-[-0.02em] text-fg">
              Sign in
            </h1>
            <p className="mt-1.5 text-sm text-fg-muted">
              Work email, a one-time code, or the mobile app.
            </p>
          </div>

          <div className="mt-8">
            <LoginCard />
          </div>
        </div>

        <footer className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
          <a
            href="https://www.waardian.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 transition-colors hover:text-fg-muted hover:underline"
          >
            Terms
          </a>
          <a
            href="https://www.waardian.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 transition-colors hover:text-fg-muted hover:underline"
          >
            Privacy
          </a>
          <a
            href="mailto:support@teamtuned.com"
            className="underline-offset-4 transition-colors hover:text-fg-muted hover:underline"
          >
            Support
          </a>
          <span>© {new Date().getFullYear()} TeamTuned</span>
        </footer>
      </div>
    </main>
  );
}

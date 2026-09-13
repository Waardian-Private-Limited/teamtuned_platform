'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { LoginCard } from '@/features/auth/ui/LoginCard';
import { InteractiveDotsBackground } from '@/features/auth/ui/components/InteractiveDotsBackground';
import { useSessionRedirect } from '@/features/auth/hooks/useSessionRedirect';

export default function LoginPage() {
  const isCheckingSession = useSessionRedirect();

  if (isCheckingSession) {
    return (
      <main className="flex h-[100dvh] items-center justify-center bg-[#08090d]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#0066ff]" />
          <p className="text-xs text-neutral-400">Checking your session…</p>
        </div>
      </main>
    );
  }

  return (
    <section className="relative min-h-[100dvh] w-full bg-[#08090d] text-neutral-100 flex flex-col items-center justify-between p-2 sm:p-3 lg:p-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden selection:bg-[#0066ff] selection:text-white">
      {/* Interactive mouse-connected constellation / dots background */}
      <InteractiveDotsBackground />

      {/* Top Header with Logo on Left & Support Link on Right */}
      <div className="relative z-10 w-full max-w-[1040px] flex items-center justify-between py-1.5 sm:py-2 px-1">
        <Link href="/" className="inline-flex items-center gap-2 transition-opacity hover:opacity-85">
          <Image
            src="/assets/LogoWhiteText.png"
            alt="TeamTuned"
            width={1929}
            height={410}
            className="h-6 sm:h-7 lg:h-8 w-auto object-contain"
            priority
            quality={100}
          />
        </Link>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="hidden sm:inline">Need help?</span>
          <a
            href="mailto:support@teamtuned.com"
            className="text-neutral-300 hover:text-white underline-offset-4 hover:underline transition-colors"
          >
            support@teamtuned.com
          </a>
        </div>
      </div>

      {/* Main 2-Panel Card - Fully Responsive Across Mobile, Tablet & Desktop */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative z-10 my-auto w-full max-w-md md:max-w-3xl lg:max-w-[1040px] bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_-12px_rgba(0,0,0,0.85),0_0_80px_-20px_rgba(0,102,255,0.18),0_0_0_1px_rgba(255,255,255,0.12)] grid grid-cols-1 md:grid-cols-2 overflow-hidden border border-white/10 md:min-h-[520px] lg:min-h-[580px] [@media(min-height:850px)]:lg:min-h-[640px] max-h-[calc(100dvh-85px)]"
      >
        {/* 1st Division (Left Panel): Shown on Tablet (Tab) & Desktop, hidden on small mobile phones */}
        <div className="hidden md:flex relative bg-gradient-to-b from-slate-50/90 via-[#f8fafc] to-slate-100/70 p-6 sm:p-7 lg:p-10 flex-col justify-between items-center text-center border-b md:border-b-0 md:border-r border-slate-100/90 overflow-hidden">
          {/* Headline & Description Centered */}
          <div className="max-w-xs md:max-w-sm lg:max-w-md mx-auto pt-1 lg:pt-2">
            <h1 className="text-xl md:text-2xl lg:text-3xl [@media(min-height:850px)]:text-[2rem] font-extrabold text-slate-900 tracking-tight leading-snug">
              Welcome to <span className="text-[#0066ff]">TeamTuned</span>
            </h1>

            <p className="mt-2 text-slate-600 text-xs sm:text-sm [@media(min-height:850px)]:text-[14.5px] leading-relaxed">
              Simplify your team management: from real-time attendance to task coordination, site operations, and reconciled data. Everything secured and digitized.
            </p>
          </div>

          {/* Clean Vector Illustration */}
          <div className="relative my-auto py-2 sm:py-3 lg:py-4 flex items-center justify-center w-full">
            <div className="relative w-full max-w-[220px] md:max-w-[300px] lg:max-w-[400px] xl:max-w-[440px]">
              <Image
                src="/vectors/loginVector.svg"
                alt="TeamTuned Workforce Illustration"
                width={800}
                height={646}
                className="w-full h-auto object-contain drop-shadow-sm"
                priority
              />
            </div>
          </div>
        </div>

        {/* 2nd Division (Right Panel): Authentication Engine */}
        <div className="p-6 sm:p-7 lg:p-10 flex flex-col justify-center bg-white overflow-y-auto [scrollbar-width:none]">
          <div className="mx-auto w-full max-w-sm sm:max-w-[380px] space-y-3 sm:space-y-4 [@media(min-height:850px)]:space-y-5">
            {/* Header: Sign in on Left */}
            <div className="text-left space-y-0.5">
              <h2 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold tracking-tight text-slate-900">
                Sign in
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Use your work email, a one-time code, or the mobile app.
              </p>
            </div>

            {/* Multi-step Authentication Component with Scan and Login */}
            <LoginCard />

            {/* Trust Footer Notice */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium text-center">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-50 text-[#0066ff] shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <span>
                Secured with <span className="font-semibold text-slate-800">256-bit SSL</span> encryption
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-[1040px] py-1 sm:py-1.5 text-center text-xs text-neutral-400 flex flex-col sm:flex-row items-center justify-between gap-y-1 px-1">
        <div className="flex items-center gap-3 sm:gap-4 pl-12 md:pl-14 lg:pl-0">
          <Link href="/about" className="hover:text-white transition-colors">
            About Us
          </Link>
          <span>·</span>
          <a
            href="https://www.waardian.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Terms & Conditions
          </a>
          <span>·</span>
          <a
            href="https://www.waardian.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            Privacy Policy
          </a>
        </div>

        <div className="text-neutral-500">
          © {new Date().getFullYear()} TeamTuned · Powered by{' '}
          <a
            href="https://www.waardian.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-white font-medium transition-colors"
          >
            Waardian
          </a>
        </div>
      </footer>
    </section>
  );
}

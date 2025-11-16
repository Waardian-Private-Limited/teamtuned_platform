'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import LoginFormTabs from '@/components/auth/LoginForm';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { checkSession as verifySession } from '@/lib/superadmincontroller';
import { useUserStore } from '@/lib/store/userStore';

export default function LoginPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const data = await verifySession();

        if (data?.isAuthenticated && data?.role && data?.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            role: data.role,
            societyId: data.user.societyId,
            name: data.user.name || '',
          });

          const roleRedirects: Record<string, string> = {
            superadmin: '/superadmin',
            orgadmin: '/org-admin',
            employee: '/employee',
          };

          const redirectPath = roleRedirects[(data.role || '').toLowerCase()] || '/dashboard';
          router.replace(redirectPath);
          return;
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkUserSession();
  }, [router, setUser]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center space-y-3 text-white">
          <div className="h-10 w-10 border-b-2 border-white rounded-full animate-spin" />
          <p className="text-sm">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-5xl bg-white rounded-2xl shadow-2xl grid grid-cols-1 md:grid-cols-2 overflow-hidden"
      >
        {/* Left Panel */}
        <div className="px-6 py-8 sm:p-12 flex flex-col justify-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Welcome to TeamTuned
          </h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base max-w-md">
            Simplify your Team management : from Attendance to Task Management, Data Management to Collection. Everything secured and digitized.
          </p>
          <Image
            src="/vectors/loginVector.svg"
            alt="Illustration"
            width={320}
            height={320}
            className="w-full h-auto object-contain mt-4"
            priority
          />
        </div>

        {/* Right Panel */}
        <div className="px-6 py-8 sm:p-12 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Image src="/assets/teamTunedLogos.png" alt="Logo" width={40} height={40} className="w-10 h-10" />
            <h1 className="text-xl font-bold text-gray-800">TeamTuned</h1>
          </div>
          <LoginFormTabs />
        </div>
      </motion.div>

      <footer className="relative z-10 mt-8 text-center text-xs text-gray-400 space-x-4">
        <a href="/about" className="hover:text-white">About Us</a>
        <a href="https://www.waardian.com/terms" className="hover:text-white">Terms & Conditions</a>
        <span className="block mt-2 text-gray-500">
          © {new Date().getFullYear()} Teamtuned. All rights reserved.
        </span>
        <span className="block mt-2 text-gray-500">
          Powered by <a href="https://www.waardian.com/" className="hover:text-white">Waardian</a>
        </span>
      </footer>
    </section>
  );
}
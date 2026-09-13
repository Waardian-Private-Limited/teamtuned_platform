import localFont from 'next/font/local';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';

// Exo is the brand face, self-hosted so it matches the mobile app exactly.
const exo = localFont({
  src: [
    { path: '../../public/fonts/Exo-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/Exo-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/Exo-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/Exo-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-exo',
  display: 'swap',
});

export const metadata = {
  title: 'TeamTuned',
  description: 'TeamTuned Platform',
};

// Locks the viewport to device width so the responsive breakpoints apply.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={exo.variable}>
      <body>
        <AuthProvider>
          <Toaster position="top-right" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

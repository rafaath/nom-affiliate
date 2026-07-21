import type { Metadata, Viewport } from 'next';
import { League_Spartan, Manrope, Space_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nom Partner Program',
    template: '%s | Nom Partner Program',
  },
  description:
    'Apply to the Nom Partner Program, refer restaurants after approval, and track eligible outcomes.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3021'),
  icons: {
    icon: [{ url: '/nom-icon.svg', type: 'image/svg+xml' }, { url: '/icon.png', sizes: '512x512' }],
    apple: [{ url: '/icon.png', sizes: '512x512' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#140018',
};

const manrope = Manrope({ subsets: ['latin'], variable: '--font-loaded-manrope' });
const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  variable: '--font-loaded-league-spartan',
  weight: ['500', '600', '700', '800'],
});
const spaceMono = Space_Mono({
  subsets: ['latin'],
  variable: '--font-loaded-space-mono',
  weight: ['400', '700'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${leagueSpartan.variable} ${spaceMono.variable}`}>
      <body>
        <Providers>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

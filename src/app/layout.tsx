import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { Providers } from '@/providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nom Partner Program',
    template: '%s | Nom Partner Program',
  },
  description:
    'Sell Nom to restaurants, help them go live, and earn through every successful onboarding.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3021'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#eff0dd',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster richColors closeButton position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

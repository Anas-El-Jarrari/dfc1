import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Nunito } from 'next/font/google';
import TabBar from '@/components/TabBar';
import { TourOverlay } from '@/features/tour/TourOverlay';
import { Providers } from '@/ui';
import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito' });

export const metadata: Metadata = {
  title: 'OpenMind – Deine Stimme. Deine Entscheidung.',
  description: 'KI-Begleitung für politische Beteiligung. Die KI entscheidet nie.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FBF6EF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={nunito.variable}>
      <body>
        <Providers>
          <Suspense>
            <main>{children}</main>
            <TabBar />
            <TourOverlay />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}

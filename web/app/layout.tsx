import type { Metadata, Viewport } from 'next';
import { Schibsted_Grotesk, Instrument_Sans, DM_Mono } from 'next/font/google';
import './globals.css';

const schibsted = Schibsted_Grotesk({ subsets: ['latin'], weight: ['700'], variable: '--font-schibsted' });
const instrument = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-instrument' });
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-dmmono' });

export const metadata: Metadata = {
  title: { default: 'PGhub: PGs, hostels and rented homes in Gandhinagar and Ahmedabad', template: '%s | PGhub' },
  description: 'Find boys and girls PGs, hostels and rented homes. Compare rent, sharing, food and area, then call the owner directly.',
  applicationName: 'PGhub',
  appleWebApp: { capable: true, title: 'PGhub', statusBarStyle: 'default' },
};
export const viewport: Viewport = { themeColor: '#f8f5ee', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${schibsted.variable} ${instrument.variable} ${mono.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

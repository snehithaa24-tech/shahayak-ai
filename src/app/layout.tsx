import type { Metadata, Viewport } from 'next';
import { Newsreader, Plus_Jakarta_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SAHAYAK (सहायक) — Hindi & English Voice Assistant',
  description:
    'A calm, accessible bilingual voice assistant supporting natural English, Hindi, and Hinglish conversations.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F7F5F0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${plusJakartaSans.variable} ${notoSansDevanagari.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-dvh flex flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)] antialiased selection:bg-[var(--accent-primary)] selection:text-[var(--accent-ink)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

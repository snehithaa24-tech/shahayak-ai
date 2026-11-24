import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SAHAYAK AI (सहायक) - Accessible Hindi & English Voice Assistant',
  description:
    'Real-time bilingual voice assistant supporting natural Hindi, English, and Hinglish conversations powered by Google Gemini Live.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body
        className="min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

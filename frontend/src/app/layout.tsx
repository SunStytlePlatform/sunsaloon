import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { DEFAULT_THEME, themeInitScript } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SUNS - Book your salon appointment', template: '%s | SUNS' },
  description: 'Discover salons and request your appointment online with SUNS.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <QueryProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
          <Toaster richColors position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}

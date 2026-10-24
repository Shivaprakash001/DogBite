import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';
import { AppHeader } from '@/components/AppHeader';
import { Providers } from '@/components/Providers';
import { getCopy } from '@/content/copy';
import './globals.css';

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap' });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' });

const copy = getCopy();

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: { default: `${copy.landing.headline} · ${copy.brand.product}`, template: `%s · ${copy.brand.product}` },
  description: copy.landing.sub,
  applicationName: copy.brand.product,
  icons: { icon: [{ url: '/brand/icon/favicon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico' }], apple: '/brand/icon/stayo-app-icon-clay-192.png' },
  openGraph: { siteName: `${copy.brand.product} ${copy.brand.by}`, type: 'website', locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#b46a55',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${manrope.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh">
        <div className="app-pattern" aria-hidden />
        <Providers>
          <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-4 pb-10">
            <AppHeader />
            <main id="main" className="flex flex-1 flex-col">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

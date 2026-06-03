import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});
const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});
export const metadata: Metadata = {
  title: 'Zetheta Screener — Real-Time Stock Screener',
  description:
    'Professional real-time stock screener with live price feeds, advanced filtering, candlestick charts, and 5000+ stocks. Built for traders and investors.',
  keywords: ['stock screener', 'real-time', 'trading', 'NSE', 'BSE', 'technical analysis'],
  openGraph: {
    title: 'Zetheta Screener',
    description: 'Real-Time Stock Screener — 5000+ Stocks, Live Prices, Advanced Filters',
    type: 'website',
  },
};
export const viewport: Viewport = {
  themeColor: '#0f1117',
  colorScheme: 'dark light',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

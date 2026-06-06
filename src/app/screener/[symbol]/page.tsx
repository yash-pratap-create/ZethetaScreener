import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getStockUniverse } from '@/lib/mockDataGenerator';
import { SymbolPageClient } from '@/features/screener/SymbolPageClient';

interface Props {
  params: Promise<{ symbol: string }>;
}

// Generate static paths for top 50 most-traded stocks
export async function generateStaticParams() {
  const universe = getStockUniverse();
  return universe.slice(0, 50).map((s) => ({ symbol: s.symbol }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const universe = getStockUniverse();
  const stock = universe.find((s) => s.symbol === symbol.toUpperCase());

  return {
    title: stock
      ? `${stock.symbol} — ${stock.companyName} | Zetheta Screener`
      : `${symbol} | Zetheta Screener`,
    description: stock
      ? `Real-time chart and analytics for ${stock.companyName} (${stock.symbol}) — Price, RSI, MACD, Bollinger Bands and more.`
      : `Stock chart and screener data for ${symbol}`,
  };
}

export default async function SymbolPage({ params }: Props) {
  const { symbol } = await params;
  const universe = getStockUniverse();
  const stock = universe.find((s) => s.symbol === symbol.toUpperCase());

  if (!stock) notFound();

  return <SymbolPageClient stock={stock} />;
}

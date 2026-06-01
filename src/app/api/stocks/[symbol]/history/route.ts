import { NextRequest, NextResponse } from 'next/server';
import { getStockUniverse } from '@/lib/mockDataGenerator';
import { generateOHLCV } from '@/lib/ohlcvGenerator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const start = performance.now();
  const { symbol } = await params;
  const uppercaseSymbol = symbol.toUpperCase();
  const universe = getStockUniverse();
  const stock = universe.find((s) => s.symbol === uppercaseSymbol);

  if (!stock) {
    return NextResponse.json({
      success: false,
      data: null,
      meta: {
        total: 0,
        page: 1,
        pageSize: 0,
        timestamp: new Date().toISOString(),
        executionTimeMs: Math.round(performance.now() - start),
      },
      error: {
        code: 'STOCK_NOT_FOUND',
        message: `Stock with symbol ${symbol} was not found.`,
      },
    }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.max(252, parseInt(searchParams.get('days') || '252'));

  const candles = generateOHLCV(
    stock.lastPrice,
    days,
    0.02 + (uppercaseSymbol.charCodeAt(0) % 5) * 0.005, // volatility correlated to symbol
    stock.volume
  );

  return NextResponse.json({
    success: true,
    data: candles,
    meta: {
      total: candles.length,
      page: 1,
      pageSize: candles.length,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

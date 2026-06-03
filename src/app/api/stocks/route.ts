import { NextRequest, NextResponse } from 'next/server';
import { getStockUniverse } from '@/lib/mockDataGenerator';
import { Stock } from '@/types';
const stockCache = new Map<
  string,
  {
    data: Stock[];
    timestamp: number;
  }
>();
const CACHE_TTL = 5 * 60 * 1000;
export async function GET(request: NextRequest) {
  const start = performance.now();
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '5000');
  const cached = stockCache.get('universe');
  let stocks: Stock[];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    stocks = cached.data;
  } else {
    stocks = getStockUniverse();
    stockCache.set('universe', { data: stocks, timestamp: Date.now() });
  }
  const paginated = stocks.slice((page - 1) * pageSize, page * pageSize);
  return NextResponse.json({
    success: true,
    data: paginated,
    meta: {
      total: stocks.length,
      page,
      pageSize,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

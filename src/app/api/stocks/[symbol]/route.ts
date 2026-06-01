import { NextRequest, NextResponse } from 'next/server';
import { getStockUniverse } from '@/lib/mockDataGenerator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
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

  // Adding premium extended fields dynamically
  const extendedStock = {
    ...stock,
    ceo: `Mr. Rajesh Kumar`,
    foundedYear: 1990 + (uppercaseSymbol.charCodeAt(0) % 25),
    employees: 1000 + (uppercaseSymbol.charCodeAt(1) % 50) * 200,
    headquarters: 'Mumbai, Maharashtra, India',
    about: `${stock.companyName} is a leading enterprise in the ${stock.sector} sector, delivering innovative solutions within the ${stock.industry} industry.`,
  };

  return NextResponse.json({
    success: true,
    data: extendedStock,
    meta: {
      total: 1,
      page: 1,
      pageSize: 1,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

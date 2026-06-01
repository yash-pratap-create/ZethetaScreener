import { NextRequest, NextResponse } from 'next/server';
import { getStockUniverse } from '@/lib/mockDataGenerator';

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

  // Generate dynamic 3-year fundamental history
  const years = ['FY24', 'FY25', 'FY26'];
  const revGrowth = stock.revenueGrowthYoY / 100;
  const profGrowth = stock.profitGrowthYoY / 100;

  // Let's back-calculate revenue and profit based on growth rates
  const fy26Revenue = stock.marketCap * 0.15; // rough scale
  const fy25Revenue = fy26Revenue / (1 + revGrowth);
  const fy24Revenue = fy25Revenue / (1 + revGrowth);

  const fy26NetProfit = fy26Revenue * (stock.netMargin / 100);
  const fy25NetProfit = fy26NetProfit / (1 + profGrowth);
  const fy24NetProfit = fy25NetProfit / (1 + profGrowth);

  const data = {
    ratios: {
      pe: stock.pe,
      pb: stock.pb,
      roe: stock.roe,
      roce: stock.roce,
      debtToEquity: stock.debtToEquity,
      currentRatio: stock.currentRatio,
      grossMargin: stock.grossMargin,
      operatingMargin: stock.operatingMargin,
      netMargin: stock.netMargin,
      evEbitda: stock.evEbitda,
    },
    financials: years.map((year, i) => {
      let revenue = fy26Revenue;
      let netProfit = fy26NetProfit;
      if (i === 0) {
        revenue = fy24Revenue;
        netProfit = fy24NetProfit;
      } else if (i === 1) {
        revenue = fy25Revenue;
        netProfit = fy25NetProfit;
      }

      const ebitda = revenue * (stock.operatingMargin / 100 || 0.15);
      const expenses = revenue - netProfit;
      const totalAssets = stock.marketCap * (1.2 - i * 0.1);
      const equity = totalAssets / (1 + stock.debtToEquity);
      const totalLiabilities = totalAssets - equity;

      return {
        year,
        revenue: Math.round(revenue * 100) / 100,
        expenses: Math.round(expenses * 100) / 100,
        ebitda: Math.round(ebitda * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        balanceSheet: {
          totalAssets: Math.round(totalAssets * 100) / 100,
          totalLiabilities: Math.round(totalLiabilities * 100) / 100,
          shareholdersEquity: Math.round(equity * 100) / 100,
          cashAndEquivalents: Math.round(totalAssets * 0.08 * 100) / 100,
          longTermDebt: Math.round(equity * stock.debtToEquity * 100) / 100,
        }
      };
    })
  };

  return NextResponse.json({
    success: true,
    data,
    meta: {
      total: 1,
      page: 1,
      pageSize: 1,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

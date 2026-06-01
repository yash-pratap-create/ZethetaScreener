import { NextRequest, NextResponse } from 'next/server';
import { getStockUniverse } from '@/lib/mockDataGenerator';

export async function GET(request: NextRequest) {
  const start = performance.now();
  const universe = getStockUniverse();

  const sectorMap = new Map<string, Set<string>>();
  universe.forEach((stock) => {
    if (!sectorMap.has(stock.sector)) {
      sectorMap.set(stock.sector, new Set());
    }
    if (stock.industry) {
      sectorMap.get(stock.sector)!.add(stock.industry);
    }
  });

  const sectorTree = Array.from(sectorMap.entries())
    .map(([sector, industrySet]) => ({
      sector,
      industries: Array.from(industrySet).sort(),
    }))
    .sort((a, b) => a.sector.localeCompare(b.sector));

  return NextResponse.json({
    success: true,
    data: sectorTree,
    meta: {
      total: sectorTree.length,
      page: 1,
      pageSize: sectorTree.length,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

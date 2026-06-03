import { NextRequest, NextResponse } from 'next/server';
import { getStockUniverse } from '@/lib/mockDataGenerator';
import { IndexMembership } from '@/types';
interface IndexInfo {
  id: IndexMembership;
  name: string;
  description: string;
}
const INDICES: IndexInfo[] = [
  {
    id: 'NIFTY50',
    name: 'Nifty 50',
    description: 'Benchmark index representing top 50 blue-chip companies listed on NSE.',
  },
  {
    id: 'NIFTY100',
    name: 'Nifty 100',
    description: 'Index measuring the performance of top 100 large-cap companies.',
  },
  {
    id: 'NIFTY500',
    name: 'Nifty 500',
    description: 'Broad market index tracking the top 500 companies by market capitalisation.',
  },
  {
    id: 'SENSEX',
    name: 'BSE Sensex',
    description: 'The oldest index in India, representing 30 financially sound large companies.',
  },
  {
    id: 'MIDCAP150',
    name: 'Nifty Midcap 150',
    description: 'Index representing the mid-cap segment of the market.',
  },
  {
    id: 'SMALLCAP250',
    name: 'Nifty Smallcap 250',
    description: 'Index tracking the performance of small-cap enterprises.',
  },
];
export async function GET(request: NextRequest) {
  const start = performance.now();
  const universe = getStockUniverse();
  const data = INDICES.map((idx) => {
    const constituents = universe
      .filter((stock) => stock.indexMembership?.includes(idx.id))
      .map((stock) => stock.symbol)
      .sort();
    return {
      ...idx,
      constituentsCount: constituents.length,
      constituents,
    };
  });
  return NextResponse.json({
    success: true,
    data,
    meta: {
      total: data.length,
      page: 1,
      pageSize: data.length,
      timestamp: new Date().toISOString(),
      executionTimeMs: Math.round(performance.now() - start),
    },
  });
}

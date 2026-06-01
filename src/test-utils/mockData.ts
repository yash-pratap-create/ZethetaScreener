/**
 * Mock data utilities for tests.
 * Provides deterministic, minimal stock fixtures without running
 * the full 5,000-stock generator.
 */

import type { Stock, FilterGroup } from '@/types';

export function createMockStock(overrides: Partial<Stock> = {}): Stock {
  return {
    id: 'stock-0',
    symbol: 'TESTCO',
    companyName: 'Test Company Ltd',
    sector: 'IT',
    industry: 'Software',
    marketCapCategory: 'Large Cap',
    indexMembership: ['NIFTY50', 'NIFTY100'],
    exchange: 'NSE',
    lastPrice: 1000,
    previousClose: 980,
    dayOpen: 985,
    dayHigh: 1020,
    dayLow: 975,
    changeAbsolute: 20,
    changePercent: 2.04,
    volume: 1500000,
    avgVolume20D: 1200000,
    week52High: 1250,
    week52Low: 700,
    marketCap: 250000,
    pe: 28,
    pb: 5.2,
    dividendYield: 1.2,
    eps: 35.7,
    roe: 22,
    roce: 18,
    debtToEquity: 0.3,
    currentRatio: 2.1,
    promoterHolding: 62,
    revenueGrowthYoY: 18,
    profitGrowthYoY: 24,
    grossMargin: 42,
    operatingMargin: 28,
    netMargin: 18,
    enterpriseValue: 260000,
    evEbitda: 22,
    freeCashFlow: 15000,
    rsi14: 55,
    sma50: 960,
    sma200: 890,
    ema20: 980,
    beta: 0.85,
    atr: 18.5,
    macdSignal: 'Bullish',
    bollingerPosition: 'Within',
    bollingerPct: 0.6,
    volumeVsAvg: 'Above',
    volumeRatio: 1.25,
    adx: 28,
    stochasticK: 65,
    cci: 85,
    williamsR: -35,
    priceVsSMA50: 4.17,
    priceVsSMA200: 12.36,
    week52HighProximity: 20,
    week52LowProximity: 42.8,
    priceVsSMA50Signal: 'Above',
    priceVsSMA200Signal: 'Above',
    isActive: true,
    isWatched: false,
    lastUpdated: Date.now(),
    ...overrides,
  };
}

export function createMockStocks(count: number, overrides: Partial<Stock> = {}): Stock[] {
  return Array.from({ length: count }, (_, i) =>
    createMockStock({
      id: `stock-${i}`,
      symbol: `T${String(i).padStart(3, '0')}`,
      companyName: `Test Company ${i + 1} Ltd`,
      lastPrice: 100 + i * 10,
      changePercent: (i % 3 === 0 ? -1 : 1) * (i % 5),
      rsi14: 20 + (i % 60),
      marketCap: 1000 * (i + 1),
      sector: (['IT', 'Banking', 'Pharma', 'Auto', 'FMCG'] as const)[i % 5],
      ...overrides,
    }),
  );
}

export function createMockFilterGroup(
  overrides: Partial<FilterGroup> = {},
): FilterGroup {
  return {
    id: 'test-group',
    logic: 'AND',
    rules: [],
    ...overrides,
  };
}

/** Wraps renderWithProviders for tests that need React Query + Zustand */
export { render } from '@testing-library/react';

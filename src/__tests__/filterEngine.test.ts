import { describe, it, expect, beforeAll } from 'vitest';
import { generateMockStocks, getStockUniverse } from '@/lib/mockDataGenerator';
import { applyFilters } from '@/lib/filterEngine';
import { measure } from '@/lib/perf';
import { createMockStocks, createMockFilterGroup } from '@/test-utils/mockData';
import type { FilterGroup } from '@/types';

// ── Generator tests ───────────────────────────────────────────────────────────
describe('Mock Data Generator', () => {
  it('generates requested count of stocks', () => {
    expect(generateMockStocks(500)).toHaveLength(500);
  });

  it('getStockUniverse returns 5000 stocks', () => {
    expect(getStockUniverse()).toHaveLength(5000);
  });

  it('getStockUniverse is cached (same reference)', () => {
    expect(getStockUniverse()).toBe(getStockUniverse());
  });

  it('all symbols are unique', () => {
    const stocks = generateMockStocks(1000);
    const syms = stocks.map((s) => s.symbol);
    expect(new Set(syms).size).toBe(syms.length);
  });

  it('all stocks have required spec fields', () => {
    const stocks = generateMockStocks(50);
    for (const s of stocks) {
      expect(s.symbol).toBeTruthy();
      expect(s.companyName).toBeTruthy();
      expect(s.sector).toBeTruthy();
      expect(s.marketCapCategory).toMatch(/Large Cap|Mid Cap|Small Cap|Micro Cap/);
      expect(s.lastPrice).toBeGreaterThan(0);
      expect(s.marketCap).toBeGreaterThan(0);
      expect(s.promoterHolding).toBeGreaterThanOrEqual(0);
      expect(s.promoterHolding).toBeLessThanOrEqual(75);
    }
  });

  it('RSI values within 0–100', () => {
    for (const s of generateMockStocks(200)) {
      expect(s.rsi14).toBeGreaterThanOrEqual(0);
      expect(s.rsi14).toBeLessThanOrEqual(100);
    }
  });

  it('bollingerPosition uses correct enum values', () => {
    const valid = new Set(['Above', 'Within', 'Below']);
    for (const s of generateMockStocks(200)) {
      expect(valid.has(s.bollingerPosition)).toBe(true);
    }
  });

  it('macdSignal uses correct enum values', () => {
    const valid = new Set(['Bullish', 'Bearish', 'Neutral']);
    for (const s of generateMockStocks(200)) {
      expect(valid.has(s.macdSignal)).toBe(true);
    }
  });

  it('volumeVsAvg uses correct enum values', () => {
    const valid = new Set(['3x', '2x', 'Above', 'Below']);
    for (const s of generateMockStocks(200)) {
      expect(valid.has(s.volumeVsAvg)).toBe(true);
    }
  });

  it('large caps have lower average beta than micro caps', () => {
    const stocks = generateMockStocks(2000);
    const largeCaps = stocks.filter((s) => s.marketCapCategory === 'Large Cap');
    const microCaps = stocks.filter((s) => s.marketCapCategory === 'Micro Cap');
    if (largeCaps.length === 0 || microCaps.length === 0) return;
    const avgLarge = largeCaps.reduce((a, s) => a + s.beta, 0) / largeCaps.length;
    const avgMicro = microCaps.reduce((a, s) => a + s.beta, 0) / microCaps.length;
    expect(avgLarge).toBeLessThan(avgMicro);
  });
});

// ── Filter engine — correctness ───────────────────────────────────────────────
describe('Filter Engine — Correctness', () => {
  const stocks = createMockStocks(500);

  it('empty group returns all stocks', () => {
    const group = createMockFilterGroup();
    expect(applyFilters(stocks, group).filteredCount).toBe(500);
  });

  it('null group returns all stocks', () => {
    expect(applyFilters(stocks, null).filteredCount).toBe(500);
  });

  it('rsi14 > 50 filter is correct', () => {
    const group: FilterGroup = {
      id: 'rsi', logic: 'AND',
      rules: [{ type: 'numeric', field: 'rsi14', operator: 'gt', value: 50 }],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.rsi14 > 50)).toBe(true);
  });

  it('pe between 10 and 30', () => {
    const group: FilterGroup = {
      id: 'pe', logic: 'AND',
      rules: [{ type: 'numeric', field: 'pe', operator: 'between', value: 10, value2: 30 }],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.pe !== null && s.pe >= 10 && s.pe <= 30)).toBe(true);
  });

  it('sector select filter', () => {
    const group: FilterGroup = {
      id: 'sector', logic: 'AND',
      rules: [{ type: 'select', field: 'sector', values: ['IT'] }],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.sector === 'IT')).toBe(true);
  });

  it('marketCapCategory select filter', () => {
    const group: FilterGroup = {
      id: 'cap', logic: 'AND',
      rules: [{ type: 'select', field: 'marketCapCategory', values: ['Large Cap'] }],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.marketCapCategory === 'Large Cap')).toBe(true);
  });

  it('macdSignal enum filter', () => {
    const group: FilterGroup = {
      id: 'macd', logic: 'AND',
      rules: [{ type: 'select', field: 'macdSignal', values: ['Bullish'] }],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.macdSignal === 'Bullish')).toBe(true);
  });

  it('AND logic intersects correctly', () => {
    const group: FilterGroup = {
      id: 'and', logic: 'AND',
      rules: [
        { type: 'numeric', field: 'roe', operator: 'gt', value: 15 },
        { type: 'numeric', field: 'pe', operator: 'lt', value: 30 },
      ],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.roe > 15 && (s.pe === null || s.pe < 30))).toBe(true);
  });

  it('OR logic unions correctly', () => {
    const group: FilterGroup = {
      id: 'or', logic: 'OR',
      rules: [
        { type: 'numeric', field: 'rsi14', operator: 'lt', value: 25 },
        { type: 'numeric', field: 'rsi14', operator: 'gt', value: 75 },
      ],
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.rsi14 < 25 || s.rsi14 > 75)).toBe(true);
  });

  it('text search matches symbol and company', () => {
    const s = stocks[0];
    const { data } = applyFilters(stocks, null, s.symbol.slice(0, 2));
    expect(data.some((r) => r.symbol === s.symbol)).toBe(true);
  });
});

// ── Filter engine — performance ───────────────────────────────────────────────
describe('Filter Engine — Performance Benchmarks', () => {
  let universe: ReturnType<typeof getStockUniverse>;

  beforeAll(() => {
    universe = getStockUniverse();
  });

  it('filters 5,000 rows in < 200ms (spec requirement)', () => {
    const group: FilterGroup = {
      id: 'perf', logic: 'AND',
      rules: [
        { type: 'numeric', field: 'rsi14', operator: 'gt', value: 30 },
        { type: 'numeric', field: 'pe', operator: 'between', value: 10, value2: 50 },
        { type: 'numeric', field: 'roe', operator: 'gt', value: 10 },
        { type: 'select', field: 'macdSignal', values: ['Bullish'] },
      ],
    };
    const { benchmark } = measure('filter', () => applyFilters(universe, group), 5000);
    expect(benchmark.durationMs).toBeLessThan(200);
  });

  it('10 sequential filter passes in < 500ms', () => {
    const group: FilterGroup = {
      id: 'seq', logic: 'AND',
      rules: [{ type: 'numeric', field: 'marketCap', operator: 'gt', value: 5000 }],
    };
    const start = performance.now();
    for (let i = 0; i < 10; i++) applyFilters(universe, group);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('complex 6-rule filter completes < 200ms', () => {
    const group: FilterGroup = {
      id: 'complex', logic: 'AND',
      rules: [
        { type: 'numeric', field: 'rsi14', operator: 'between', value: 30, value2: 70 },
        { type: 'numeric', field: 'pe', operator: 'lt', value: 40 },
        { type: 'numeric', field: 'roe', operator: 'gt', value: 12 },
        { type: 'numeric', field: 'promoterHolding', operator: 'gt', value: 40 },
        { type: 'select', field: 'bollingerPosition', values: ['Within', 'Below'] },
        { type: 'select', field: 'marketCapCategory', values: ['Large Cap', 'Mid Cap'] },
      ],
    };
    const { benchmark } = measure('filter', () => applyFilters(universe, group), 5000);
    expect(benchmark.durationMs).toBeLessThan(200);
  });
});

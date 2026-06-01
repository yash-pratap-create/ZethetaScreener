import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { generateOHLCV } from '@/lib/ohlcvGenerator';
import { getStockUniverse } from '@/lib/mockDataGenerator';
import { GET as getStocks } from '@/app/api/stocks/route';
import { GET as getStockDetail } from '@/app/api/stocks/[symbol]/route';
import { GET as getStockHistory } from '@/app/api/stocks/[symbol]/history/route';
import { GET as getStockFundamentals } from '@/app/api/stocks/[symbol]/fundamentals/route';
import { GET as getPresets, POST as savePreset } from '@/app/api/filters/presets/route';
import { GET as getSectors } from '@/app/api/sectors/route';
import { GET as getIndices } from '@/app/api/indices/route';

describe('OHLCV Data Generator', () => {
  it('generates correct number of trading days, skipping weekends', () => {
    const startPrice = 1500;
    const days = 100;
    const candles = generateOHLCV(startPrice, days);

    // Some days will be skipped as weekends, so count will be less than requested days
    expect(candles.length).toBeLessThanOrEqual(days);
    expect(candles.length).toBeGreaterThan(0);

    // Verify properties
    candles.forEach((c) => {
      expect(c.time).toBeTypeOf('number');
      expect(c.open).toBeTypeOf('number');
      expect(c.high).toBeTypeOf('number');
      expect(c.low).toBeTypeOf('number');
      expect(c.close).toBeTypeOf('number');
      expect(c.volume).toBeTypeOf('number');
      expect(c.high).toBeGreaterThanOrEqual(Math.min(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.max(c.open, c.close));

      // Ensure timestamp doesn't land on weekends
      const date = new Date(c.time * 1000);
      expect(date.getDay()).not.toBe(0); // not Sunday
      expect(date.getDay()).not.toBe(6); // not Saturday
    });
  });
});

describe('REST API Endpoints', () => {
  const createMockRequest = (url: string, method = 'GET', body?: any) => {
    return new NextRequest(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  const getValidSymbol = () => {
    return getStockUniverse()[0].symbol;
  };

  it('GET /api/stocks returns paginated envelope', async () => {
    const req = createMockRequest('http://localhost:3000/api/stocks?page=2&pageSize=10');
    const res = await getStocks(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(10);
    expect(json.meta).toBeDefined();
    expect(json.meta.total).toBeGreaterThanOrEqual(5000);
    expect(json.meta.page).toBe(2);
    expect(json.meta.pageSize).toBe(10);
    expect(json.meta.timestamp).toBeTypeOf('string');
    expect(json.meta.executionTimeMs).toBeTypeOf('number');
  });

  it('GET /api/stocks/:symbol returns single stock with extended fields', async () => {
    const symbol = getValidSymbol();
    const req = createMockRequest(`http://localhost:3000/api/stocks/${symbol}`);
    // Simulate params Promise for Next.js App Router API parameters
    const res = await getStockDetail(req, { params: Promise.resolve({ symbol }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.symbol).toBe(symbol);
    expect(json.data.companyName).toBeDefined();
    expect(json.data.ceo).toBe('Mr. Rajesh Kumar');
    expect(json.data.headquarters).toContain('Mumbai');
    expect(json.data.foundedYear).toBeGreaterThan(1989);
    expect(json.data.about).toBeTypeOf('string');
  });

  it('GET /api/stocks/:symbol returns standard error envelope for invalid symbol', async () => {
    const req = createMockRequest('http://localhost:3000/api/stocks/invalid_sym');
    const res = await getStockDetail(req, { params: Promise.resolve({ symbol: 'invalid_sym' }) });
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.data).toBeNull();
    expect(json.error.code).toBe('STOCK_NOT_FOUND');
    expect(json.error.message).toContain('invalid_sym');
  });

  it('GET /api/stocks/:symbol/history returns historical OHLCV candles', async () => {
    const symbol = getValidSymbol();
    const req = createMockRequest(`http://localhost:3000/api/stocks/${symbol}/history?days=300`);
    const res = await getStockHistory(req, { params: Promise.resolve({ symbol }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.meta.total).toBe(json.data.length);
  });

  it('GET /api/stocks/:symbol/history returns error for invalid symbol', async () => {
    const req = createMockRequest('http://localhost:3000/api/stocks/invalid_sym/history');
    const res = await getStockHistory(req, { params: Promise.resolve({ symbol: 'invalid_sym' }) });
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('STOCK_NOT_FOUND');
  });

  it('GET /api/stocks/:symbol/fundamentals returns detailed dynamic statements', async () => {
    const symbol = getValidSymbol();
    const req = createMockRequest(`http://localhost:3000/api/stocks/${symbol}/fundamentals`);
    const res = await getStockFundamentals(req, { params: Promise.resolve({ symbol }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.ratios).toBeDefined();
    expect(Array.isArray(json.data.financials)).toBe(true);
    expect(json.data.financials.length).toBe(3); // FY24, FY25, FY26
    expect(json.data.financials[0].year).toBe('FY24');
    expect(json.data.financials[0].balanceSheet.cashAndEquivalents).toBeTypeOf('number');
  });

  it('GET /api/stocks/:symbol/fundamentals returns error for invalid symbol', async () => {
    const req = createMockRequest('http://localhost:3000/api/stocks/invalid_sym/fundamentals');
    const res = await getStockFundamentals(req, { params: Promise.resolve({ symbol: 'invalid_sym' }) });
    expect(res.status).toBe(404);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('STOCK_NOT_FOUND');
  });

  it('GET and POST /api/filters/presets manages saved custom presets in-memory', async () => {
    // 1. Fetch initial presets
    const getReq = createMockRequest('http://localhost:3000/api/filters/presets');
    const getRes1 = await getPresets(getReq);
    expect(getRes1.status).toBe(200);
    const getJson1 = await getRes1.json();
    const initialCount = getJson1.data.length;

    // 2. Save a custom preset
    const customPreset = {
      name: 'Super High ROE & Large Cap',
      description: 'ROE > 30% and large market capitalisation',
      filters: {
        id: 'custom_filter_1',
        logic: 'AND',
        rules: [
          { type: 'numeric', field: 'roe', operator: 'gt', value: 30 },
          { type: 'select', field: 'marketCapCategory', values: ['Large Cap'] },
        ],
      },
    };
    const postReq = createMockRequest('http://localhost:3000/api/filters/presets', 'POST', customPreset);
    const postRes = await savePreset(postReq);
    expect(postRes.status).toBe(201);
    const postJson = await postRes.json();
    expect(postJson.success).toBe(true);
    expect(postJson.data.name).toBe(customPreset.name);
    expect(postJson.data.id).toBeDefined();

    // 3. Fetch again and verify custom preset is now included
    const getRes2 = await getPresets(getReq);
    const getJson2 = await getRes2.json();
    expect(getJson2.data.length).toBe(initialCount + 1);
    expect(getJson2.data.some((p: any) => p.name === customPreset.name)).toBe(true);
  });

  it('POST /api/filters/presets returns error when name is missing', async () => {
    const badPreset = {
      description: 'Missing name completely',
      filters: { id: 'bad', logic: 'AND', rules: [] },
    };
    const postReq = createMockRequest('http://localhost:3000/api/filters/presets', 'POST', badPreset);
    const postRes = await savePreset(postReq);
    expect(postRes.status).toBe(400);

    const json = await postRes.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('BAD_REQUEST');
  });

  it('GET /api/sectors compiles unique taxonomy correctly', async () => {
    const req = createMockRequest('http://localhost:3000/api/sectors');
    const res = await getSectors(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0].sector).toBeTypeOf('string');
    expect(Array.isArray(json.data[0].industries)).toBe(true);
    expect(json.data[0].industries.length).toBeGreaterThan(0);
  });

  it('GET /api/indices tracks composition constituents correctly', async () => {
    const req = createMockRequest('http://localhost:3000/api/indices');
    const res = await getIndices(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBe(6); // Six indices as defined

    const sensex = json.data.find((idx: any) => idx.id === 'SENSEX');
    expect(sensex).toBeDefined();
    expect(sensex.constituentsCount).toBeGreaterThan(0);
    expect(Array.isArray(sensex.constituents)).toBe(true);
    expect(sensex.constituents[0]).toBeTypeOf('string');
  });
});

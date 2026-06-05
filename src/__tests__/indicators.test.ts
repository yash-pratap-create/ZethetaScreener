/**
 * A7.2 — Technical Indicator Unit Tests
 * Tests all 5 mandatory indicators + MACD (bonus)
 * Each calculation implemented from scratch per spec A3.2
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRSI,
  calculateVolumeProfile,
  calculateMACD,
  simulateNextPrice,
  OHLCVBar,
} from '@/lib/indicators';

// ── Helper: generate simple bars from close prices ────────────────────────────
function makeBars(closes: number[], volumes?: number[]): OHLCVBar[] {
  return closes.map((close, i) => ({
    time: 1000 + i * 86400,
    open: close * 0.99,
    high: close * 1.01,
    low: close * 0.98,
    close,
    volume: volumes?.[i] ?? 100000,
  }));
}

// ── 1. SMA ────────────────────────────────────────────────────────────────────
describe('Simple Moving Average (SMA)', () => {
  it('calculates SMA correctly for a basic dataset', () => {
    const bars = makeBars([10, 12, 14, 16, 18, 20, 22, 24, 26, 28]);
    const sma5 = calculateSMA(bars, 5);
    // First SMA at index 4: (10+12+14+16+18)/5 = 14
    expect(sma5[0].value).toBeCloseTo(14, 5);
    // Last SMA at index 9: (20+22+24+26+28)/5 = 24
    expect(sma5[5].value).toBeCloseTo(24, 5);
  });

  it('returns empty for insufficient data', () => {
    const bars = makeBars([10, 12, 14]);
    const sma5 = calculateSMA(bars, 5);
    expect(sma5).toHaveLength(0);
  });

  it('handles single-element period', () => {
    const bars = makeBars([42, 43, 44]);
    const sma1 = calculateSMA(bars, 1);
    expect(sma1).toHaveLength(3);
    expect(sma1[0].value).toBe(42);
    expect(sma1[2].value).toBe(44);
  });

  it('SMA length = bars.length - period + 1', () => {
    const bars = makeBars(Array.from({ length: 50 }, (_, i) => 100 + i));
    expect(calculateSMA(bars, 20)).toHaveLength(31);
    expect(calculateSMA(bars, 50)).toHaveLength(1);
  });

  it('SMA of constant prices equals the constant', () => {
    const bars = makeBars(Array(20).fill(100));
    const sma = calculateSMA(bars, 10);
    for (const p of sma) expect(p.value).toBeCloseTo(100, 10);
  });

  it('preserves time values from source bars', () => {
    const bars = makeBars([10, 20, 30, 40, 50]);
    const sma = calculateSMA(bars, 3);
    expect(sma[0].time).toBe(bars[2].time);
    expect(sma[2].time).toBe(bars[4].time);
  });
});

// ── 2. EMA ────────────────────────────────────────────────────────────────────
describe('Exponential Moving Average (EMA)', () => {
  it('first EMA value equals SMA seed', () => {
    const bars = makeBars([10, 12, 14, 16, 18]);
    const ema3 = calculateEMA(bars, 3);
    // Seed = SMA(3) of first 3 = (10+12+14)/3 = 12
    expect(ema3[0].value).toBeCloseTo(12, 5);
  });

  it('returns empty for insufficient data', () => {
    const bars = makeBars([10, 12]);
    expect(calculateEMA(bars, 5)).toHaveLength(0);
  });

  it('EMA length = bars.length - period + 1', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 50 + i));
    expect(calculateEMA(bars, 12)).toHaveLength(19);
  });

  it('EMA converges to constant for flat input', () => {
    const bars = makeBars(Array(50).fill(100));
    const ema = calculateEMA(bars, 10);
    for (const p of ema) expect(p.value).toBeCloseTo(100, 5);
  });

  it('EMA reacts faster than SMA to price changes', () => {
    const prices = [...Array(20).fill(100), 200]; // sudden jump
    const bars = makeBars(prices);
    const sma = calculateSMA(bars, 10);
    const ema = calculateEMA(bars, 10);
    const lastSMA = sma[sma.length - 1].value;
    const lastEMA = ema[ema.length - 1].value;
    // EMA should be closer to 200 than SMA after the jump
    expect(lastEMA).toBeGreaterThan(lastSMA);
  });

  it('EMA with period=1 equals the close price', () => {
    const bars = makeBars([10, 20, 30]);
    const ema1 = calculateEMA(bars, 1);
    expect(ema1[0].value).toBeCloseTo(10);
    expect(ema1[2].value).toBeCloseTo(30);
  });
});

// ── 3. Bollinger Bands ────────────────────────────────────────────────────────
describe('Bollinger Bands', () => {
  it('middle band equals SMA', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 100 + Math.sin(i) * 5));
    const bb = calculateBollingerBands(bars, 20, 2);
    const sma = calculateSMA(bars, 20);
    for (let i = 0; i < bb.length; i++) {
      expect(bb[i].middle).toBeCloseTo(sma[i].value, 5);
    }
  });

  it('upper > middle > lower always', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 50 + i * 0.5 + Math.random()));
    const bb = calculateBollingerBands(bars, 20, 2);
    for (const p of bb) {
      expect(p.upper).toBeGreaterThan(p.middle);
      expect(p.middle).toBeGreaterThan(p.lower);
    }
  });

  it('bands are symmetric around middle', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 100 + i));
    const bb = calculateBollingerBands(bars, 20, 2);
    for (const p of bb) {
      const upperDist = p.upper - p.middle;
      const lowerDist = p.middle - p.lower;
      expect(upperDist).toBeCloseTo(lowerDist, 10);
    }
  });

  it('constant prices produce zero bandwidth', () => {
    const bars = makeBars(Array(30).fill(100));
    const bb = calculateBollingerBands(bars, 20, 2);
    for (const p of bb) {
      expect(p.upper).toBeCloseTo(100, 5);
      expect(p.lower).toBeCloseTo(100, 5);
    }
  });

  it('returns correct count', () => {
    const bars = makeBars(Array(50).fill(100));
    expect(calculateBollingerBands(bars, 20)).toHaveLength(31);
  });

  it('custom multiplier affects band width', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 100 + i));
    const bb2 = calculateBollingerBands(bars, 20, 2);
    const bb3 = calculateBollingerBands(bars, 20, 3);
    const width2 = bb2[0].upper - bb2[0].lower;
    const width3 = bb3[0].upper - bb3[0].lower;
    expect(width3).toBeGreaterThan(width2);
  });
});

// ── 4. RSI ────────────────────────────────────────────────────────────────────
describe('RSI (Relative Strength Index)', () => {
  it('RSI is between 0 and 100', () => {
    const bars = makeBars(Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.5) * 20));
    const rsi = calculateRSI(bars, 14);
    for (const p of rsi) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    }
  });

  it('RSI → 100 for monotonically increasing prices', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 100 + i));
    const rsi = calculateRSI(bars, 14);
    // Wilder's smoothing: avgLoss decays but never exactly 0 → RSI approaches but doesn't equal 100
    expect(rsi[rsi.length - 1].value).toBeGreaterThan(98);
  });

  it('RSI → 0 for monotonically decreasing prices', () => {
    const bars = makeBars(Array.from({ length: 30 }, (_, i) => 200 - i));
    const rsi = calculateRSI(bars, 14);
    expect(rsi[rsi.length - 1].value).toBeCloseTo(0, 0);
  });

  it('RSI = 50 for alternating equal gains/losses', () => {
    const bars = makeBars(Array.from({ length: 50 }, (_, i) => (i % 2 === 0 ? 100 : 110)));
    const rsi = calculateRSI(bars, 14);
    const last = rsi[rsi.length - 1].value;
    // Should be close to 50 (equal avg gain and avg loss)
    expect(last).toBeGreaterThan(40);
    expect(last).toBeLessThan(60);
  });

  it('returns empty for insufficient data', () => {
    const bars = makeBars([10, 20, 30]);
    expect(calculateRSI(bars, 14)).toHaveLength(0);
  });

  it('RSI length = bars.length - period', () => {
    const bars = makeBars(Array.from({ length: 50 }, (_, i) => 100 + i));
    expect(calculateRSI(bars, 14)).toHaveLength(36);
  });
});

// ── 5. Volume Profile ─────────────────────────────────────────────────────────
describe('Volume Profile', () => {
  it('creates the requested number of buckets', () => {
    const bars = makeBars([100, 110, 120, 130, 140]);
    const vp = calculateVolumeProfile(bars, 10);
    expect(vp).toHaveLength(10);
  });

  it('total volume in profile ≈ total bar volume', () => {
    const volumes = [1000, 2000, 3000, 4000, 5000];
    const bars = makeBars([100, 110, 105, 115, 120], volumes);
    const vp = calculateVolumeProfile(bars, 24);
    const totalProfile = vp.reduce((s, b) => s + b.volume, 0);
    const totalInput = volumes.reduce((a, b) => a + b, 0);
    expect(totalProfile).toBeCloseTo(totalInput, -1); // within 10
  });

  it('buyVolume + sellVolume = volume for each bucket', () => {
    const bars = makeBars([100, 105, 102, 108, 103]);
    const vp = calculateVolumeProfile(bars, 12);
    for (const b of vp) {
      expect(b.buyVolume + b.sellVolume).toBeCloseTo(b.volume, 5);
    }
  });

  it('returns empty for empty input', () => {
    expect(calculateVolumeProfile([], 24)).toHaveLength(0);
  });

  it('price levels are monotonically increasing', () => {
    const bars = makeBars([100, 110, 120, 130, 140]);
    const vp = calculateVolumeProfile(bars, 10);
    for (let i = 1; i < vp.length; i++) {
      expect(vp[i].priceLevel).toBeGreaterThan(vp[i - 1].priceLevel);
    }
  });

  it('all volumes are non-negative', () => {
    const bars = makeBars(Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 10));
    const vp = calculateVolumeProfile(bars, 24);
    for (const b of vp) {
      expect(b.volume).toBeGreaterThanOrEqual(0);
      expect(b.buyVolume).toBeGreaterThanOrEqual(0);
      expect(b.sellVolume).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 6. MACD ───────────────────────────────────────────────────────────────────
describe('MACD', () => {
  it('produces correct structure', () => {
    const bars = makeBars(Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.3) * 10));
    const macd = calculateMACD(bars, 12, 26, 9);
    expect(macd.length).toBeGreaterThan(0);
    for (const p of macd) {
      expect(p).toHaveProperty('macd');
      expect(p).toHaveProperty('signal');
      expect(p).toHaveProperty('histogram');
      expect(p).toHaveProperty('time');
    }
  });

  it('histogram = macd - signal', () => {
    const bars = makeBars(Array.from({ length: 60 }, (_, i) => 100 + i * 0.5));
    const macd = calculateMACD(bars);
    for (const p of macd) {
      expect(p.histogram).toBeCloseTo(p.macd - p.signal, 10);
    }
  });

  it('returns empty for insufficient data', () => {
    const bars = makeBars([10, 20, 30]);
    expect(calculateMACD(bars)).toHaveLength(0);
  });

  it('MACD is positive during uptrend', () => {
    const bars = makeBars(Array.from({ length: 60 }, (_, i) => 100 + i * 2));
    const macd = calculateMACD(bars);
    // In a strong uptrend, MACD line should be positive
    const last = macd[macd.length - 1];
    expect(last.macd).toBeGreaterThan(0);
  });
});

// ── 7. Price simulator ────────────────────────────────────────────────────────
describe('simulateNextPrice', () => {
  it('always returns a positive price', () => {
    for (let i = 0; i < 100; i++) {
      const next = simulateNextPrice(100);
      expect(next).toBeGreaterThan(0);
    }
  });

  it('produces different prices (stochastic)', () => {
    const prices = new Set<number>();
    for (let i = 0; i < 20; i++) prices.add(simulateNextPrice(100));
    expect(prices.size).toBeGreaterThan(1);
  });
});

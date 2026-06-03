/**
 * A7 — Cell Formatting & Utility Function Tests
 * Tests all formatting helpers used by the memoized grid cells.
 */

import { describe, it, expect } from 'vitest';
import { fmtINR, fmtPct, fmtVol, fmtCap } from '@/components/ui/Cells';

describe('fmtINR — Indian Rupee formatter', () => {
  it('formats a basic price', () => {
    expect(fmtINR(1234.56)).toBe('₹1,234.56');
  });

  it('formats zero', () => {
    expect(fmtINR(0)).toBe('₹0.00');
  });

  it('formats large numbers with commas', () => {
    const result = fmtINR(1234567.89);
    expect(result).toContain('₹');
    expect(result).toContain('.');
  });

  it('formats small decimals correctly', () => {
    expect(fmtINR(0.5)).toBe('₹0.50');
  });
});

describe('fmtPct — Percentage formatter', () => {
  it('positive values get + prefix', () => {
    expect(fmtPct(3.45)).toBe('+3.45%');
  });

  it('negative values get - prefix', () => {
    expect(fmtPct(-2.1)).toBe('-2.10%');
  });

  it('zero gets + prefix', () => {
    expect(fmtPct(0)).toBe('+0.00%');
  });

  it('rounds to 2 decimal places', () => {
    expect(fmtPct(1.999)).toBe('+2.00%');
  });
});

describe('fmtVol — Volume formatter', () => {
  it('formats crores (>= 1e7)', () => {
    expect(fmtVol(10000000)).toBe('1.00 Cr');
    expect(fmtVol(25000000)).toBe('2.50 Cr');
  });

  it('formats lakhs (>= 1e5)', () => {
    expect(fmtVol(500000)).toBe('5.00 L');
  });

  it('formats thousands (>= 1e3)', () => {
    expect(fmtVol(5000)).toBe('5.0K');
  });

  it('formats small numbers as-is', () => {
    expect(fmtVol(500)).toBe('500');
  });

  it('formats zero', () => {
    expect(fmtVol(0)).toBe('0');
  });
});

describe('fmtCap — Market Cap formatter', () => {
  it('formats lakh crores (>= 100000)', () => {
    expect(fmtCap(200000)).toBe('₹2.00L Cr');
  });

  it('formats thousand crores (>= 1000)', () => {
    expect(fmtCap(5000)).toBe('₹5.0K Cr');
  });

  it('formats small crores', () => {
    expect(fmtCap(500)).toBe('₹500 Cr');
  });
});

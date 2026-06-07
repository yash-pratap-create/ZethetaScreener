/**
 * A7 — Performance Utility Tests & Coverage Boosters
 * Tests the perf.ts measurement helpers, remaining store/utility functions,
 * and exercises uncovered filter engine paths.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { measure, measureAsync, WSLatencyTracker, FPSMonitor } from '@/lib/perf';
import {
  useRealtimeStore,
  useConnectionStatus,
  useUpdatesPerSecond,
  usePriceUpdate,
  useFlash,
  useAvgLatency,
  useLatestAnnouncement,
} from '@/stores/realtimeStore';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';
import { generateCandlestickData } from '@/lib/mockDataGenerator';
import { compileFilterConfig, applyFilters } from '@/lib/filterEngine';
import { createMockStocks } from '@/test-utils/mockData';
import type { Stock, FilterConfig } from '@/types';
import {
  PriceCell,
  ChangeCell,
  VolumeCell,
  MarketCapCell,
  RSICell,
  BadgeCell,
  SymbolCell,
  CompanyCell,
  SectorBadgeCell,
  CapBadgeCell,
  PeCell,
  PbCell,
  RoeCell,
  RoceCell,
  PromoterCell,
  DividendYieldCell,
  DebtCell,
  GrowthCell,
  BetaCell,
  Week52HighCell,
  Week52LowCell,
  MACD_COLORS,
} from '@/components/ui/Cells';

// ── measure() utility ─────────────────────────────────────────────────────────
describe('measure() performance utility', () => {
  it('returns the function result', () => {
    const { result } = measure('filter', () => 42);
    expect(result).toBe(42);
  });

  it('measures duration in ms', () => {
    const { benchmark } = measure('filter', () => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) sum += i;
      return sum;
    });
    expect(benchmark.durationMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.operation).toBe('filter');
  });

  it('marks as passed when under threshold', () => {
    const { benchmark } = measure('filter', () => 1);
    expect(benchmark.passed).toBe(true);
    expect(benchmark.threshold).toBe(200);
  });

  it('includes rowCount when provided', () => {
    const { benchmark } = measure('filter', () => [], 5000);
    expect(benchmark.rowCount).toBe(5000);
  });

  it('supports sort operation type', () => {
    const { benchmark } = measure('sort', () => []);
    expect(benchmark.threshold).toBe(150);
  });
});

// ── compileFilterConfig ───────────────────────────────────────────────────────
describe('compileFilterConfig', () => {
  const mockStock = {
    symbol: 'TCS',
    sector: 'IT',
    marketCap: 10000,
    rsi14: 45,
  } as Stock;

  it('returns null for disabled config', () => {
    const config: FilterConfig = {
      id: '1', field: 'rsi14', operator: 'gt', value: 30, enabled: false,
    };
    expect(compileFilterConfig(config)).toBeNull();
  });

  it('compiles gt operator', () => {
    const config: FilterConfig = {
      id: '1', field: 'rsi14', operator: 'gt', value: 30, enabled: true,
    };
    const pred = compileFilterConfig(config);
    expect(pred).not.toBeNull();
    expect(pred!(mockStock)).toBe(true);
  });

  it('compiles "in" operator', () => {
    const config: FilterConfig = {
      id: '1', field: 'sector', operator: 'in', value: ['IT', 'Banking'], enabled: true,
    };
    const pred = compileFilterConfig(config);
    expect(pred!(mockStock)).toBe(true);
  });

  it('compiles "notIn" operator', () => {
    const config: FilterConfig = {
      id: '1', field: 'sector', operator: 'notIn', value: ['Banking'], enabled: true,
    };
    const pred = compileFilterConfig(config);
    expect(pred!(mockStock)).toBe(true);
  });

  it('compiles "contains" operator', () => {
    const config: FilterConfig = {
      id: '1', field: 'symbol', operator: 'contains', value: 'CS', enabled: true,
    };
    const pred = compileFilterConfig(config);
    expect(pred!(mockStock)).toBe(true);
  });

  it('compiles "startsWith" operator', () => {
    const config: FilterConfig = {
      id: '1', field: 'symbol', operator: 'startsWith', value: 'TC', enabled: true,
    };
    const pred = compileFilterConfig(config);
    expect(pred!(mockStock)).toBe(true);
  });
});

// ── generateCandlestickData ───────────────────────────────────────────────────
describe('generateCandlestickData', () => {
  it('generates the correct number of bars', () => {
    const { candles, volumes } = generateCandlestickData(100, 50, 1000, 86400);
    expect(candles).toHaveLength(50);
    expect(volumes).toHaveLength(50);
  });

  it('candles have OHLC shape', () => {
    const { candles } = generateCandlestickData(100, 10, 1000, 86400);
    for (const c of candles) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.time).toBeGreaterThan(0);
    }
  });

  it('times are monotonically increasing', () => {
    const { candles } = generateCandlestickData(100, 20, 1000, 3600);
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].time).toBeGreaterThan(candles[i - 1].time);
    }
  });

  it('volumes have colour (green or red)', () => {
    const { volumes } = generateCandlestickData(100, 10, 1000, 86400);
    for (const v of volumes) {
      expect(['#22c55e', '#ef4444']).toContain(v.color);
      expect(v.value).toBeGreaterThan(0);
    }
  });
});

// ── Additional store action coverage ──────────────────────────────────────────
describe('RealtimeStore — additional coverage', () => {
  it('setConnectionStatus cycles through states', () => {
    const states = ['connecting', 'connected', 'disconnected', 'error'] as const;
    for (const s of states) {
      useRealtimeStore.getState().setConnectionStatus(s);
      expect(useRealtimeStore.getState().connectionStatus).toBe(s);
    }
  });

  it('resetReconnect resets counter', () => {
    useRealtimeStore.setState({ reconnectAttempts: 5 });
    useRealtimeStore.getState().resetReconnect();
    expect(useRealtimeStore.getState().reconnectAttempts).toBe(0);
  });

  it('tickHeartbeat updates lastHeartbeat', () => {
    const before = Date.now();
    useRealtimeStore.getState().tickHeartbeat();
    expect(useRealtimeStore.getState().lastHeartbeat).toBeGreaterThanOrEqual(before);
  });
});

describe('UIStore — additional coverage', () => {
  it('selectSymbol updates selectedSymbol', () => {
    useUIStore.getState().selectSymbol('INFY');
    expect(useUIStore.getState().selectedSymbol).toBe('INFY');
  });

  it('setChartTimeframe updates timeframe', () => {
    useUIStore.getState().setChartTimeframe('1W');
    expect(useUIStore.getState().chartTimeframe).toBe('1W');
  });

  it('setColumnOrder updates order', () => {
    useUIStore.getState().setColumnOrder(['symbol', 'lastPrice']);
    expect(useUIStore.getState().columnOrder).toEqual(['symbol', 'lastPrice']);
  });

  it('setPageSize updates page size', () => {
    useUIStore.getState().setPageSize(50);
    expect(useUIStore.getState().pageSize).toBe(50);
  });

  it('toggleHighContrast flips mode', () => {
    const initial = useUIStore.getState().highContrastMode;
    useUIStore.getState().toggleHighContrast();
    expect(useUIStore.getState().highContrastMode).toBe(!initial);
  });

  it('setTheme sets specific theme', () => {
    useUIStore.getState().setTheme('light');
    expect(useUIStore.getState().theme).toBe('light');
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });
});

describe('FilterStore — additional coverage', () => {
  it('clearPreset resets to default', () => {
    useFilterStore.getState().applyPreset('oversold_rsi');
    useFilterStore.getState().clearPreset();
    expect(useFilterStore.getState().activePresetId).toBeNull();
    expect(useFilterStore.getState().activeGroup.rules).toHaveLength(0);
  });

  it('toggleFilterPanel flips visibility', () => {
    const initial = useFilterStore.getState().isFilterPanelOpen;
    useFilterStore.getState().toggleFilterPanel();
    expect(useFilterStore.getState().isFilterPanelOpen).toBe(!initial);
  });
});

// ── measureAsync() ────────────────────────────────────────────────────────────
describe('measureAsync()', () => {
  it('measures async operation duration', async () => {
    const { result, benchmark } = await measureAsync('wsUpdate', async () => {
      return 'done';
    });
    expect(result).toBe('done');
    expect(benchmark.durationMs).toBeGreaterThanOrEqual(0);
    expect(benchmark.operation).toBe('wsUpdate');
    expect(benchmark.threshold).toBe(50);
  });

  it('marks async operation as passed when fast', async () => {
    const { benchmark } = await measureAsync('wsUpdate', async () => 1);
    expect(benchmark.passed).toBe(true);
  });
});

// ── WSLatencyTracker ──────────────────────────────────────────────────────────
describe('WSLatencyTracker', () => {
  it('tracks sent→received latency', () => {
    const tracker = new WSLatencyTracker();
    tracker.markSent('msg-1');
    tracker.markReceived('msg-1');
    const stats = tracker.getStats();
    expect(stats).not.toBeNull();
    expect(stats!.samples).toBe(1);
    expect(stats!.avgMs).toBeGreaterThanOrEqual(0);
  });

  it('returns null for no samples', () => {
    const tracker = new WSLatencyTracker();
    expect(tracker.getStats()).toBeNull();
  });

  it('tracks multiple messages', () => {
    const tracker = new WSLatencyTracker();
    tracker.markSent('a');
    tracker.markSent('b');
    tracker.markReceived('a');
    tracker.markReceived('b');
    const stats = tracker.getStats();
    expect(stats!.samples).toBe(2);
  });

  it('ignores received without sent', () => {
    const tracker = new WSLatencyTracker();
    tracker.markReceived('unknown');
    expect(tracker.getStats()).toBeNull();
  });

  it('computes p95 latency', () => {
    const tracker = new WSLatencyTracker();
    for (let i = 0; i < 20; i++) {
      tracker.markSent(`msg-${i}`);
      tracker.markReceived(`msg-${i}`);
    }
    const stats = tracker.getStats();
    expect(stats!.p95Ms).toBeGreaterThanOrEqual(0);
  });
});

// ── compileFilterConfig — additional operators ────────────────────────────────
describe('compileFilterConfig — additional operators', () => {
  const stock = { rsi14: 50, pe: 20, roe: 15, symbol: 'TCS', sector: 'IT' } as Stock;

  it('compiles eq operator', () => {
    const pred = compileFilterConfig({ id: '1', field: 'rsi14', operator: 'eq', value: 50, enabled: true });
    expect(pred!(stock)).toBe(true);
  });

  it('compiles neq operator', () => {
    const pred = compileFilterConfig({ id: '1', field: 'rsi14', operator: 'neq', value: 30, enabled: true });
    expect(pred!(stock)).toBe(true);
  });

  it('compiles gte operator', () => {
    const pred = compileFilterConfig({ id: '1', field: 'rsi14', operator: 'gte', value: 50, enabled: true });
    expect(pred!(stock)).toBe(true);
  });

  it('compiles lt operator', () => {
    const pred = compileFilterConfig({ id: '1', field: 'pe', operator: 'lt', value: 25, enabled: true });
    expect(pred!(stock)).toBe(true);
  });

  it('compiles lte operator', () => {
    const pred = compileFilterConfig({ id: '1', field: 'pe', operator: 'lte', value: 20, enabled: true });
    expect(pred!(stock)).toBe(true);
  });

  it('compiles between operator', () => {
    const pred = compileFilterConfig({ id: '1', field: 'rsi14', operator: 'between', value: 50, enabled: true });
    expect(pred!(stock)).toBe(true);
  });
});

// ── applyFilters — additional paths ───────────────────────────────────────────
describe('applyFilters — additional paths', () => {
  const stocks = createMockStocks(100);

  it('boolean filter works', () => {
    const group = {
      id: 'b', logic: 'AND' as const, rules: [
        { type: 'boolean' as const, field: 'isActive' as any, value: true },
      ]
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.isActive === true)).toBe(true);
  });

  it('empty select values return all stocks', () => {
    const group = {
      id: 's', logic: 'AND' as const, rules: [
        { type: 'select' as const, field: 'sector' as any, values: [] },
      ]
    };
    const { data } = applyFilters(stocks, group);
    expect(data).toHaveLength(100);
  });

  it('indexMembership array-valued select filter', () => {
    const group = {
      id: 'idx', logic: 'AND' as const, rules: [
        { type: 'select' as const, field: 'indexMembership' as any, values: ['NIFTY500'] },
      ]
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.indexMembership.includes('NIFTY500'))).toBe(true);
  });

  it('multiple OR rules with different types', () => {
    const group = {
      id: 'or', logic: 'OR' as const, rules: [
        { type: 'numeric' as const, field: 'rsi14' as any, operator: 'lt' as const, value: 20 },
        { type: 'select' as const, field: 'macdSignal' as any, values: ['Bullish'] },
      ]
    };
    const { data } = applyFilters(stocks, group);
    expect(data.every((s) => s.rsi14 < 20 || s.macdSignal === 'Bullish')).toBe(true);
  });
});

// ── RealtimeStore — incrementReconnect ────────────────────────────────────────
describe('RealtimeStore — incrementReconnect', () => {
  it('increments reconnect count', () => {
    useRealtimeStore.setState({ reconnectAttempts: 0 });
    useRealtimeStore.getState().incrementReconnect();
    expect(useRealtimeStore.getState().reconnectAttempts).toBe(1);
    useRealtimeStore.getState().incrementReconnect();
    expect(useRealtimeStore.getState().reconnectAttempts).toBe(2);
  });
});

// ── FPSMonitor coverage booster ────────────────────────────────────────────────
describe('FPSMonitor coverage booster', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return setTimeout(() => cb(performance.now()), 16);
    });
    vi.stubGlobal('cancelAnimationFrame', (id: any) => {
      clearTimeout(id);
    });
  });

  it('can start and stop FPSMonitor', async () => {
    const monitor = new FPSMonitor();
    monitor.start();
    await new Promise((r) => setTimeout(r, 40));
    const stats = monitor.stop();
    expect(stats.avgFPS).toBeGreaterThanOrEqual(0);
    expect(stats.dropped).toBeGreaterThanOrEqual(0);
  });

  it('stop returns zeros when not started', () => {
    const monitor = new FPSMonitor();
    const stats = monitor.stop();
    expect(stats).toEqual({ avgFPS: 0, minFPS: 0, dropped: 0 });
  });
});

// ── FilterStore saved filters integration ────────────────────────────────────
describe('FilterStore saved filters integration', () => {
  it('can delete and apply saved filters', () => {
    useFilterStore.getState().addRule({ type: 'numeric', field: 'rsi14', operator: 'gt', value: 70 });
    useFilterStore.getState().saveCurrentFilter('My Save');
    const saved = useFilterStore.getState().savedFilters;
    expect(saved).toHaveLength(1);
    const savedId = saved[0].id;

    useFilterStore.getState().applySavedFilter(savedId);
    expect(useFilterStore.getState().activePresetId).toBe(savedId);

    // Cover early return path
    useFilterStore.getState().applySavedFilter('invalid-id');

    useFilterStore.getState().deleteSavedFilter(savedId);
    expect(useFilterStore.getState().savedFilters).toHaveLength(0);
    expect(useFilterStore.getState().activePresetId).toBeNull();
  });
});

// ── Realtime Hooks / Selectors integration ───────────────────────────────────
function RealtimeHooksTester({ symbol }: { symbol: string }) {
  const status = useConnectionStatus();
  const ups = useUpdatesPerSecond();
  const price = usePriceUpdate(symbol);
  const flash = useFlash(symbol);
  const avgLatency = useAvgLatency();
  const announcement = useLatestAnnouncement();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="ups">{ups}</span>
      <span data-testid="price">{price?.lastPrice ?? 'none'}</span>
      <span data-testid="flash">{flash?.direction ?? 'none'}</span>
      <span data-testid="latency">{avgLatency}</span>
      <span data-testid="announcement">{announcement ?? 'none'}</span>
    </div>
  );
}

import { act } from '@testing-library/react';

describe('Realtime Store Selector Hooks', () => {
  it('responds to store changes correctly', () => {
    act(() => {
      useRealtimeStore.setState({
        connectionStatus: 'connected',
        updatesPerSecond: 15,
        priceUpdates: { TCS: { symbol: 'TCS', lastPrice: 3600 } as any },
        flashMap: { TCS: { direction: 'up', expiresAt: Date.now() + 100 } },
        avgLatency: 12.5,
        latestAnnouncement: 'Nifty up 0.5%',
      });
    });

    render(<RealtimeHooksTester symbol="TCS" />);
    expect(screen.getByTestId('status').textContent).toBe('connected');
    expect(screen.getByTestId('ups').textContent).toBe('15');
    expect(screen.getByTestId('price').textContent).toBe('3600');
    expect(screen.getByTestId('flash').textContent).toBe('up');
    expect(screen.getByTestId('latency').textContent).toBe('12.5');
    expect(screen.getByTestId('announcement').textContent).toBe('Nifty up 0.5%');

    // Test setAnnouncement action
    act(() => {
      useRealtimeStore.getState().setAnnouncement('Custom Announcement');
    });
    expect(useRealtimeStore.getState().latestAnnouncement).toBe('Custom Announcement');
  });
});

// ── React Cell Components (Cells.tsx) ────────────────────────────────────────
describe('React Cell Components', () => {
  it('renders PriceCell', () => {
    render(<PriceCell value={1234.56} />);
    expect(screen.getByText('₹1,234.56')).toBeInTheDocument();
  });

  it('renders ChangeCell', () => {
    const { rerender } = render(<ChangeCell value={3.45} showAbsolute={true} absolute={12} />);
    expect(screen.getByText('+3.45%')).toBeInTheDocument();
    expect(screen.getByText('₹12.00')).toBeInTheDocument();

    rerender(<ChangeCell value={-1.5} showAbsolute={false} />);
    expect(screen.getByText('-1.50%')).toBeInTheDocument();
  });

  it('renders VolumeCell', () => {
    const { rerender } = render(<VolumeCell value={500000} avgVolume={100000} />);
    expect(screen.getByText('5.00 L')).toBeInTheDocument();

    rerender(<VolumeCell value={1000} avgVolume={2000} />);
    expect(screen.getByText('1.0K')).toBeInTheDocument();
  });

  it('renders MarketCapCell', () => {
    render(<MarketCapCell value={250000} />);
    expect(screen.getByText('₹2.50L Cr')).toBeInTheDocument();
  });

  it('renders RSICell', () => {
    const { rerender } = render(<RSICell value={85} />);
    expect(screen.getByText(/85\.0/)).toBeInTheDocument();
    expect(screen.getByText('OB')).toBeInTheDocument();

    rerender(<RSICell value={15} />);
    expect(screen.getByText('OS')).toBeInTheDocument();

    rerender(<RSICell value={50} />);
    expect(screen.queryByText('OB')).not.toBeInTheDocument();
    expect(screen.queryByText('OS')).not.toBeInTheDocument();
  });

  it('renders BadgeCell', () => {
    render(<BadgeCell value="Bullish" colorMap={MACD_COLORS} />);
    expect(screen.getByText('Bullish')).toBeInTheDocument();
  });

  it('renders SymbolCell and clicks it', () => {
    const clickSpy = vi.fn();
    render(<SymbolCell value="INFY" onOpenChart={clickSpy} />);
    const button = screen.getByRole('button', { name: 'Open chart for INFY' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalledWith('INFY');
  });

  it('renders CompanyCell', () => {
    render(<CompanyCell value="Infosys Technologies Ltd" />);
    expect(screen.getByText('Infosys Technologies Ltd')).toBeInTheDocument();
  });

  it('renders SectorBadgeCell', () => {
    render(<SectorBadgeCell value="Information Technology" />);
    expect(screen.getByText('Information Technology')).toBeInTheDocument();
  });

  it('renders CapBadgeCell', () => {
    render(<CapBadgeCell value="Large Cap" />);
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('renders PeCell', () => {
    const { rerender } = render(<PeCell value={25.4} />);
    expect(screen.getByText('25.4')).toBeInTheDocument();

    rerender(<PeCell value={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders PbCell', () => {
    render(<PbCell value={3.5} />);
    expect(screen.getByText('3.50')).toBeInTheDocument();
  });

  it('renders RoeCell', () => {
    render(<RoeCell value={18.2} />);
    expect(screen.getByText('18.2%')).toBeInTheDocument();
  });

  it('renders RoceCell', () => {
    render(<RoceCell value={22.5} />);
    expect(screen.getByText('22.5%')).toBeInTheDocument();
  });

  it('renders PromoterCell', () => {
    render(<PromoterCell value={65.4} />);
    expect(screen.getByText('65.4%')).toBeInTheDocument();
  });

  it('renders DividendYieldCell', () => {
    const { rerender } = render(<DividendYieldCell value={1.5} />);
    expect(screen.getByText('1.50%')).toBeInTheDocument();

    rerender(<DividendYieldCell value={0} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders DebtCell', () => {
    render(<DebtCell value={0.45} />);
    expect(screen.getByText('0.45')).toBeInTheDocument();
  });

  it('renders GrowthCell', () => {
    render(<GrowthCell value={15.6} />);
    expect(screen.getByText('+15.60%')).toBeInTheDocument();
  });

  it('renders BetaCell', () => {
    render(<BetaCell value={1.2} />);
    expect(screen.getByText('1.20')).toBeInTheDocument();
  });

  it('renders Week52HighCell and Week52LowCell', () => {
    const { rerender } = render(<Week52HighCell value={1500} />);
    expect(screen.getByText('₹1,500.00')).toBeInTheDocument();

    rerender(<Week52LowCell value={900} />);
    expect(screen.getByText('₹900.00')).toBeInTheDocument();
  });
});
